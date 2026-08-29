/**
 * Peptide-MHC class I binding predictor — runs in the browser.
 *
 * This is a REAL trained model, not a heuristic: a gradient-boosted tree
 * ensemble (XGBoost, 800 trees) trained on MHCflurry-curated binding
 * measurements, evaluated once on a peptide-GROUPED held-out split so no
 * peptide appears in both training and test.
 *
 *   held-out ROC-AUC 0.9185   PR-AUC 0.8056   n = 120,000   129 alleles
 *
 * Features are one-hot encodings of the peptide and of the allele's
 * pseudo-sequence. Because one-hot encoding is exact integer work, the browser
 * reproduces the training features bit-for-bit — there is no floating-point
 * featurization for the two runtimes to disagree about, so predictions here are
 * identical to the Python model's, not approximations of them.
 *
 * See models/README.md in this repo for provenance and how to retrain.
 */

export interface AlleleTable {
  alphabet: string;
  peptideLength: number;
  alleleLength: number;
  nFeatures: number;
  pseudoSequences: Record<string, string>;
}

interface CompactTree {
  l: number[]; // left child index, -1 for a leaf
  r: number[]; // right child index
  f: number[]; // split feature index
  c: number[]; // split threshold (internal) / leaf value (leaf)
  d: number[]; // 1 = missing values go left
}

export interface CompactModel {
  objective: string;
  baseMargin: number;
  nFeatures: number;
  nTrees: number;
  trees: CompactTree[];
}

export interface BindingPrediction {
  /**
   * Model score in [0,1] for IC50 < 500 nM. NOT verified as calibrated: no
   * Platt/isotonic scaling was applied and no reliability curve, Brier score or
   * ECE has been computed. A logistic output lying in [0,1] does not make it a
   * calibrated probability. Treat it as a ranking score until that is measured.
   */
  probability: number;
  /** Binding-strength label derived from `probability`. */
  rank: "Strong" | "Moderate" | "Weak";
  /** Raw log-odds, before the logistic link. */
  margin: number;
  /** False when the allele had no pseudo-sequence and a zero vector was used. */
  alleleKnown: boolean;
}

/**
 * One-hot encode `seq` into `length` positions of `alphabet.length` slots.
 * Residues outside the alphabet (e.g. 'X') and positions past the end of the
 * sequence are left as all-zero, exactly as in training.
 */
function oneHotInto(
  out: Float32Array,
  offset: number,
  seq: string,
  length: number,
  index: Record<string, number>,
  alphabetSize: number,
): void {
  const n = Math.min(seq.length, length);
  for (let i = 0; i < n; i++) {
    const j = index[seq[i]];
    if (j !== undefined) out[offset + i * alphabetSize + j] = 1;
  }
}

export class PeptideMHCPredictor {
  private readonly index: Record<string, number> = {};
  private readonly alphabetSize: number;
  private readonly model: CompactModel;
  private readonly alleles: AlleleTable;

  constructor(model: CompactModel, alleles: AlleleTable) {
    this.model = model;
    this.alleles = alleles;
    this.alphabetSize = alleles.alphabet.length;
    for (let i = 0; i < alleles.alphabet.length; i++) {
      this.index[alleles.alphabet[i]] = i;
    }
    if (model.nFeatures !== alleles.nFeatures) {
      throw new Error(
        `Model/encoding mismatch: model expects ${model.nFeatures} features, ` +
          `encoding produces ${alleles.nFeatures}`,
      );
    }
  }

  /** Alleles the encoding has a pseudo-sequence for, sorted. */
  alleleNames(): string[] {
    return Object.keys(this.alleles.pseudoSequences).sort();
  }

  hasAllele(allele: string): boolean {
    return allele in this.alleles.pseudoSequences;
  }

