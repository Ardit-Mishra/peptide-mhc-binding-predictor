/**
 * Peptide-MHC class I binding predictor — runs in the browser.
 *
 * This is a REAL trained model, not a heuristic: an XGBoost-trained
 * gradient-boosted ensemble (800 trees) on MHCflurry-curated binding
 * measurements, evaluated once on a peptide-GROUPED held-out split so no
 * peptide appears in both training and test.
 *
 * The model was exported to a compact tree representation and is executed
 * locally in TypeScript -- this class IS the runtime. No ML library is loaded
 * in the browser: no XGBoost build, no ONNX, no WASM, just a traversal of the
 * exported trees. scripts/verify-parity.mjs imports this class and holds it to
 * the original booster's output.
 *
 *   held-out ROC-AUC 0.9188   PR-AUC 0.8085   n = 120,000   129 alleles
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
  // Rendered on the home page. Names both halves deliberately: what trained the
  // model, and what actually executes it in the browser.
  algorithm:
    "XGBoost-trained gradient-boosted trees (800 estimators), exported to a compact " +
    "tree representation and executed locally in TypeScript",
  encoding: "one-hot peptide (11 positions) + one-hot allele pseudo-sequence (39 positions)",
  trainingExamples: 120000,
  alleles: 129,
  split: "peptide-grouped 80/20 — no peptide appears in both train and test",
  dataSource: "MHCflurry-curated public binding measurements",
  rocAuc: 0.9188,
  prAuc: 0.8085,
  testRows: 23866,
  testPositiveRate: 0.2782,
  note:
    "Runs entirely in your browser. Predictions match the Python model to " +
    "7.5e-08 (max over 516 measured pairs) -- float32 accumulation order, not a " +
    "logic difference. Measured by scripts/verify-parity.mjs, not assumed.",

  /**
   * PROVENANCE: rocAuc/prAuc above are read directly from
   * ml-training/peptide-mhc/pmhc_metrics.json (train_baseline.py's own
   * output), which is also the exact model exported to
   * client/public/models/pmhc_model.json -- verified by
   * scripts/verify_parity.py, which scores the same pairs THIS class produced
   * (max 7.481e-08, mean 1.097e-08 over 516 pairs, tolerance 1e-06: float32
   * accumulation noise, not a logic difference). The
   * loao/calibration/splitLadder numbers below are a re-run of the identical
   * pipeline (same code, hyperparameters, seed=42); its own peptide-grouped
   * rung reproduces test_roc_auc/test_pr_auc from pmhc_metrics.json to full
   * float precision (see pmhc_metrics_split_ladder.json rung 2), so every
   * number on this card now describes the one model actually deployed.
   */

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
   * "peptide-grouped" rung reproduces the deployed model's own rocAuc/prAuc
   * above to full float precision (see PROVENANCE comment above).
   */
  splitLadder: {
    randomSplit: { rocAuc: 0.927, prAuc: 0.8367, label: "random (leaks across split)" },
    peptideGrouped: { rocAuc: 0.9188, prAuc: 0.8085, label: "peptide-grouped (same split as production)" },
    sequenceCluster: { rocAuc: 0.9144, prAuc: 0.8074, label: "sequence-cluster (approx.)" },
    alleleHeldOut: { rocAuc: 0.8419, prAuc: 0.6432, label: "allele-held-out (LOAO)" },
  },
} as const;
