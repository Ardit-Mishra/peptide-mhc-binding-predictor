/**
 * In-browser backend.
 *
 * This app used to ship an Express server. That server did three things:
 * run a deterministic scoring function, keep records in an in-memory map, and
 * return honest "not implemented" stubs for integrations that don't exist.
 * None of that needs a server, so all of it now runs in the browser and the
 * app deploys as a static site — no backend, no database, no cold start.
 *
 * Records live in `localStorage`, so unlike the old in-memory store they now
 * actually survive a reload. Everything is per-browser and private; nothing is
 * transmitted anywhere.
 */
import {
  batchUploadSchema,
  designRequestSchema,
  insertProjectSchema,
  mutationRequestSchema,
  predictRequestSchema,
  type BatchJob,
  type DesignRequest,
  type Prediction,
  type Project,
  type SystemStatus,
} from "@shared/schema";
import { PMHC_MODEL_CARD } from "@shared/pmhc-predictor";
import { isModelLoaded, loadModel } from "./pmhc-model";

/** The one trained model this app serves. */
const MODEL_KEY = "xgb_pseudoseq";
const MODEL_LABEL = "XGBoost + allele pseudo-sequence";

const MODEL_DISCLAIMER =
  "Research and educational use only — not a clinical or diagnostic tool. " +
  "Predictions come from a gradient-boosted tree model trained on public " +
  "MHCflurry-curated binding affinity data and run entirely in your browser.";

// Held-out numbers from the single evaluation run, taken from the model card
// rather than retyped, so they cannot drift out of sync with the model.
const MODEL_METRICS = {
  trainingAcc: `${PMHC_MODEL_CARD.trainingExamples.toLocaleString()} training measurements across ${PMHC_MODEL_CARD.alleles} alleles`,
  validationAuc: `Held-out ROC-AUC ${PMHC_MODEL_CARD.rocAuc.toFixed(3)} / PR-AUC ${PMHC_MODEL_CARD.prAuc.toFixed(3)} (${PMHC_MODEL_CARD.split})`,
  sensitivity: "Not measured at a fixed threshold — the model reports a probability, not a call",
  specificity: "Not measured at a fixed threshold — the model reports a probability, not a call",
};

// ------------------------------------------------------------------- storage

const NS = "peptide-mhc:";
const uid = () => crypto.randomUUID();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback; // private mode, disabled storage, corrupt value
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* quota or disabled storage — the session still works, it just won't persist */
  }
}

const store = {
  predictions: () => read<Prediction[]>("predictions", []),
  addPrediction(p: Omit<Prediction, "id" | "createdAt">): Prediction {
    const rec: Prediction = { ...p, id: uid(), createdAt: new Date().toISOString() };
    // keep the log bounded so localStorage can't grow without limit
    write("predictions", [rec, ...store.predictions()].slice(0, 200));
    return rec;
  },
  projects: () => read<Project[]>("projects", []),
  addProject(p: Omit<Project, "id" | "createdAt" | "updatedAt">): Project {
    const now = new Date().toISOString();
    const rec: Project = { ...p, id: uid(), createdAt: now, updatedAt: now };
    write("projects", [...store.projects(), rec]);
    return rec;
  },
  batchJobs: () => read<BatchJob[]>("batchJobs", []),
  putBatchJob(job: BatchJob): void {
    const rest = store.batchJobs().filter((j) => j.id !== job.id);
    write("batchJobs", [...rest, job].slice(-50));
  },
};

/** Predictions recorded today, computed from the real log — not a running counter. */
function predictionsToday(): number {
  const today = new Date().toDateString();
  return store.predictions().filter(
    (p) => p.createdAt && new Date(p.createdAt).toDateString() === today,
  ).length;
}

function systemStatus(): SystemStatus {
  return {
    id: "local",
    // One trained model, counted only once it is actually in memory.
    modelsLoaded: isModelLoaded() ? 1 : 0,
    datasetAccessible: false, // no live dataset is wired up — see README
    lastSync: null, // nothing to sync: this app talks to no server
    cacheSize: 0,
    predictionsToday: predictionsToday(),
  };
}

// ----------------------------------------------------------------- endpoints

/** Default allele when the caller doesn't pick one — the best-supported one. */
const DEFAULT_ALLELE = "HLA-A*02:01";

/**
 * How far the probability sits from the 0.5 decision boundary, as a percentage.
 * This is a plain restatement of the probability, NOT a calibrated confidence
 * interval or an uncertainty estimate — the model does not produce one.
 */
function boundaryDistance(probability: number): number {
  return Math.abs(probability - 0.5) * 2;
}