  /** Builds the exact feature vector used in training. */
  encode(peptide: string, allele: string): { x: Float32Array; alleleKnown: boolean } {
    const { peptideLength, alleleLength } = this.alleles;
    const x = new Float32Array(this.alleles.nFeatures);
    oneHotInto(x, 0, peptide.toUpperCase(), peptideLength, this.index, this.alphabetSize);

    const pseudo = this.alleles.pseudoSequences[allele];
    if (pseudo !== undefined) {
      oneHotInto(
        x,
        peptideLength * this.alphabetSize,
        pseudo,
        alleleLength,
        this.index,
        this.alphabetSize,
      );
    }
    return { x, alleleKnown: pseudo !== undefined };
  }

  private margin(x: Float32Array): number {
    let sum = this.model.baseMargin;
    for (const t of this.model.trees) {
      let n = 0;
      while (t.l[n] !== -1) {
        const v = x[t.f[n]];
        // Features are one-hot, so they are never NaN; the missing-value branch
        // is kept so the traversal matches XGBoost's semantics exactly.
        n = Number.isNaN(v)
          ? t.d[n]
            ? t.l[n]
            : t.r[n]
          : v < t.c[n]
            ? t.l[n]
            : t.r[n];
      }
      // XGBoost accumulates leaf values in float32; rounding each partial sum
      // to float32 reproduces its arithmetic exactly rather than approximately.
      sum = Math.fround(sum + t.c[n]);
    }
    return sum;
  }

  predict(peptide: string, allele: string): BindingPrediction {
    const { x, alleleKnown } = this.encode(peptide, allele);
    const margin = this.margin(x);
    const probability = 1 / (1 + Math.exp(-margin));
    return {
      probability,
      rank: probability > 0.8 ? "Strong" : probability > 0.5 ? "Moderate" : "Weak",
      margin,
      alleleKnown,
    };
  }
}

/**
 * Metrics from the held-out evaluation runs. Never edit these by hand — each
 * field traces to a JSON artifact in `ml-training/peptide-mhc/`:
 *   rocAuc/prAuc            -> pmhc_metrics.json (train_baseline.py)
 *   loao                    -> pmhc_metrics_loao_distance.json (loao_distance_study.py)
 *   calibration             -> pmhc_metrics_calibration.json (calibration_study.py)
 *   splitLadder             -> pmhc_metrics_split_ladder.json (split_ladder_study.py)
 */
