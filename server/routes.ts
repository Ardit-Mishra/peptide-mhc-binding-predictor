import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { googleDriveService } from "./services/google-drive";
import { modelLoader } from "./services/model-loader";
import { 
  predictRequestSchema, 
  predictResponseSchema, 
  batchUploadSchema,
  mutationRequestSchema,
  designRequestSchema,
  insertProjectSchema,
  type PredictRequest, 
  type PredictResponse,
  type BatchUploadRequest,
  type MutationRequest,
  type DesignRequest
} from "@shared/schema";
import { illustrativeScore, ILLUSTRATIVE_DISCLAIMER, OFFLINE_MODEL_EVALUATION } from "./lib/illustrative-scorer";

// HONESTY NOTE: This app does not serve a trained peptide-MHC binding
// model. Every "model" name below is a UI-selectable demo slot; all of
// them route through the same deterministic illustrative scorer in
// ./lib/illustrative-scorer.ts. None of the numbers surfaced from these
// endpoints should be read as a real trained model's performance.
const DEMO_MODEL_LABELS: Record<string, string> = {
  cnn: "Illustrative Demo Scorer (CNN slot — no trained model)",
  bilstm: "Illustrative Demo Scorer (BiLSTM slot — no trained model)",
  cnn_bilstm_best: "Illustrative Demo Scorer (CNN+BiLSTM Best slot — no trained model)",
  cnn_bilstm: "Illustrative Demo Scorer (CNN+BiLSTM slot — no trained model)",
  transformer: "Illustrative Demo Scorer (Transformer slot — no trained model)",
};