async function predict(body: unknown) {
  const { sequence, model: modelName, mhcAllele } = predictRequestSchema.parse(body);
  const allele = mhcAllele || DEFAULT_ALLELE;

  const { predictor, support } = await loadModel();
  if (!predictor.hasAllele(allele)) {
    return json(
      {
        message:
          `${allele} is not one of the ${PMHC_MODEL_CARD.alleles} alleles this model was ` +
          `trained on, so it cannot be scored honestly.`,
      },
      400,
    );
  }

  const t0 = performance.now();
  const { probability, rank, margin } = predictor.predict(sequence, allele);
  const computeTime = ((performance.now() - t0) / 1000).toFixed(3);
  const confidence = boundaryDistance(probability);

  store.addPrediction({
    sequence,
    model: modelName,
    probability,
    confidence,
    mhcAllele: allele,
    computeTime: parseFloat(computeTime),
  });

  const n = support[allele]?.n;
  return json({
    sequence,
    model: MODEL_LABEL,
    probability: parseFloat(probability.toFixed(4)),
    confidence: parseFloat((confidence * 100).toFixed(1)),
    rank,
    margin: parseFloat(margin.toFixed(4)),
    computeTime: `${computeTime}s`,
    ...MODEL_METRICS,
    mhcAllele: allele,
    alleleSupportN: n ?? null,
    alleleSupport: n
      ? `${n.toLocaleString()} training measurements for ${allele}`
      : `No per-allele training count recorded for ${allele}`,
    disclaimer: MODEL_DISCLAIMER,
  });
}

async function scoreFor(sequence: string, allele: string = DEFAULT_ALLELE) {
  const { predictor } = await loadModel();
  // Without this guard an unknown allele encodes as an all-zero block and the
  // model returns a confident-looking number for an allele it has never seen.
  if (!predictor.hasAllele(allele)) {
    throw new Error(`${allele} is not one of the ${PMHC_MODEL_CARD.alleles} trained alleles`);
  }
  const { probability, margin } = predictor.predict(sequence, allele);
  return {
    sequence,
    model: MODEL_KEY,
    probability,
    confidence: boundaryDistance(probability),
    margin,
    rank: probability > 0.8 ? "High Binder" : probability > 0.5 ? "Medium Binder" : "Low Binder",
    computeTime: 0,
    ...MODEL_METRICS,
  };
}

/** Real activity, derived from what this browser actually did. */
function recentActivity() {
  const rel = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };
  return json(
    store.predictions().slice(0, 5).map((p) => ({
      id: p.id,
      message: `Scored ${p.sequence} vs ${p.mhcAllele ?? "—"}`,
      timestamp: p.createdAt ? rel(p.createdAt) : "",
      type: "prediction" as const,
    })),
  );
}

async function runBatch(body: unknown) {
  const req = batchUploadSchema.parse(body);
  // Load before creating the job so a model-load failure surfaces as an error
  // rather than a job that silently never completes.
  await loadModel();
  const now = new Date().toISOString();
  const job: BatchJob = {
    id: uid(),
    projectId: req.projectId,
    name: req.name,
    models: req.models,
    totalSequences: req.sequences.length,
    processedSequences: 0,
    status: "running",
    uploadedFile: null,
    results: null,
    createdAt: now,
    completedAt: null,
  };
  store.putBatchJob(job);

  // Scoring is fast (sub-millisecond per peptide) but the model is already in
  // memory by now; yield once so the UI can paint "running" before the job
  // flips to "completed".
  setTimeout(() => {
    void (async () => {
      const results = await Promise.all(
        req.sequences.map((sequence) => scoreFor(sequence)),
      );
      store.putBatchJob({
        ...job,
        status: "completed",
        processedSequences: req.sequences.length,
        results: { disclaimer: MODEL_DISCLAIMER, results },
        completedAt: new Date().toISOString(),
      });
    })();
  }, 0);

  return json(job);
}

async function mutationAnalysis(body: unknown) {
  const req = mutationRequestSchema.parse(body);
  const allele = req.mhcAllele || DEFAULT_ALLELE;
  const original = await scoreFor(req.sequence, allele);
  const chars = req.sequence.split("");
  chars[req.position] = req.newAminoAcid;
  const mutated = await scoreFor(chars.join(""), allele);

  return json({
    id: uid(),
    originalSequence: req.sequence,
    mutatedSequence: chars.join(""),
    position: req.position,
    originalAA: req.sequence[req.position],
    mutatedAA: req.newAminoAcid,
    impactScore: mutated.probability - original.probability,
    model: req.model,
    createdAt: new Date().toISOString(),
    mhcAllele: allele,
    originalPrediction: original,
    mutatedPrediction: mutated,
    disclaimer: MODEL_DISCLAIMER,
  });
}

