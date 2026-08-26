/**
 * Shared data contracts.
 *
 * This app runs entirely in the browser — there is no server and no database.
 * These were previously Drizzle `pgTable` definitions whose types were inferred
 * for a Postgres backend that was never actually used (the request handlers ran
 * against an in-memory store). They are now plain Zod schemas: the same shapes,
 * validated in the browser, with no database dependency.
 */
import { z } from "zod";

const id = z.string();
const isoDate = z.string(); // ISO-8601; JSON has no Date type

// ---------------------------------------------------------------- core records

export const userSchema = z.object({
  id,
  username: z.string(),
  password: z.string(),
});

export const predictionSchema = z.object({
  id,
  sequence: z.string(),
  model: z.string(),
  probability: z.number(),
  confidence: z.number(),
  mhcAllele: z.string().nullable().optional(),
  computeTime: z.number(),
  createdAt: isoDate.nullable(),
});

export const systemStatusSchema = z.object({
  id,
  modelsLoaded: z.number().int(),
  datasetAccessible: z.boolean(),
  lastSync: isoDate.nullable(),
  cacheSize: z.number().int(),
  predictionsToday: z.number().int(),
});

export const projectSchema = z.object({
  id,
  name: z.string(),
  description: z.string().nullable().optional(),
  userId: z.string(),
  isPublic: z.boolean(),
  createdAt: isoDate.nullable(),
  updatedAt: isoDate.nullable(),
});

export const batchJobSchema = z.object({
  id,
  projectId: z.string(),
  name: z.string(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  totalSequences: z.number().int(),
  processedSequences: z.number().int(),
  models: z.array(z.string()),
  uploadedFile: z.string().nullable().optional(),
  results: z.unknown().nullable(),
  createdAt: isoDate.nullable(),
  completedAt: isoDate.nullable(),
});

export const mutationAnalysisSchema = z.object({
  id,
  originalSequence: z.string(),
  mutatedSequence: z.string(),
  position: z.number().int(),
  originalAA: z.string(),
  mutatedAA: z.string(),
  impactScore: z.number(),
  model: z.string(),
  userId: z.string(),
  createdAt: isoDate.nullable(),
});

export const designSuggestionSchema = z.object({
  id,
  targetMhc: z.string(),
  suggestedSequence: z.string(),
  predictedAffinity: z.number(),
  designStrategy: z.string(),
  userId: z.string(),
  createdAt: isoDate.nullable(),
});

// --------------------------------------------------------------- insert shapes

export const insertUserSchema = userSchema.pick({ username: true, password: true });
export const insertPredictionSchema = predictionSchema.omit({ id: true, createdAt: true });
export const insertSystemStatusSchema = systemStatusSchema.omit({ id: true });
export const insertProjectSchema = projectSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertBatchJobSchema = batchJobSchema.omit({ id: true, createdAt: true, completedAt: true });
export const insertMutationAnalysisSchema = mutationAnalysisSchema.omit({ id: true, createdAt: true });
export const insertDesignSuggestionSchema = designSuggestionSchema.omit({ id: true, createdAt: true });

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Prediction = z.infer<typeof predictionSchema>;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type SystemStatus = z.infer<typeof systemStatusSchema>;
export type InsertSystemStatus = z.infer<typeof insertSystemStatusSchema>;
export type Project = z.infer<typeof projectSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type BatchJob = z.infer<typeof batchJobSchema>;
export type InsertBatchJob = z.infer<typeof insertBatchJobSchema>;
export type MutationAnalysis = z.infer<typeof mutationAnalysisSchema>;
export type InsertMutationAnalysis = z.infer<typeof insertMutationAnalysisSchema>;
export type DesignSuggestion = z.infer<typeof designSuggestionSchema>;
export type InsertDesignSuggestion = z.infer<typeof insertDesignSuggestionSchema>;

// ------------------------------------------------------------------ API shapes

// One key, because there is exactly one trained model. The app previously
// advertised five architecture "slots" (CNN, BiLSTM, Transformer, ...) that all
// resolved to the same placeholder function; none of them existed. They are
// gone rather than renamed, so the UI cannot offer a model that isn't real.
export const MODEL_KEYS = ["xgb_pseudoseq"] as const;
const modelEnum = z.enum(MODEL_KEYS);

// The model encodes peptides into 11 positions and was trained on 8-11mers, so
// anything outside that range is rejected rather than silently truncated.
const peptideSchema = z
  .string()
  .min(8, "MHC class I peptides are 8-11 residues")
  .max(11, "MHC class I peptides are 8-11 residues")
  .regex(/^[ACDEFGHIKLMNPQRSTVWY]+$/, "Invalid amino acid sequence");

export const predictRequestSchema = z.object({
  sequence: peptideSchema,
  model: modelEnum,
  mhcAllele: z.string().optional(),
});

export const predictResponseSchema = z.object({
  sequence: z.string(),
  model: z.string(),
  probability: z.number(),
  confidence: z.number(),
  rank: z.string(),
  computeTime: z.string(),
  trainingAcc: z.string(),
  validationAuc: z.string(),
  sensitivity: z.string(),
  specificity: z.string(),
  mhcAllele: z.string().optional(),
});

export const batchUploadSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  models: z.array(modelEnum),
  sequences: z.array(peptideSchema),
});

export const mutationRequestSchema = z.object({
  sequence: peptideSchema,
  position: z.number().min(0),
  newAminoAcid: z.string().length(1).regex(/^[ACDEFGHIKLMNPQRSTVWY]$/),
  model: modelEnum,
  mhcAllele: z.string().optional(),
});

export const designRequestSchema = z.object({
  targetMhc: z.string(),
  length: z.number().min(8).max(11),
  strategy: z.enum(["optimize_binding", "maximize_immunogenicity", "minimize_toxicity"]),
});

export type PredictRequest = z.infer<typeof predictRequestSchema>;
export type PredictResponse = z.infer<typeof predictResponseSchema>;
export type BatchUploadRequest = z.infer<typeof batchUploadSchema>;
export type MutationRequest = z.infer<typeof mutationRequestSchema>;
export type DesignRequest = z.infer<typeof designRequestSchema>;
