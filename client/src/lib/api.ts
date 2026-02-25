import { apiRequest } from "./queryClient";
import type { PredictRequest, PredictResponse } from "@shared/schema";

export interface SystemStatus {
  id: string;
  googleDriveConnected: boolean;
  modelsLoaded: number;
  datasetAccessible: boolean;
  lastSync: string | null;
  cacheSize: number;
  predictionsToday: number;
}

export interface ModelPerformance {
  name: string;
  accuracy: number;
  validationAuc: number;
  speed: string;
  loaded: boolean;
}

export interface RecentActivity {
  id: string;
  message: string;
  timestamp: string;
  type: 'sync' | 'cache' | 'prediction';
}

export const api = {
  predict: async (data: PredictRequest): Promise<PredictResponse> => {
    const response = await apiRequest("POST", "/api/predict", data);
    return response.json();
  },

  getSystemStatus: async (): Promise<SystemStatus> => {
    const response = await apiRequest("GET", "/api/system-status");
    return response.json();
  },

  getModelPerformance: async (): Promise<Record<string, ModelPerformance>> => {
    const response = await apiRequest("GET", "/api/models/performance");
    return response.json();
  },

  getRecentActivity: async (): Promise<RecentActivity[]> => {
    const response = await apiRequest("GET", "/api/recent-activity");
    return response.json();
  },

  getHealth: async (): Promise<{ status: string; googleDriveConnected: boolean; modelsLoaded: number; cacheSize: number }> => {
    const response = await apiRequest("GET", "/api/health");
    return response.json();
  },
};
