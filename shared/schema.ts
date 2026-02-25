import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, real, integer, boolean, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequence: text("sequence").notNull(),
  model: text("model").notNull(),
  probability: real("probability").notNull(),
  confidence: real("confidence").notNull(),
  mhcAllele: text("mhc_allele"),
  computeTime: real("compute_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemStatus = pgTable("system_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  googleDriveConnected: boolean("google_drive_connected").notNull().default(false),
  modelsLoaded: integer("models_loaded").notNull().default(0),
  datasetAccessible: boolean("dataset_accessible").notNull().default(false),
  lastSync: timestamp("last_sync"),
  cacheSize: integer("cache_size").notNull().default(0),
  predictionsToday: integer("predictions_today").notNull().default(0),
});

// Projects for organization
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  userId: varchar("user_id").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Batch processing jobs
export const batchJobs = pgTable("batch_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  totalSequences: integer("total_sequences").notNull().default(0),
  processedSequences: integer("processed_sequences").notNull().default(0),
  models: text("models").array().notNull(), // Array of model names
  uploadedFile: text("uploaded_file"),
  results: jsonb("results"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Project collaborators
export const projectCollaborators = pgTable("project_collaborators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull().default("viewer"), // owner, editor, viewer
  createdAt: timestamp("created_at").defaultNow(),
});

// Sequence annotations and comments
export const sequenceAnnotations = pgTable("sequence_annotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  predictionId: varchar("prediction_id").notNull(),
  userId: varchar("user_id").notNull(),
  comment: text("comment").notNull(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mutation analysis results
export const mutationAnalysis = pgTable("mutation_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalSequence: text("original_sequence").notNull(),
  mutatedSequence: text("mutated_sequence").notNull(),
  position: integer("position").notNull(),
  originalAA: text("original_aa").notNull(),
  mutatedAA: text("mutated_aa").notNull(),
  impactScore: real("impact_score").notNull(),
  model: text("model").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Peptide design suggestions
export const designSuggestions = pgTable("design_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetMhc: text("target_mhc").notNull(),
  suggestedSequence: text("suggested_sequence").notNull(),
  predictedAffinity: real("predicted_affinity").notNull(),
  designStrategy: text("design_strategy").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Literature references
export const literatureRefs = pgTable("literature_refs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pubmedId: text("pubmed_id").notNull(),
  title: text("title").notNull(),
  authors: text("authors").notNull(),
  journal: text("journal"),
  year: integer("year"),
  relevantSequences: text("relevant_sequences").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Experimental validation data
export const experimentalData = pgTable("experimental_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequence: text("sequence").notNull(),
  mhcAllele: text("mhc_allele").notNull(),
  experimentalAffinity: real("experimental_affinity"),
  assayType: text("assay_type"),
  source: text("source"),
  userId: varchar("user_id").notNull(),
  predictionId: varchar("prediction_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Model performance tracking
export const modelMetrics = pgTable("model_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  modelName: text("model_name").notNull(),
  metric: text("metric").notNull(), // accuracy, sensitivity, specificity, auc
  value: real("value").notNull(),
  dataset: text("dataset").notNull(),
  evaluatedAt: timestamp("evaluated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPredictionSchema = createInsertSchema(predictions).omit({
  id: true,
  createdAt: true,
});

export const insertSystemStatusSchema = createInsertSchema(systemStatus).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type SystemStatus = typeof systemStatus.$inferSelect;
export type InsertSystemStatus = z.infer<typeof insertSystemStatusSchema>;

// API schemas
export const predictRequestSchema = z.object({
  sequence: z.string().min(1).max(15).regex(/^[ACDEFGHIKLMNPQRSTVWY]+$/, "Invalid amino acid sequence"),
  model: z.enum(["cnn", "bilstm", "cnn_bilstm_best", "cnn_bilstm", "transformer"]),
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

export type PredictRequest = z.infer<typeof predictRequestSchema>;
export type PredictResponse = z.infer<typeof predictResponseSchema>;

// Relations
export const projectsRelations = relations(projects, ({ many, one }) => ({
  batchJobs: many(batchJobs),
  collaborators: many(projectCollaborators),
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
}));

export const batchJobsRelations = relations(batchJobs, ({ one }) => ({
  project: one(projects, {
    fields: [batchJobs.projectId],
    references: [projects.id],
  }),
}));

export const predictionsRelations = relations(predictions, ({ many }) => ({
  annotations: many(sequenceAnnotations),
  experimentalData: many(experimentalData),
}));

export const sequenceAnnotationsRelations = relations(sequenceAnnotations, ({ one }) => ({
  prediction: one(predictions, {
    fields: [sequenceAnnotations.predictionId],
    references: [predictions.id],
  }),
  user: one(users, {
    fields: [sequenceAnnotations.userId],
    references: [users.id],
  }),
}));

// Additional insert schemas for new tables
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBatchJobSchema = createInsertSchema(batchJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertMutationAnalysisSchema = createInsertSchema(mutationAnalysis).omit({
  id: true,
  createdAt: true,
});

export const insertDesignSuggestionSchema = createInsertSchema(designSuggestions).omit({
  id: true,
  createdAt: true,
});

// Additional types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type BatchJob = typeof batchJobs.$inferSelect;
export type InsertBatchJob = z.infer<typeof insertBatchJobSchema>;
export type MutationAnalysis = typeof mutationAnalysis.$inferSelect;
export type InsertMutationAnalysis = z.infer<typeof insertMutationAnalysisSchema>;
export type DesignSuggestion = typeof designSuggestions.$inferSelect;
export type InsertDesignSuggestion = z.infer<typeof insertDesignSuggestionSchema>;

// New API schemas
export const batchUploadSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  models: z.array(z.enum(["cnn", "bilstm", "cnn_bilstm_best", "cnn_bilstm", "transformer"])),
  sequences: z.array(z.string().regex(/^[ACDEFGHIKLMNPQRSTVWY]+$/)),
});

export const mutationRequestSchema = z.object({
  sequence: z.string().regex(/^[ACDEFGHIKLMNPQRSTVWY]+$/),
  position: z.number().min(0),
  newAminoAcid: z.string().length(1).regex(/^[ACDEFGHIKLMNPQRSTVWY]$/),
  model: z.enum(["cnn", "bilstm", "cnn_bilstm_best", "cnn_bilstm", "transformer"]),
});

export const designRequestSchema = z.object({
  targetMhc: z.string(),
  length: z.number().min(8).max(15),
  strategy: z.enum(["optimize_binding", "maximize_immunogenicity", "minimize_toxicity"]),
});

export type BatchUploadRequest = z.infer<typeof batchUploadSchema>;
export type MutationRequest = z.infer<typeof mutationRequestSchema>;
export type DesignRequest = z.infer<typeof designRequestSchema>;