// No trained model exists, so there are no real per-prediction training/
// validation statistics to report. These honest placeholder strings are
// used for every demo slot -- never fabricated per-model numbers.
const NO_TRAINED_MODEL_METRICS = {
  trainingAcc: "N/A (illustrative demo — no trained model)",
  validationAuc:
    "N/A (offline eval of a separate model being integrated: XGBoost ROC-AUC 0.919 / ESM-2+LoRA ROC-AUC 0.922 — not this app's output)",
  sensitivity: "N/A (illustrative demo — no trained model)",
  specificity: "N/A (illustrative demo — no trained model)",
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize models asynchronously in the background with timeout protection
  // Don't block server startup on model loading
  const initializeModels = async () => {
    const maxInitTime = 4 * 60 * 1000; // 4 minutes max for model loading
    const startTime = Date.now();
    
    try {
      console.log("Starting background model initialization...");
      console.log("Deployment phase: MODEL_LOADING_STARTED");
      
      // Add timeout to prevent deployment hanging
      const modelLoadingPromise = modelLoader.loadAllModels();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Model loading timeout")), maxInitTime);
      });
      
      await Promise.race([modelLoadingPromise, timeoutPromise]);
      
      const loadTime = Math.round((Date.now() - startTime) / 1000);
      console.log(`All models loaded successfully in ${loadTime}s`);
      console.log("Deployment phase: MODEL_LOADING_COMPLETED");
      
      // Initialize system status with correct values
      const driveConnected = googleDriveService.getConnectionStatus();
      const modelsLoaded = modelLoader.getLoadedModelsCount();
      const cacheSize = modelLoader.getCacheSize();
      
      await storage.updateSystemStatus({
        googleDriveConnected: driveConnected,
        modelsLoaded,
        datasetAccessible: true, // Models are loaded locally
        lastSync: new Date(),
        cacheSize: Math.floor(cacheSize / 1024 / 1024), // Convert to MB
        predictionsToday: 0,
      });
      
      console.log("Models initialization completed successfully");
      console.log("Deployment phase: FULLY_OPERATIONAL");
      
      // Signal readiness for production deployments
      if (process.env.NODE_ENV === 'production') {
        console.log("PRODUCTION_READY: All models loaded and service is operational");
      }
    } catch (error) {
      const loadTime = Math.round((Date.now() - startTime) / 1000);
      console.error(`Failed to initialize models after ${loadTime}s:`, error);
      console.log("Deployment phase: MODEL_LOADING_FAILED");
      
      // Update status to reflect partial availability
      await storage.updateSystemStatus({
        googleDriveConnected: false,
        modelsLoaded: modelLoader.getLoadedModelsCount(),
        datasetAccessible: false,
        lastSync: null,
        cacheSize: 0,
        predictionsToday: 0,
      });
      
      // Continue running server even if models fail to load
      console.log("Server continuing with limited functionality");
    }
  };

  // Start model loading in background - don't await here
  initializeModels();

  // Initialize basic system status immediately
  try {
    await storage.updateSystemStatus({
      googleDriveConnected: false,
      modelsLoaded: 0,
      datasetAccessible: false,
      lastSync: null,
      cacheSize: 0,
      predictionsToday: 0,
    });
  } catch (error) {
    console.error("Failed to initialize basic system status:", error);
  }

  // Enhanced health check endpoint for deployment verification
  app.get("/api/health", async (req, res) => {
    try {
      const systemStatus = await storage.getSystemStatus();
      const driveConnected = googleDriveService.getConnectionStatus();
      const modelsLoaded = modelLoader.getLoadedModelsCount();
      const cacheSize = modelLoader.getCacheSize();
      // Demo scorer slots (cnn, bilstm, cnn_bilstm_best, cnn_bilstm, transformer).
      // None of these are trained models -- see ILLUSTRATIVE_DISCLAIMER.
      const totalModels = 5;

      // Update system status
      await storage.updateSystemStatus({
        googleDriveConnected: driveConnected,
        modelsLoaded,
        datasetAccessible: driveConnected,
        lastSync: driveConnected ? new Date() : null,
        cacheSize: Math.floor(cacheSize / 1024 / 1024), // Convert to MB
        predictionsToday: systemStatus?.predictionsToday || 0,
      });

      // Enhanced deployment readiness check
      const isHealthy = modelsLoaded >= totalModels;
      const isReady = isHealthy && process.uptime() > 10; // Allow 10 seconds for full initialization
      const httpStatus = isReady ? 200 : isHealthy ? 202 : 503; // 202 = Accepted (still loading), 503 = Service Unavailable

      res.status(httpStatus).json({
        status: isReady ? "ready" : isHealthy ? "initializing" : "starting",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        ready: isReady,
        disclaimer: ILLUSTRATIVE_DISCLAIMER,
        deployment: {
          ready: isReady,
          phase: isReady ? "operational" : isHealthy ? "demo_slots_ready" : "starting",
          message: isReady ? "Service is up and serving illustrative demo scores" :
                   isHealthy ? "Demo scorer slots ready, finalizing initialization" :
                   "Service is starting up",
        },
        memory: {
          used: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
        },
        models: {
          note: "These are UI-selectable demo scorer slots, not trained models.",
          loaded: modelsLoaded,
          total: totalModels,
          ready: isHealthy,
          percentage: Math.round((modelsLoaded / totalModels) * 100),
        },
        services: {
          googleDriveConnected: driveConnected,
          datasetAccessible: driveConnected,
          cacheSize: Math.floor(cacheSize / 1024 / 1024),
        },
        environment: process.env.NODE_ENV || 'development',
      });
    } catch (error: any) {
      console.error("Health check error:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
        timestamp: new Date().toISOString(),
        ready: false,
        deployment: {
          ready: false,
          phase: "error",
          message: "Health check failed",
        },
      });
    }
  });

  // Additional deployment-specific health checks
  app.get("/health", async (req, res) => {
    // Simple health check without authentication - deployment services often use this
    try {
      res.status(200).json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        service: "peptide-mhc-predictor" 
      });
    } catch (error) {
      res.status(500).json({ status: "error" });
    }
  });

  // System status endpoint
  app.get("/api/system-status", async (req, res) => {
    try {
      const status = await storage.getSystemStatus();
      if (!status) {
        return res.status(404).json({ message: "System status not found" });
      }
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get system status" });
    }
  });

  // Model performance endpoint
  //
  // HONESTY NOTE: This project does not currently serve any trained model,
  // so there is no real per-architecture accuracy/AUC to report. This
  // endpoint used to return a fabricated leaderboard (invented, inconsistent
  // numbers per "model"); it now returns only the demo slots (clearly
  // labeled as non-trained) plus the one real, honest number this project
  // has -- from OFFLINE evaluation of a different model being integrated
  // separately.
  app.get("/api/models/performance", async (req, res) => {
    try {
      res.json({
        disclaimer: ILLUSTRATIVE_DISCLAIMER,
        offlineEvaluation: OFFLINE_MODEL_EVALUATION,
        demoSlots: modelLoader.getModelMetadata().map((slot) => ({
          key: slot.key,
          name: slot.name,
          trained: false,
          loaded: modelLoader.isModelLoaded(slot.key),
        })),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get model performance" });
    }
  });

  // Prediction endpoint
  app.post("/api/predict", async (req, res) => {
    try {
      const validatedData = predictRequestSchema.parse(req.body);
      const { sequence, model: modelName, mhcAllele } = validatedData;

      const startTime = Date.now();

      // Load the demo slot if not already loaded. No trained weights are
      // ever loaded here -- see modelLoader's HONESTY NOTE.
      const model = await modelLoader.loadModel(modelName);
      if (!model) {
        return res.status(400).json({ message: `Model ${modelName} not available` });
      }

      // Run the illustrative demo scorer (deterministic, not a trained model)
      const { probability, confidence } = await model.predict(sequence);

      const computeTime = ((Date.now() - startTime) / 1000).toFixed(2);

      // Determine binding strength
      let rank = "Weak";
      if (probability > 0.8) rank = "Strong";
      else if (probability > 0.5) rank = "Moderate";

      // No allele auto-detection exists; this is a fixed fallback, not detection.
      const defaultMhcAllele = mhcAllele || "HLA-A*02:01";

      const response: PredictResponse = {
        sequence,
        model: DEMO_MODEL_LABELS[modelName] ?? `Illustrative Demo Scorer (${modelName} slot)`,
        probability: parseFloat(probability.toFixed(4)),
        confidence: parseFloat((confidence * 100).toFixed(1)),
        rank,
        computeTime: `${computeTime}s`,
        ...NO_TRAINED_MODEL_METRICS,
        mhcAllele: defaultMhcAllele,
      };

      // Store prediction in memory
      await storage.createPrediction({
        sequence,
        model: modelName,
        probability,
        confidence,
        mhcAllele: defaultMhcAllele,
        computeTime: parseFloat(computeTime),
      });

      // Update predictions count
      const currentStatus = await storage.getSystemStatus();
      if (currentStatus) {
        const todaysPredictions = await storage.getPredictionsByDate(new Date());
        await storage.updateSystemStatus({
          ...currentStatus,
          predictionsToday: todaysPredictions.length,
        });
      }

      res.json(response);
    } catch (error) {
      console.error("Prediction error:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid request data", details: error.message });
      } else {
        res.status(500).json({ message: "Prediction failed" });
      }
    }
  });

  // Recent activity endpoint
  app.get("/api/recent-activity", async (req, res) => {
    try {
      const activities = [];
      const status = await storage.getSystemStatus();

      if (status?.lastSync) {
        const timeSince = Math.floor((Date.now() - status.lastSync.getTime()) / 1000 / 60);
        activities.push({
          id: '1',
          message: 'Dataset synchronized',
          timestamp: `${timeSince} minutes ago`,
          type: 'sync'
        });
      }

      activities.push(
        {
          id: '2',
          message: 'Model cache updated',
          timestamp: '2 minutes ago',
          type: 'cache'
        },
        {
          id: '3',
          message: 'New prediction completed',
          timestamp: '1 hour ago',
          type: 'prediction'
        }
      );

      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recent activity" });
    }
  });

  // Batch Processing Endpoints
  app.post("/api/batch/create", async (req, res) => {
    try {
      const validatedData = batchUploadSchema.parse(req.body);
      
      // Create batch job
      const batchJob = await storage.createBatchJob({
        projectId: validatedData.projectId,
        name: validatedData.name,
        models: validatedData.models,
        totalSequences: validatedData.sequences.length,
        processedSequences: 0,
        status: "pending",
      });

      // Process in background. Each sequence gets a real (if illustrative,
      // non-trained) deterministic score via illustrativeScore -- no more
      // fake delay-then-string-literal "Mock results".
      setTimeout(async () => {
        const results: Array<{ sequence: string; probability: number; confidence: number }> = [];
        for (let i = 0; i < validatedData.sequences.length; i++) {
          const sequence = validatedData.sequences[i];
          results.push({ sequence, ...illustrativeScore(sequence) });
          await storage.updateBatchJobProgress(batchJob.id, i + 1);
        }
        await storage.completeBatchJob(batchJob.id, {
          disclaimer: ILLUSTRATIVE_DISCLAIMER,
          results,
        });
      }, 1000);

      res.json(batchJob);
    } catch (error) {
      console.error("Batch creation error:", error);
      res.status(500).json({ message: "Failed to create batch job" });
    }
  });

  app.get("/api/batch/jobs", async (req, res) => {
    try {
      const jobs = await storage.getBatchJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get batch jobs" });
    }
  });

  // Analysis Endpoints
  app.post("/api/analysis/mutation", async (req, res) => {
    try {
      const validatedData = mutationRequestSchema.parse(req.body);
      
      // Get both original and mutated predictions
      const originalPrediction = await getPrediction(validatedData.sequence, validatedData.model);
      
      // Create mutated sequence
      const mutatedSequence = validatedData.sequence.split('');
      mutatedSequence[validatedData.position] = validatedData.newAminoAcid;
      const mutatedSeq = mutatedSequence.join('');
      
      const mutatedPrediction = await getPrediction(mutatedSeq, validatedData.model);
      
      const impactScore = mutatedPrediction.probability - originalPrediction.probability;
      
      // Store mutation analysis
      const analysis = await storage.createMutationAnalysis({
        originalSequence: validatedData.sequence,
        mutatedSequence: mutatedSeq,
        position: validatedData.position,
        originalAA: validatedData.sequence[validatedData.position],
        mutatedAA: validatedData.newAminoAcid,
        impactScore,
        model: validatedData.model,
        userId: "user-1", // TODO: Get from auth
      });

      res.json({
        ...analysis,
        originalPrediction,
        mutatedPrediction,
      });
    } catch (error) {
      console.error("Mutation analysis error:", error);
      res.status(500).json({ message: "Mutation analysis failed" });
    }
  });

  // Peptide Design Endpoints
  app.post("/api/design/generate", async (req, res) => {
    try {
      const validatedData = designRequestSchema.parse(req.body);
      
      // Mock peptide design - in reality this would use sophisticated algorithms
      const suggestions = await generatePeptideDesigns(validatedData);
      
      res.json({ suggestions });
    } catch (error) {
      console.error("Peptide design error:", error);
      res.status(500).json({ message: "Peptide design failed" });
    }
  });

  // Project Management Endpoints
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to get projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.json(project);
    } catch (error) {
      console.error("Project creation error:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Visualization Data Endpoints
  //
  // HONESTY NOTE: This used to return entirely invented, internally
  // inconsistent per-"model" numbers (a different fabricated accuracy set
  // than getMetrics() used elsewhere) plus fake distribution/sequence-length
  // histograms with no dataset behind them. There is no live evaluation
  // dataset wired up, so this now returns only the one real, honest
  // evaluation this project has (from a separate model being integrated).
  app.get("/api/visualize/data/:dataset/:metric", async (req, res) => {
    try {
      res.json({
        disclaimer:
          "No live evaluation dataset or trained model is wired up in this app. " +
          "The only real numbers below are from offline evaluation of a separate model being integrated.",
        offlineEvaluation: OFFLINE_MODEL_EVALUATION,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get visualization data" });
    }
  });

  async function getPrediction(sequence: string, modelName: string) {
    if (!DEMO_MODEL_LABELS[modelName]) {
      throw new Error(`Model ${modelName} not found`);
    }

    const startTime = Date.now();
    const { probability, confidence } = illustrativeScore(sequence);
    const computeTime = Date.now() - startTime;

    return {
      sequence,
      model: modelName,
      probability,
      confidence,
      rank: probability > 0.8 ? "High Binder" : probability > 0.5 ? "Medium Binder" : "Low Binder",
      computeTime,
      ...NO_TRAINED_MODEL_METRICS,
    };
  }

  async function generatePeptideDesigns(request: DesignRequest) {
    // HONESTY NOTE: This is a uniformly random sequence generator, not an
    // AI-driven design/optimization algorithm. `request.strategy` is
    // recorded but does not influence generation or scoring in any way.
    const aminoAcids = ['A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'Y'];
    const suggestions = [];

    for (let i = 0; i < 3; i++) {
      let sequence = '';
      for (let j = 0; j < request.length; j++) {
        sequence += aminoAcids[Math.floor(Math.random() * aminoAcids.length)];
      }

      // Illustrative demo score for the randomly generated sequence.
      const prediction = await getPrediction(sequence, 'cnn_bilstm_best');

      suggestions.push({
        sequence,
        predictedAffinity: prediction.probability,
        confidence: prediction.confidence,
        designStrategy: request.strategy,
        rank: prediction.rank,
        disclaimer:
          "Random sequence generator (demo) — not a trained generative/optimization model. " +
          "The sequence is uniformly random; the score is illustrative, not from a trained model.",
      });
    }

    return suggestions.sort((a, b) => b.predictedAffinity - a.predictedAffinity);
  }


  // Database Integration Endpoints
  //
  // HONESTY NOTE: This app has no real IEDB/UniProt/PDB integration -- no
  // client for any of them exists anywhere in this codebase (only Google
  // Drive is integrated, and only for an unused .pt-file download path).
  // These endpoints previously fabricated "active" status, record counts,
  // sync timestamps, and search results pointing at example.com. They now
  // honestly report "not connected" and "not implemented" instead.
  app.get("/api/databases", async (req, res) => {
    try {
      const databases = [
        { id: "iedb", name: "IEDB", status: "not_connected", apiAvailable: false },
        { id: "uniprot", name: "UniProt", status: "not_connected", apiAvailable: false },
        { id: "pdb", name: "PDB", status: "not_connected", apiAvailable: false },
      ];
      res.json({
        disclaimer: "No external database integrations are implemented in this app yet.",
        databases,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get database status" });
    }
  });

  app.post("/api/databases/:dbId/search", async (req, res) => {
    // No IEDB/UniProt/PDB client exists in this codebase -- honestly
    // report not-implemented rather than returning fabricated results.
    res.status(501).json({
      message: "Database search is not implemented. No external database integration exists in this app.",
    });
  });

  app.post("/api/databases/:dbId/import", async (req, res) => {
    // No import pipeline exists in this codebase -- honestly report
    // not-implemented rather than returning a fabricated job object.
    res.status(501).json({
      message: "Database import is not implemented. No external database integration exists in this app.",
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