export const PMHC_MODEL_CARD = {
  task: "Peptide-MHC class I binding (IC50 < 500 nM)",
  algorithm: "XGBoost gradient-boosted trees (800 estimators)",
  encoding: "one-hot peptide (11 positions) + one-hot allele pseudo-sequence (39 positions)",
  trainingExamples: 120000,
  alleles: 129,
  split: "peptide-grouped 80/20 — no peptide appears in both train and test",
  dataSource: "MHCflurry-curated public binding measurements",
  rocAuc: 0.9185,
  prAuc: 0.8056,
  testRows: 23866,
  testPositiveRate: 0.2782,
  note:
    "Runs entirely in your browser. Predictions are bit-identical to the Python " +
    "model because the one-hot encoding is exact integer arithmetic.",

  /**
   * IMPORTANT PROVENANCE NOTE: rocAuc/prAuc above describe the EXACT model
   * bytes shipped in client/public/models/pmhc_model.json (matches this
   * training run's own metrics to 4 decimal places). The loao/calibration/
   * splitLadder numbers below come from a LATER re-run of the same
   * train_baseline.py pipeline (identical code, hyperparameters, seed=42)
   * whose own peptide-grouped ROC-AUC came out 0.9188/0.8085 instead of
   * 0.9185/0.8056 -- a ~0.0003 gap traced to xgboost/sklearn/numpy library
   * version drift between the two training environments, not a different
   * model or data (see ml-training/peptide-mhc/pmhc_metrics_calibration.json
   * library_versions, and the MLflow run log which records this explicitly).
   * Treat the studies below as describing "this model's pipeline" rather
   * than "these exact deployed weights" -- the gap is small enough, and
   * disclosed clearly enough, to still be the most honest generalization/
   * calibration evidence available, rather than none at all.
   */
  reproducibilityNote:
    "loao/calibration/splitLadder were measured on a re-run of the same " +
    "pipeline, not the exact deployed model bytes -- its own peptide-grouped " +
    "ROC-AUC came out 0.9188 vs the deployed model's 0.9185, a ~0.0003 gap " +
    "from library-version drift (xgboost/sklearn/numpy), not a different model.",

  /**
   * Leave-one-allele-out: 14 of 129 trained alleles, spanning HLA-A/B/C and a
   * range of prevalence (not exhaustive — compute budget), each held out of
   * training ENTIRELY and scored as if the model had never seen it. This is
   * the honest generalization number; rocAuc/prAuc above describe alleles the
   * model was trained on.
   */
  loao: {
    nAlleles: 14,
    macroRocAuc: 0.8419,
    nWeightedRocAuc: 0.8671,
    macroPrAuc: 0.6432,
    nWeightedPrAuc: 0.7436,
    byLocus: {
      A: { nAlleles: 6, macroRocAuc: 0.874, nWeightedRocAuc: 0.8766 },
      B: { nAlleles: 5, macroRocAuc: 0.859, nWeightedRocAuc: 0.8474 },
      C: { nAlleles: 3, macroRocAuc: 0.7493, nWeightedRocAuc: 0.7507 },
    },
    distanceCorrelation: { pearsonR: -0.6771, spearmanR: -0.5645 },
    note:
      "An unseen allele scores meaningfully lower than a trained one (macro " +
      "ROC-AUC 0.842 vs 0.919 trained), and HLA-C — the least-represented locus " +
      "in training — generalizes worst (macro ROC-AUC 0.749, one allele's PR-AUC " +
      "as low as 0.181 on 27 positives out of 526). Distance to the nearest " +
      "trained allele's pseudo-sequence correlates with the drop (Pearson r = " +
      "-0.677): a genuinely novel allele should be trusted less than these " +
      "averages, not more.",
  },

  /**
   * Brier / ECE on the production model's RAW sigmoid output — the app does
   * NOT apply Platt or isotonic calibration; this is offline analysis only.
   */
  calibration: {
    testSetSize: 23866,
    raw: { brier: 0.1119, ece10bin: 0.0925 },
    platt: { brier: 0.0993, ece10bin: 0.0084, rocAucLoss: 0.0 },
    isotonic: { brier: 0.0994, ece10bin: 0.0104 },
    verdict: "moderately miscalibrated, systematically under-confident",
    note:
      "The probability this app displays is the model's RAW, uncalibrated " +
      "output — no Platt or isotonic scaling has been applied in production. " +
      "A raw score of 0.65 does not mean 65% of such peptides bind; the " +
      "reliability diagram shows the model under-confident through most of " +
      "the range. Post-hoc Platt scaling on a held-out validation split cuts " +
      "ECE from 0.093 to 0.008 with no loss in ROC-AUC, but that correction " +
      "is not wired into what you see here.",
  },

  /**
   * Same re-run pipeline, four split difficulties — shows how much of the
   * headline number is split choice rather than model quality. The
   * "peptide-grouped" rung is this STUDY's own reproduction of the
   * production split (0.9188), not the deployed model's own 0.9185 — see
   * `reproducibilityNote` above for the ~0.0003 library-version gap between
   * the two.
   */
  splitLadder: {
    randomSplit: { rocAuc: 0.927, prAuc: 0.8367, label: "random (leaks across split)" },
    peptideGrouped: { rocAuc: 0.9188, prAuc: 0.8085, label: "peptide-grouped (same split as production)" },
    sequenceCluster: { rocAuc: 0.9144, prAuc: 0.8074, label: "sequence-cluster (approx.)" },
    alleleHeldOut: { rocAuc: 0.8419, prAuc: 0.6432, label: "allele-held-out (LOAO)" },
  },
} as const;