async function designGenerate(body: unknown) {
  const req: DesignRequest = designRequestSchema.parse(body);
  const allele = req.targetMhc || DEFAULT_ALLELE;
  // HONESTY NOTE: a uniformly random sequence generator, not an AI design or
  // optimization algorithm. `strategy` is recorded but does not influence
  // generation or scoring in any way.
  const AAs = "ACDEFGHIKLMNPQRSTVWY";
  const suggestions = (await Promise.all(
    Array.from({ length: 3 }, async () => {
    const bytes = crypto.getRandomValues(new Uint8Array(req.length));
    const sequence = Array.from(bytes, (b) => AAs[b % AAs.length]).join("");
    const p = await scoreFor(sequence, allele);
    return {
      sequence,
      predictedAffinity: p.probability,
      confidence: p.confidence,
      designStrategy: req.strategy,
      rank: p.rank,
      disclaimer:
        "Uniformly random sequence generator — not a trained generative or optimization " +
        "model. The sequences are random; only the binding score is from the trained model.",
    };
    }),
  )).sort((a, b) => b.predictedAffinity - a.predictedAffinity);

  return json({ suggestions });
}

// ------------------------------------------------------------------- routing

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Resolves an `/api/...` request entirely in the browser.
 * Mirrors the shape the UI already expects, so no page or component changed.
 */
export async function localBackend(method: string, url: string, body?: unknown): Promise<Response> {
  const path = url.split("?")[0].replace(/\/+$/, "") || "/";
  const M = method.toUpperCase();

  try {
    if (M === "GET" && (path === "/api/health" || path === "/health")) {
      return json({ status: "ok", modelsLoaded: isModelLoaded() ? 1 : 0, cacheSize: 0 });
    }
    if (M === "GET" && path === "/api/system-status") return json(systemStatus());
    if (M === "GET" && path === "/api/recent-activity") return recentActivity();

    if (M === "GET" && path === "/api/models/performance") {
      return json({
        disclaimer: MODEL_DISCLAIMER,
        modelCard: PMHC_MODEL_CARD,
        models: [
          {
            key: MODEL_KEY,
            name: MODEL_LABEL,
            trained: true,
            loaded: isModelLoaded(),
            rocAuc: PMHC_MODEL_CARD.rocAuc,
            prAuc: PMHC_MODEL_CARD.prAuc,
          },
        ],
      });
    }

    if (M === "POST" && path === "/api/predict") return predict(body);
    if (M === "POST" && path === "/api/batch/create") return runBatch(body);
    if (M === "GET" && path === "/api/batch/jobs") return json(store.batchJobs());
    if (M === "POST" && path === "/api/analysis/mutation") return mutationAnalysis(body);
    if (M === "POST" && path === "/api/design/generate") return designGenerate(body);

    if (M === "GET" && path === "/api/predictions") return json(store.predictions());
    if (M === "GET" && path === "/api/projects") return json(store.projects());
    if (M === "POST" && path === "/api/projects") {
      const data = insertProjectSchema.parse(body);
      return json(store.addProject(data));
    }

    if (M === "GET" && path.startsWith("/api/visualize/data/")) {
      return json({
        disclaimer:
          "This app ships the trained model but not the evaluation dataset, so the " +
          "figures below are the held-out numbers recorded when the model was trained.",
        modelCard: PMHC_MODEL_CARD,
      });
    }

    // HONESTY NOTE: no IEDB/UniProt/PDB client exists anywhere in this codebase.
    // These report "not connected" / "not implemented" rather than fabricating results.
    if (M === "GET" && path === "/api/databases") {
      return json({
        disclaimer: "No external database integrations are implemented in this app yet.",
        databases: [
          { id: "iedb", name: "IEDB", status: "not_connected", apiAvailable: false },
          { id: "uniprot", name: "UniProt", status: "not_connected", apiAvailable: false },
          { id: "pdb", name: "PDB", status: "not_connected", apiAvailable: false },
        ],
      });
    }
    if (path.startsWith("/api/databases/")) {
      return json(
        { message: "Not implemented. No external database integration exists in this app." },
        501,
      );
    }

    return json({ message: `No handler for ${M} ${path}` }, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    // Zod validation failures are client errors, not internal ones.
    const status = err instanceof Error && err.name === "ZodError" ? 400 : 500;
    return json({ message }, status);
  }
}
