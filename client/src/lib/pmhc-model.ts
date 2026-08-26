/**
 * Lazy loader for the trained peptide-MHC binding model.
 *
 * The model (a 800-tree XGBoost ensemble) and its allele pseudo-sequence table
 * are static JSON assets served from `public/models/`. They are fetched on the
 * first prediction rather than at page load, so opening the app costs nothing
 * extra and only users who actually predict pay for the download.
 *
 * The fetch is cached as a promise, so concurrent callers share one download.
 * A failed load clears the cache, so a transient network error can be retried
 * by simply predicting again.
 */
import {
  PeptideMHCPredictor,
  type AlleleTable,
  type CompactModel,
} from "@shared/pmhc-predictor";

/** Per-allele training support, used to show how much data backs a prediction. */
export interface AlleleSupport {
  n: number;
  nBinders: number;
}

export interface LoadedModel {
  predictor: PeptideMHCPredictor;
  /** Alleles the model was actually trained on, sorted by name. */
  alleles: string[];
  /** Training-row counts per allele; absent for alleles with no record. */
  support: Record<string, AlleleSupport>;
}

type AlleleAsset = AlleleTable & {
  trainingCounts?: Record<string, AlleleSupport>;
};

let cached: Promise<LoadedModel> | null = null;
let cachedAlleles: Promise<AlleleAsset> | null = null;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Could not load ${path} (HTTP ${res.status})`);
  }
  return (await res.json()) as T;
}

/**
 * The allele table only (~12 KB), for populating the allele picker without
 * pulling down the ~2.6 MB model. Shared with `loadModel`, so choosing an
 * allele and then predicting downloads each asset exactly once.
 */
function loadAlleleAsset(): Promise<AlleleAsset> {
  if (!cachedAlleles) {
    cachedAlleles = fetchJson<AlleleAsset>("models/pmhc_alleles.json").catch((err) => {
      cachedAlleles = null;
      throw err;
    });
  }
  return cachedAlleles;
}

/** Alleles the model was trained on, with their training-row counts. */
export async function loadAlleleList(): Promise<
  { allele: string; support: AlleleSupport | undefined }[]
> {
  const asset = await loadAlleleAsset();
  return Object.keys(asset.pseudoSequences)
    .sort()
    .map((allele) => ({ allele, support: asset.trainingCounts?.[allele] }));
}

/**
 * Resolves to the trained predictor. Safe to call on every prediction — the
 * underlying download happens at most once.
 */
export function loadModel(): Promise<LoadedModel> {
  if (!cached) {
    cached = (async () => {
      const [model, alleleTable] = await Promise.all([
        fetchJson<CompactModel>("models/pmhc_model.json"),
        loadAlleleAsset(),
      ]);
      const predictor = new PeptideMHCPredictor(model, alleleTable);
      return {
        predictor,
        alleles: predictor.alleleNames(),
        support: alleleTable.trainingCounts ?? {},
      };
    })().catch((err) => {
      // Let the next call try again rather than caching the failure forever.
      cached = null;
      throw err;
    });
  }
  return cached;
}

/** True once the model is in memory, so callers can skip a loading state. */
export function isModelLoaded(): boolean {
  return cached !== null;
}
