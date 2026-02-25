import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { BarChart3 } from "lucide-react";

export default function ModelPerformance() {
  const { data: performance, isLoading } = useQuery({
    queryKey: ["/api/models/performance"],
    queryFn: api.getModelPerformance,
  });

  const models = [
    { key: 'cnn', name: 'CNN', color: 'bg-primary' },
    { key: 'bilstm', name: 'BiLSTM', color: 'bg-secondary' },
    { key: 'cnn_bilstm', name: 'CNN+BiLSTM', color: 'bg-accent' },
    { key: 'cnn_bilstm_best', name: 'CNN+BiLSTM Best', color: 'bg-green-500' },
    { key: 'transformer', name: 'Transformer', color: 'bg-purple-500' },
  ];

  return (
    <Card className="card-shadow" data-testid="card-model-performance">
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Model Performance</h2>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-muted rounded w-1/3 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {models.map((model) => {
              const modelData = performance?.[model.key];
              if (!modelData) return null;

              return (
                <div key={model.key} data-testid={`model-performance-${model.key}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {modelData.accuracy}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`${model.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${modelData.accuracy}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          Performance metrics based on validation dataset (20% holdout)
        </div>
      </CardContent>
    </Card>
  );
}
