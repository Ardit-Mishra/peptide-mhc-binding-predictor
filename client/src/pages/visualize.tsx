import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Info } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { downloadPredictionHistory, type PredictionHistoryRecord } from "@/lib/prediction-export";

export default function Visualization() {
  // Held-out evaluation of the model this app actually serves.
  const heldOutEval = [
    { model: 'XGBoost + allele pseudo-seq', rocAuc: 0.9188, prAuc: 0.8085 },
  ];

  // Charts below are built from predictions made in THIS browser. With no
  // history yet they render empty rather than showing invented numbers.
  const { data: predictions = [] } = useQuery<PredictionHistoryRecord[]>({
    queryKey: ["/api/predictions"],
  });

  const predictionDistribution = useMemo(() => {
    const bins = [
      { range: '0.0-0.2', count: 0 }, { range: '0.2-0.4', count: 0 },
      { range: '0.4-0.6', count: 0 }, { range: '0.6-0.8', count: 0 },
      { range: '0.8-1.0', count: 0 },
    ];
    for (const p of predictions) {
      bins[Math.min(4, Math.floor(p.probability * 5))].count++;
    }
    return bins;
  }, [predictions]);

  const sequenceLength = useMemo(() => {
    const counts = new Map<number, number>();
    for (const p of predictions) {
      counts.set(p.sequence.length, (counts.get(p.sequence.length) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a - b)
      .map(([length, count]) => ({ length, count }));
  }, [predictions]);


  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-24 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6 pt-7">
        <div>
          <p className="instrument-label mb-2 text-[var(--ds-accent-ink)]">Browser-local evidence</p>
          <h1 className="page-title">Local prediction records</h1>
          <p className="page-subtitle">A private history from this browser; it is not a shared study dataset.</p>
        </div>
        <p className="instrument-label">No account · no server</p>
      </header>

      <Card className="workflow-panel shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Info className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              Predictions stay private to this browser. Clear browser storage to remove them.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Real held-out evaluation of the model being integrated (offline, not live app output) */}
        <Card className="workflow-panel shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Held-out model evaluation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Single held-out evaluation of the served model on a peptide-grouped,
              leak-free split — no peptide appears in both training and test.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={heldOutEval}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Bar dataKey="rocAuc" fill="var(--chart-1)" name="ROC-AUC" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Prediction Distribution */}
        <Card className="workflow-panel shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Raw score distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              {predictions.length
                ? `From ${predictions.length} prediction${predictions.length === 1 ? "" : "s"} made in this browser.`
                : "No predictions yet — run one and it will appear here."}
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={predictionDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-5)" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sequence Length Analysis */}
        <Card className="workflow-panel shadow-none lg:col-span-2">
          <CardHeader>
          <CardTitle>Peptide lengths in saved records</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              {predictions.length
                ? `Lengths of the ${predictions.length} peptide${predictions.length === 1 ? "" : "s"} scored in this browser.`
                : "No predictions yet — run one and it will appear here."}
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={sequenceLength}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="length" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="var(--chart-2)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* This is deliberately the one export the static app can prove. */}
      <Card className="workflow-panel shadow-none">
        <CardHeader>
          <CardTitle>Export these local records</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Downloads the prediction history retained in this browser. Scores are raw model outputs,
            not calibrated probabilities or clinical results.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={predictions.length === 0}
            onClick={() => downloadPredictionHistory(predictions)}
            data-testid="button-export-prediction-csv"
          >
            Download CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
