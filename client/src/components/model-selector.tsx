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

  // HONESTY NOTE: These five "models" are UI-selectable demo slots. Every slot routes
  // through the same deterministic illustrative scorer (server/lib/illustrative-scorer.ts) --
  // none of them is a distinct trained architecture, so none has real, differing
  // accuracy/speed characteristics. The descriptions below name the archetype each slot is
  // labeled after; they do not describe a real capability difference between slots.
  const models = [
    {
      key: 'cnn',
      name: 'CNN',
      description: 'Demo slot labeled "CNN" — no trained CNN exists behind it; see disclaimer below.',
      data: performance?.cnn,
    },
    {
      key: 'bilstm',
      name: 'BiLSTM',
      description: 'Demo slot labeled "BiLSTM" — no trained BiLSTM exists behind it; see disclaimer below.',
      data: performance?.bilstm,
    },
    {
      key: 'cnn_bilstm_best',
      name: 'CNN+BiLSTM Best',
      description: 'Demo slot labeled "CNN+BiLSTM Best" — no trained hybrid model exists behind it; see disclaimer below.',
      data: performance?.cnn_bilstm_best,
    },
    {
      key: 'cnn_bilstm',
      name: 'CNN+BiLSTM',
      description: 'Demo slot labeled "CNN+BiLSTM" — no trained hybrid model exists behind it; see disclaimer below.',
      data: performance?.cnn_bilstm,
    },
    {
      key: 'transformer',
      name: 'Transformer',
      description: 'Demo slot labeled "Transformer" — no trained Transformer exists behind it; see disclaimer below.',
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

        <p className="text-xs text-muted-foreground mb-4">
          None of these slots is a trained model — all five route through the same deterministic,
          illustrative scoring heuristic. There is no real accuracy or speed difference between them.
        </p>

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
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
