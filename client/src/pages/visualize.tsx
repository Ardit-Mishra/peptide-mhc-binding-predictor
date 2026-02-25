import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Zap, Target, Activity, Layers } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function Visualization() {
  const [selectedDataset, setSelectedDataset] = useState("recent");
  const [selectedMetric, setSelectedMetric] = useState("probability");

  // Fetch visualization data
  const { data: chartData } = useQuery({
    queryKey: ['/api/visualize/data', selectedDataset, selectedMetric],
  });

  // Mock data for demonstration
  const mockModelComparison = [
    { model: 'CNN', accuracy: 92.4, speed: 95, f1Score: 88.2 },
    { model: 'BiLSTM', accuracy: 89.7, speed: 72, f1Score: 91.1 },
    { model: 'CNN+BiLSTM Best', accuracy: 95.8, speed: 65, f1Score: 94.5 },
    { model: 'CNN+BiLSTM', accuracy: 93.2, speed: 68, f1Score: 92.8 },
    { model: 'Transformer', accuracy: 96.3, speed: 58, f1Score: 95.2 },
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

  const mockConfidenceHeatmap = [
    { model: 'CNN', high: 65, medium: 25, low: 10 },
    { model: 'BiLSTM', high: 72, medium: 20, low: 8 },
    { model: 'CNN+BiLSTM Best', high: 85, medium: 12, low: 3 },
    { model: 'CNN+BiLSTM', high: 78, medium: 18, low: 4 },
    { model: 'Transformer', high: 88, medium: 10, low: 2 },
  ];

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Predictions</p>
                <p className="text-2xl font-bold text-foreground">2,847</p>
                <p className="text-xs text-green-500">+12% this week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold text-foreground">87.3%</p>
                <p className="text-xs text-green-500">+2.1% improvement</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Speed</p>
                <p className="text-2xl font-bold text-foreground">1.2s</p>
                <p className="text-xs text-green-500">15% faster</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Layers className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Models Active</p>
                <p className="text-2xl font-bold text-foreground">5/5</p>
                <p className="text-xs text-green-500">All operational</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Model Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Model Performance Comparison</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockModelComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="accuracy" fill="#3b82f6" name="Accuracy %" />
                <Bar dataKey="f1Score" fill="#10b981" name="F1 Score %" />
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
            <ResponsiveContainer width="100%" height={300}>
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
        <Card>
          <CardHeader>
            <CardTitle>Sequence Length Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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

        {/* Model Speed vs Accuracy */}
        <Card>
          <CardHeader>
            <CardTitle>Speed vs Accuracy Trade-off</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={mockModelComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="speed" name="Speed Score" />
                <YAxis dataKey="accuracy" name="Accuracy %" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Models" data={mockModelComparison} fill="#ef4444">
                  {mockModelComparison.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Confidence Level Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Model Confidence Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {mockConfidenceHeatmap.map((model, index) => (
                <div key={model.model} className="text-center">
                  <h4 className="font-medium mb-2">{model.model}</h4>
                  <div className="space-y-2">
                    <div className="bg-green-100 rounded-lg p-2">
                      <div className="text-green-800 font-semibold">{model.high}%</div>
                      <div className="text-xs text-green-600">High Confidence</div>
                    </div>
                    <div className="bg-yellow-100 rounded-lg p-2">
                      <div className="text-yellow-800 font-semibold">{model.medium}%</div>
                      <div className="text-xs text-yellow-600">Medium Confidence</div>
                    </div>
                    <div className="bg-red-100 rounded-lg p-2">
                      <div className="text-red-800 font-semibold">{model.low}%</div>
                      <div className="text-xs text-red-600">Low Confidence</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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