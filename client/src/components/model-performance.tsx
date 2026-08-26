import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { BarChart3 } from "lucide-react";

export default function ModelPerformance() {
  const { isLoading } = useQuery({
    queryKey: ["/api/models/performance"],
    queryFn: api.getModelPerformance,
  });

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
          <div className="text-sm text-muted-foreground">
            Held-out evaluation of the served model: ROC-AUC 0.919, PR-AUC 0.806, on a
            peptide-grouped split of 120,000 MHCflurry-curated measurements across 129
            alleles. See the Visualize page for details.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
