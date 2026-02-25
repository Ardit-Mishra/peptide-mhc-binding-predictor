import { 
  type User, 
  type InsertUser, 
  type Prediction, 
  type InsertPrediction, 
  type SystemStatus, 
  type InsertSystemStatus,
  type Project,
  type InsertProject,
  type BatchJob,
  type InsertBatchJob,
  type MutationAnalysis,
  type InsertMutationAnalysis
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  getPredictionsByDate(date: Date): Promise<Prediction[]>;
  
  getSystemStatus(): Promise<SystemStatus | undefined>;
  updateSystemStatus(status: InsertSystemStatus): Promise<SystemStatus>;

  // Project management
  getProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;

  // Batch processing
  createBatchJob(job: InsertBatchJob): Promise<BatchJob>;
  getBatchJobs(): Promise<BatchJob[]>;
  updateBatchJobProgress(id: string, processed: number): Promise<void>;
  completeBatchJob(id: string, results: any): Promise<void>;

  // Analysis
  createMutationAnalysis(analysis: InsertMutationAnalysis): Promise<MutationAnalysis>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private predictions: Map<string, Prediction>;
  private projects: Map<string, Project>;
  private batchJobs: Map<string, BatchJob>;
  private mutationAnalyses: Map<string, MutationAnalysis>;
  private systemStatus: SystemStatus | undefined;

  constructor() {
    this.users = new Map();
    this.predictions = new Map();
    this.projects = new Map();
    this.batchJobs = new Map();
    this.mutationAnalyses = new Map();
    
    // Initialize default system status
    this.systemStatus = {
      id: randomUUID(),
      googleDriveConnected: false,
      modelsLoaded: 0,
      datasetAccessible: false,
      lastSync: null,
      cacheSize: 0,
      predictionsToday: 0,
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createPrediction(insertPrediction: InsertPrediction): Promise<Prediction> {
    const id = randomUUID();
    const prediction: Prediction = {
      ...insertPrediction,
      id,
      mhcAllele: insertPrediction.mhcAllele || null,
      createdAt: new Date(),
    };
    this.predictions.set(id, prediction);
    return prediction;
  }

  async getPredictionsByDate(date: Date): Promise<Prediction[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.predictions.values()).filter(
      (prediction) => 
        prediction.createdAt && 
        prediction.createdAt >= startOfDay && 
        prediction.createdAt <= endOfDay
    );
  }

  async getSystemStatus(): Promise<SystemStatus | undefined> {
    return this.systemStatus;
  }

  async updateSystemStatus(status: InsertSystemStatus): Promise<SystemStatus> {
    if (this.systemStatus) {
      this.systemStatus = { ...this.systemStatus, ...status };
    } else {
      this.systemStatus = {
        id: randomUUID(),
        googleDriveConnected: status.googleDriveConnected ?? false,
        modelsLoaded: status.modelsLoaded ?? 0,
        datasetAccessible: status.datasetAccessible ?? false,
        lastSync: status.lastSync ?? null,
        cacheSize: status.cacheSize ?? 0,
        predictionsToday: status.predictionsToday ?? 0,
      };
    }
    return this.systemStatus;
  }

  // Project management methods
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      ...insertProject,
      description: insertProject.description ?? null,
      isPublic: insertProject.isPublic ?? false,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }

  // Batch processing methods
  async createBatchJob(insertJob: InsertBatchJob): Promise<BatchJob> {
    const id = randomUUID();
    const job: BatchJob = {
      ...insertJob,
      status: insertJob.status ?? "pending",
      totalSequences: insertJob.totalSequences ?? 0,
      processedSequences: insertJob.processedSequences ?? 0,
      uploadedFile: insertJob.uploadedFile ?? null,
      id,
      results: null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.batchJobs.set(id, job);
    return job;
  }

  async getBatchJobs(): Promise<BatchJob[]> {
    return Array.from(this.batchJobs.values()).sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  async updateBatchJobProgress(id: string, processed: number): Promise<void> {
    const job = this.batchJobs.get(id);
    if (job) {
      job.processedSequences = processed;
      if (processed >= job.totalSequences) {
        job.status = "completed";
        job.completedAt = new Date();
      } else {
        job.status = "running";
      }
      this.batchJobs.set(id, job);
    }
  }

  async completeBatchJob(id: string, results: any): Promise<void> {
    const job = this.batchJobs.get(id);
    if (job) {
      job.status = "completed";
      job.results = results;
      job.completedAt = new Date();
      this.batchJobs.set(id, job);
    }
  }

  // Analysis methods
  async createMutationAnalysis(insertAnalysis: InsertMutationAnalysis): Promise<MutationAnalysis> {
    const id = randomUUID();
    const analysis: MutationAnalysis = {
      ...insertAnalysis,
      id,
      createdAt: new Date(),
    };
    this.mutationAnalyses.set(id, analysis);
    return analysis;
  }
}

export const storage = new MemStorage();
