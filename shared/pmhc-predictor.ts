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

/** Metrics from the single held-out evaluation. Never edit these by hand. */
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
  note:
    "Runs entirely in your browser. Predictions are bit-identical to the Python " +
    "model because the one-hot encoding is exact integer arithmetic.",
} as const;
