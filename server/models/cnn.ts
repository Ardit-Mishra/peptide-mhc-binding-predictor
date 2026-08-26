import { illustrativeScore, ILLUSTRATIVE_DISCLAIMER } from '../lib/illustrative-scorer';

/**
 * "CNN" demo placeholder — NOT a trained model.
 *
 * HONESTY NOTE: No CNN architecture has ever been trained for this project.
 * There is no checkpoint, no training notebook that was actually run, and no
 * held-out evaluation behind this class. This class exists only as one of
 * several UI-selectable demo "model" slots; every slot routes through the
 * same deterministic illustrative-scoring heuristic (see
 * ../lib/illustrative-scorer.ts) so results are transparent and reproducible,
 * never randomly generated.
 *
 * Input: one-hot encoded peptide tensor of shape (1, 15, 20) — kept only for
 * illustration of what a real CNN's preprocessing might look like; the
 * encoded tensor is not actually consumed by any inference step.
 */
export class CNNClassifier {
  constructor() {}

  /**
   * No trained model exists behind this class, so there is no real
   * accuracy/AUC/sensitivity/specificity to report. This returns a
   * disclaimer only — see illustrative-scorer.ts for the one real,
   * honest offline evaluation number this project has (from a different
   * model entirely, being integrated separately).
   */
  getMetrics() {
    return {
      trained: false,
      disclaimer: ILLUSTRATIVE_DISCLAIMER,
    };
  }

  /**
   * One-hot encode a peptide sequence into a (1, 15, 20) tensor.
   *
   * Each amino acid is mapped to a 20-dimensional binary vector based on its
   * position in the standard amino acid alphabet. Sequences shorter than 15
   * residues are zero-padded; longer sequences are truncated. This encoding
   * is illustrative only — it is not fed into any real model.
   */
  preprocess(sequence: string): number[][][] {
    const aaList = 'ACDEFGHIKLMNPQRSTVWY';
    const maxLen = 15;
    const matrix = Array(maxLen).fill(null).map(() => Array(20).fill(0));

    for (let i = 0; i < Math.min(sequence.length, maxLen); i++) {
      const aaIndex = aaList.indexOf(sequence[i]);
      if (aaIndex >= 0) {
        matrix[i][aaIndex] = 1;
      }
    }

    return [matrix];
  }

  /**
   * Return an illustrative demo score for a peptide sequence.
   *
   * This is NOT a forward pass of a trained CNN — no such model exists.
   * It is a deterministic function of the sequence's chemistry (see
   * ../lib/illustrative-scorer.ts). The same sequence always returns the
   * same result; there is no simulated compute time.
   */
  async predictBinding(sequence: string): Promise<{ probability: number; confidence: number; computeTime: number }> {
    const startTime = Date.now();
    const { probability, confidence } = illustrativeScore(sequence);
    const computeTime = Date.now() - startTime;

    return { probability, confidence, computeTime };
  }
}
