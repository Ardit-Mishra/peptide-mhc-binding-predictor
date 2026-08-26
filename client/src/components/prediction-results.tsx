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

            {/* Training support, not a confidence interval. The model does not
                produce an uncertainty estimate, so showing how much data backs
                this allele is the honest stand-in: a prediction resting on 200
                measurements deserves less weight than one resting on 14,000. */}
            <div>
              <div className="text-2xl font-bold text-accent mb-1" data-testid="text-allele-support">
                {results.alleleSupportN != null
                  ? results.alleleSupportN.toLocaleString()
                  : "—"}
              </div>
              <div className="text-sm text-muted-foreground">Training measurements</div>
              <div className="text-xs text-muted-foreground mt-1">
                for {results.mhcAllele ?? "this allele"}
              </div>
            </div>

            <div>
              <div className="text-2xl font-bold text-secondary mb-1" data-testid="text-rank">
                {results.rank}
              </div>
              <div className="text-sm text-muted-foreground">Binding Strength</div>
              {/* The model outputs P(IC50 < 500 nM); it does not predict an IC50
                  value. These bands describe that probability. The previous copy
                  quoted nM affinity ranges the model never estimates. */}
              <div className="text-xs text-secondary mt-1">
                {results.rank === 'Strong' ? 'p > 0.8 that IC50 < 500 nM' :
                 results.rank === 'Moderate' ? 'p 0.5-0.8 that IC50 < 500 nM' :
                 'p < 0.5 that IC50 < 500 nM'}
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
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Trained on:</span>
                <span className="text-right" data-testid="text-training-data">{results.trainingAcc}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Held-out score:</span>
                <span className="text-right" data-testid="text-validation-auc">{results.validationAuc}</span>
              </div>
              {/* The model emits a probability, not a call, so there is no fixed
                  operating point and therefore no sensitivity/specificity pair. */}
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Operating point:</span>
                <span className="text-right" data-testid="text-sensitivity">{results.sensitivity}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Trained-model output — XGBoost over a one-hot peptide and MHC allele
            pseudo-sequence, held-out ROC-AUC 0.919. Research and educational use
            only; not a clinical or diagnostic result.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
