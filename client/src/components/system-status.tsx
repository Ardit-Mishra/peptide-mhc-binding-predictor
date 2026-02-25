import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Server } from "lucide-react";

interface SystemStatusProps {
  compact?: boolean;
}

export default function SystemStatus({ compact = false }: SystemStatusProps) {
  const { data: status, isLoading } = useQuery({
    queryKey: ["/api/system-status"],
    queryFn: api.getSystemStatus,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <span 
          className={`status-indicator ${
            status?.googleDriveConnected ? 'status-online' : 'status-offline'
          }`}
          data-testid="status-indicator-drive"
        />
        <span className="text-muted-foreground" data-testid="text-drive-status">
          {isLoading ? "Checking..." : 
           status?.googleDriveConnected ? "Google Drive Connected" : "Google Drive Offline"}
        </span>
      </div>
    );
  }

  return (
    <Card className="card-shadow" data-testid="card-system-status">
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Server className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">System Status</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Google Drive API</span>
              <div className="flex items-center space-x-2">
                <span 
                  className={`status-indicator ${
                    status?.googleDriveConnected ? 'status-online' : 'status-offline'
                  }`}
                />
                <span className={`text-xs ${
                  status?.googleDriveConnected ? 'text-accent' : 'text-destructive'
                }`} data-testid="text-drive-api-status">
                  {status?.googleDriveConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Models Loaded</span>
              <div className="flex items-center space-x-2">
                <span className={`status-indicator ${
                  (status?.modelsLoaded || 0) >= 5 ? 'status-online' : 'status-offline'
                }`} />
                <span className="text-xs text-accent" data-testid="text-models-cached">
                  {status?.modelsLoaded || 0}/5 Ready
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dataset Access</span>
              <div className="flex items-center space-x-2">
                <span className={`status-indicator ${
                  status?.datasetAccessible ? 'status-online' : 'status-offline'
                }`} />
                <span className={`text-xs ${
                  status?.datasetAccessible ? 'text-accent' : 'text-destructive'
                }`} data-testid="text-dataset-access">
                  {status?.datasetAccessible ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-xs text-muted-foreground space-y-1">
                <div data-testid="text-last-sync">
                  Last sync: {
                    status?.lastSync 
                      ? new Date(status.lastSync).toLocaleString()
                      : 'Never'
                  }
                </div>
                <div data-testid="text-cache-size">
                  Cache size: {status?.cacheSize || 0} MB
                </div>
                <div data-testid="text-predictions-today">
                  Predictions today: {status?.predictionsToday || 0}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
