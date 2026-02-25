import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { PredictResponse } from "@shared/schema";

interface PredictionResultsProps {
  results: PredictResponse;
}

export default function PredictionResults({ results }: PredictionResultsProps) {
  const probabilityPercentage = (results.probability * 100).toFixed(1);

  return (
    <Card className="card-shadow" data-testid="card-prediction-results">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Prediction Results</h2>
          </div>
          <div className="text-xs text-muted-foreground">
            Computed in <span className="font-medium" data-testid="text-compute-time">{results.computeTime}</span>
          </div>
        </div>

        <div className="prediction-card rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-primary mb-1" data-testid="text-probability">
                {results.probability.toFixed(4)}
              </div>
              <div className="text-sm text-muted-foreground">Binding Probability</div>
              <div className="mt-2">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="progress-bar h-2 rounded-full" 
                    style={{ width: `${probabilityPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-2xl font-bold text-accent mb-1" data-testid="text-confidence">
                {results.confidence}%
              </div>
              <div className="text-sm text-muted-foreground">Confidence</div>
              <div className="text-xs text-accent mt-1">
                {results.confidence >= 90 ? 'High Reliability' : 'Medium Reliability'}
              </div>
            </div>

            <div>
              <div className="text-2xl font-bold text-secondary mb-1" data-testid="text-rank">
                {results.rank}
              </div>
              <div className="text-sm text-muted-foreground">Binding Strength</div>
              <div className="text-xs text-secondary mt-1">
                {results.rank === 'Strong' ? 'IC50 < 500 nM' : 
                 results.rank === 'Moderate' ? 'IC50 500-5000 nM' : 
                 'IC50 > 5000 nM'}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Sequence Analysis</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sequence:</span>
                <span className="font-mono text-primary" data-testid="text-sequence">
                  {results.sequence}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Length:</span>
                <span data-testid="text-length">{results.sequence.length} AA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model Used:</span>
                <span data-testid="text-model">{results.model}</span>
              </div>
              {results.mhcAllele && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MHC Allele:</span>
                  <span data-testid="text-mhc-allele">{results.mhcAllele}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Model Metrics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Training Accuracy:</span>
                <span data-testid="text-training-accuracy">{results.trainingAcc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Validation AUC:</span>
                <span data-testid="text-validation-auc">{results.validationAuc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Test Sensitivity:</span>
                <span data-testid="text-sensitivity">{results.sensitivity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Test Specificity:</span>
                <span data-testid="text-specificity">{results.specificity}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Model trained on IEDB dataset (v2023.1) • 180k sequences</span>
            <span>Last updated: 2 days ago</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
