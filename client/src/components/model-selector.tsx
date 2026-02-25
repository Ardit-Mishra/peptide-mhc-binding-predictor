import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Brain, Layers, ArrowRightLeft, GitBranch, Cpu, Zap } from "lucide-react";

interface ModelSelectorProps {
  selectedModel: string;
  onModelSelect: (model: string) => void;
}

const modelIcons = {
  cnn: Layers,
  bilstm: ArrowRightLeft,
  cnn_bilstm_best: Zap,
  cnn_bilstm: Cpu,
  transformer: GitBranch,
};

export default function ModelSelector({ selectedModel, onModelSelect }: ModelSelectorProps) {
  const { data: performance, isLoading } = useQuery({
    queryKey: ["/api/models/performance"],
    queryFn: () => api.getModelPerformance(),
  });

  if (isLoading) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Model Selection</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 rounded-lg border border-border animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const models = [
    {
      key: 'cnn',
      name: 'CNN',
      description: 'Fast pattern recognition with convolutional layers. Use for: Quick screening of large peptide libraries, real-time predictions, when speed is priority.',
      data: performance?.cnn,
    },
    {
      key: 'bilstm',
      name: 'BiLSTM',
      description: 'Captures sequence dependencies in both directions. Use for: Novel peptide sequences, analyzing amino acid context, when sequence order matters.',
      data: performance?.bilstm,
    },
    {
      key: 'cnn_bilstm_best',
      name: 'CNN+BiLSTM Best',
      description: 'Highest accuracy hybrid model. Use for: Critical research decisions, publication-quality results, when maximum accuracy is essential.',
      data: performance?.cnn_bilstm_best,
    },
    {
      key: 'cnn_bilstm',
      name: 'CNN+BiLSTM',
      description: 'Balanced hybrid approach. Use for: General research, balanced speed/accuracy needs, diverse peptide sets, everyday predictions.',
      data: performance?.cnn_bilstm,
    },
    {
      key: 'transformer',
      name: 'Transformer',
      description: 'State-of-the-art self-attention mechanism. Use for: Complex peptides, cross-allele comparisons, cutting-edge research applications.',
      data: performance?.transformer,
    },
  ];

  return (
    <Card className="card-shadow" data-testid="card-model-selector">
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Model Selection</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {models.map((model) => {
            const Icon = modelIcons[model.key as keyof typeof modelIcons];
            const isActive = selectedModel === model.key;
            const isLoaded = model.data?.loaded;

            return (
              <div
                key={model.key}
                className={`model-tab p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isActive 
                    ? 'border-primary bg-primary text-primary-foreground active' 
                    : 'border-border hover:border-primary'
                }`}
                onClick={() => onModelSelect(model.key)}
                data-testid={`model-tab-${model.key}`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Icon className="w-4 h-4" />
                  <h3 className="font-medium">{model.name}</h3>
                  {!isLoaded && (
                    <div className="w-2 h-2 rounded-full bg-destructive" title="Model not loaded" />
                  )}
                </div>
                <p className={`text-xs mb-2 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {model.description}
                </p>
                {model.data && (
                  <div className="mt-2 text-xs">
                    <div className="flex justify-between">
                      <span>Accuracy:</span>
                      <span className="font-medium">{model.data.accuracy}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Speed:</span>
                      <span className="font-medium">{model.data.speed}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
