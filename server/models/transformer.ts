import { illustrativeScore, ILLUSTRATIVE_DISCLAIMER } from '../lib/illustrative-scorer';

/**
 * "Transformer" demo placeholder — NOT a trained model.
 *
 * HONESTY NOTE: No Transformer architecture has ever been trained for this
 * project. There is no checkpoint and no held-out evaluation behind this
 * class. This class exists only as one of several UI-selectable demo
 * "model" slots; every slot routes through the same deterministic
 * illustrative-scoring heuristic (see ../lib/illustrative-scorer.ts) so
 * results are transparent and reproducible, never randomly generated. There
 * is no real speed/accuracy comparison between "model" slots to make.
 *
 * Input: one-hot encoded peptide matrix of shape (15, 20) — kept only for
 * illustration of what a real Transformer's preprocessing might look like;
 * the encoded matrix is not actually consumed by any inference step.
 */
export class TransformerClassifier {
  constructor() {}

  /**
   * No trained model exists behind this class, so there is no real
   * accuracy/AUC/sensitivity/specificity to report.
   */
  getMetrics() {
    return {
      trained: false,
      disclaimer: ILLUSTRATIVE_DISCLAIMER,
    };
  }

  /**
   * Encode a peptide sequence into a (15, 20) matrix.
   * Illustrative only — not consumed by any real model.
   */
  preprocess(sequence: string): number[][] {
    const aaList = 'ACDEFGHIKLMNPQRSTVWY';
    const maxLen = 15;
    const matrix = Array(maxLen).fill(null).map(() => Array(20).fill(0));

    for (let i = 0; i < Math.min(sequence.length, maxLen); i++) {
      const aaIndex = aaList.indexOf(sequence[i]);
      if (aaIndex >= 0) {
        matrix[i][aaIndex] = 1;
      }
    }

    return matrix;
  }

  /**
   * Return an illustrative demo score for a peptide sequence.
   *
   * This is NOT a forward pass of a trained Transformer — no such model
   * exists. It is the same deterministic function of the sequence's
   * chemistry used by every demo "model" slot (see
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
