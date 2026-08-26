import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Info } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Visualization() {
  const [selectedDataset, setSelectedDataset] = useState("recent");
  const [selectedMetric, setSelectedMetric] = useState("probability");

  // Real offline held-out evaluation numbers for the model being integrated into this app.
  // These are NOT produced by the live demo — they come from offline training/evaluation
  // in a separate ML pipeline (peptide-grouped, leak-free split).
  const realHeldOutEval = [
    { model: 'XGBoost (peptide-grouped split)', rocAuc: 0.919 },
    { model: 'ESM-2 150M + LoRA', rocAuc: 0.922, prAuc: 0.827 },
  ];

  const mockPredictionDistribution = [
    { range: '0.0-0.2', count: 45, percentage: 15 },
    { range: '0.2-0.4', count: 67, percentage: 22 },
    { range: '0.4-0.6', count: 89, percentage: 30 },
    { range: '0.6-0.8', count: 72, percentage: 24 },
    { range: '0.8-1.0', count: 27, percentage: 9 },
  ];

  const mockSequenceLength = [
    { length: 8, count: 23 },
    { length: 9, count: 45 },
    { length: 10, count: 67 },
    { length: 11, count: 89 },
    { length: 12, count: 72 },
    { length: 13, count: 45 },
    { length: 14, count: 23 },
    { length: 15, count: 12 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Interactive Visualization</h1>
          <p className="text-muted-foreground">Comprehensive analysis and visualization of prediction data</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedDataset} onValueChange={setSelectedDataset}>
            <SelectTrigger className="w-40" data-testid="select-dataset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent Data</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="batch">Batch Results</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-40" data-testid="select-metric">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="probability">Probability</SelectItem>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="compute_time">Compute Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Usage stats: no real usage history exists in this demo build. */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Info className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              No usage history — this is a demonstration build with no real prediction traffic.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Real held-out evaluation of the model being integrated (offline, not live app output) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Held-Out Evaluation (Offline)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Offline held-out evaluation of the model being integrated (peptide-grouped, leak-free split) —
              not the live output of this demo app.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={realHeldOutEval}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Bar dataKey="rocAuc" fill="#3b82f6" name="ROC-AUC" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Prediction Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Prediction Probability Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Illustrative sample data, not from real predictions.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={mockPredictionDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sequence Length Analysis */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sequence Length Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Illustrative sample data, not from real predictions.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={mockSequenceLength}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="length" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export & Sharing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" data-testid="button-export-png">
              Export as PNG
            </Button>
            <Button variant="outline" size="sm" data-testid="button-export-pdf">
              Export as PDF
            </Button>
            <Button variant="outline" size="sm" data-testid="button-export-csv">
              Export Data as CSV
            </Button>
            <Button variant="outline" size="sm" data-testid="button-share-dashboard">
              Share Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}