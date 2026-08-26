import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Brain, Layers, ArrowRightLeft, GitBranch, Cpu, Zap } from "lucide-react";

interface ModelSelectorProps {
  selectedModel: string;
  onModelSelect: (model: string) => void;
}

const modelIcons = {
  xgb_pseudoseq: Layers,
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

  // One entry, because one trained model exists. The app previously showed five
  // architecture slots (CNN, BiLSTM, Transformer, ...) that all called the same
  // placeholder function; they were removed rather than relabelled.
  const models = [
    {
      key: 'xgb_pseudoseq',
      name: 'XGBoost + allele pseudo-sequence',
      description:
        'Gradient-boosted trees over a one-hot peptide and the 34-residue MHC allele ' +
        'pseudo-sequence, trained on MHCflurry-curated binding affinities.',
      data: performance?.xgb_pseudoseq,
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
          Held-out ROC-AUC 0.919 / PR-AUC 0.806 on a peptide-grouped split of 120,000
          measurements across 129 alleles — no peptide appears in both training and test.
          Inference runs in your browser; nothing is sent to a server.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
