/**
 * Model Loader Service — HONESTY NOTE
 *
 * This service does NOT load any trained model. There are no trained
 * PyTorch/ONNX weights being parsed or executed anywhere in this codebase.
 * Any `.pt` files that may exist under `models/` are leftover artifacts from
 * an earlier iteration; their bytes were never read into a tensor runtime,
 * so this service no longer checks for or downloads them.
 *
 * "Loading" a model here only means: the named demo slot exists and is
 * ready to produce an illustrative, deterministic, non-trained score via
 * ../lib/illustrative-scorer.ts. The Google Drive weight-download path from
 * an earlier iteration has been removed from this flow entirely, since
 * nothing ever consumed the downloaded bytes.
 *
 * The only real predictive-model numbers connected to this project come
 * from OFFLINE evaluation of a model being integrated separately — see
 * ../lib/illustrative-scorer.ts's OFFLINE_MODEL_EVALUATION constant and
 * ../../ml-training/peptide-mhc. Those numbers are not produced by
 * anything in this file and are not this app's live output.
 */
import { illustrativeScore } from '../lib/illustrative-scorer';

export interface DemoModelSlot {
  /** Internal slot key, matches the `model` enum accepted by the API. */
  key: string;
  /** Honest, non-claiming label shown in the UI. */
  name: string;
}

export interface LoadedDemoModel {
  name: string;
  loaded: true;
  predict: (sequence: string) => Promise<{ probability: number; confidence: number }>;
}

/** The demo "model" slots the API/UI can select between. None are trained models. */
const DEMO_SLOTS: DemoModelSlot[] = [
  { key: 'cnn', name: 'Illustrative Demo Scorer (CNN slot — no trained model)' },
  { key: 'bilstm', name: 'Illustrative Demo Scorer (BiLSTM slot — no trained model)' },
  { key: 'cnn_bilstm_best', name: 'Illustrative Demo Scorer (CNN+BiLSTM Best slot — no trained model)' },
  { key: 'cnn_bilstm', name: 'Illustrative Demo Scorer (CNN+BiLSTM slot — no trained model)' },
  { key: 'transformer', name: 'Illustrative Demo Scorer (Transformer slot — no trained model)' },
];

export class ModelLoader {
  private slots: Map<string, DemoModelSlot> = new Map();
  private readySlots: Set<string> = new Set();

  constructor() {
    for (const slot of DEMO_SLOTS) {
      this.slots.set(slot.key, slot);
    }
  }

  /**
   * "Load" a demo slot by name. There is no real weight loading: this just
   * marks the slot ready and returns a predict function backed by the
   * shared deterministic illustrative scorer.
   */
  async loadModel(modelName: string): Promise<LoadedDemoModel> {
    const slot = this.slots.get(modelName);
    if (!slot) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    this.readySlots.add(modelName);

    return {
      name: slot.name,
      loaded: true,
      predict: async (sequence: string) => illustrativeScore(sequence),
    };
  }

  async loadAllModels(): Promise<void> {
    for (const key of Array.from(this.slots.keys())) {
      await this.loadModel(key);
    }
  }

  getLoadedModelsCount(): number {
    return this.readySlots.size;
  }

  getModelMetadata(): DemoModelSlot[] {
    return Array.from(this.slots.values());
  }

  /**
   * No real weight files are loaded by this service, so there is nothing
   * to report as cache usage.
   */
  getCacheSize(): number {
    return 0;
  }

  isModelLoaded(modelName: string): boolean {
    return this.readySlots.has(modelName);
  }
}

export const modelLoader = new ModelLoader();
