/**
 * Illustrative demo scorer — NOT a trained model.
 *
 * HONESTY NOTE: This project does not currently serve a trained
 * peptide-MHC binding classifier. There is no CNN, BiLSTM, or Transformer
 * running inference anywhere in this codebase. The function below is a
 * single, deterministic, fully transparent heuristic derived from basic
 * peptide sequence chemistry (average Kyte-Doolittle hydrophobicity of the
 * sequence's residues, blended with how close the sequence length is to a
 * typical 9-mer MHC-I epitope). The same input sequence always produces the
 * same output — there is no randomness and no simulated "compute time."
 *
 * Its only purpose is to let the UI demonstrate request/response plumbing
 * end-to-end. It must be presented to users as an illustrative/demonstration
 * score, never as the output of a trained model.
 *
 * The only real predictive-model numbers connected to this project come
 * from OFFLINE, held-out evaluation of a model being integrated separately
 * (see ../../ml-training/peptide-mhc):
 *   - XGBoost baseline:      ROC-AUC 0.919
 *   - ESM-2 150M + LoRA:     ROC-AUC 0.922, PR-AUC 0.827
 * Both are on a leak-free, peptide-grouped held-out split of MHCflurry-
 * curated data. Those numbers describe an offline evaluation of a model
 * being integrated — they are NOT produced by this file and are NOT this
 * app's live output.
 */

const KYTE_DOOLITTLE: Record<string, number> = {
  A: 1.8, C: 2.5, D: -3.5, E: -3.5, F: 2.8, G: -0.4, H: -3.2, I: 4.5,
  K: -3.9, L: 3.8, M: 1.9, N: -3.5, P: -1.6, Q: -3.5, R: -4.5, S: -0.8,
  T: -0.7, V: 4.2, W: -0.9, Y: -1.3,
};

export interface IllustrativeResult {
  probability: number;
  confidence: number;
}

/**
 * Deterministic, sequence-derived illustrative score in [0, 1].
 * NOT the output of a trained classifier of any kind. Given the same
 * `sequence`, this always returns the same result.
 */
export function illustrativeScore(sequence: string): IllustrativeResult {
  const residues = sequence.split('').filter((aa) => aa in KYTE_DOOLITTLE);

  if (residues.length === 0) {
    return { probability: 0.5, confidence: 0.5 };
  }

  const avgHydrophobicity =
    residues.reduce((sum, aa) => sum + KYTE_DOOLITTLE[aa], 0) / residues.length;

  // Map average hydrophobicity (roughly -4.5..4.5) onto (0, 1) with a logistic curve.
  const rawProbability = 1 / (1 + Math.exp(-avgHydrophobicity / 2));

  // "Confidence" is just a function of how close the sequence length is to a
  // canonical 9-mer MHC-I epitope -- not a real calibration signal.
  const lengthFit = 1 - Math.min(1, Math.abs(residues.length - 9) / 6);
  const rawConfidence = 0.5 + 0.3 * lengthFit;

  return {
    probability: Math.max(0, Math.min(1, rawProbability)),
    confidence: Math.max(0.5, Math.min(0.8, rawConfidence)),
  };
}

/** Standard disclaimer string for any UI/API surface showing a score from this file. */
export const ILLUSTRATIVE_DISCLAIMER =
  'Illustrative demo score — a deterministic function of basic sequence properties. NOT the output of a trained model.';

/**
 * The only real, honest predictive-model numbers connected to this project.
 * Sourced from offline evaluation in ../../ml-training/peptide-mhc.
 * Never present these as this app's live output.
 */
export const OFFLINE_MODEL_EVALUATION = {
  note:
    "Held-out evaluation of the model being integrated separately (see ../ml-training/peptide-mhc). " +
    "Not this app's live output.",
  xgboostBaseline: { rocAuc: 0.919 },
  esm2LoRA: { rocAuc: 0.922, prAuc: 0.827 },
} as const;
