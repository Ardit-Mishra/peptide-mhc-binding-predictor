import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Play, Pause, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BatchJob, BatchUploadRequest } from "@shared/schema";

export default function BatchProcessing() {
  const [batchName, setBatchName] = useState("");
  const [sequences, setSequences] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>(["cnn"]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const models = [
    { key: 'cnn', name: 'CNN', description: 'Fast pattern recognition' },
    { key: 'bilstm', name: 'BiLSTM', description: 'Sequence dependencies' },
    { key: 'cnn_bilstm_best', name: 'CNN+BiLSTM Best', description: 'Highest accuracy' },
    { key: 'cnn_bilstm', name: 'CNN+BiLSTM', description: 'Balanced approach' },
    { key: 'transformer', name: 'Transformer', description: 'State-of-the-art' },
  ];

  // Fetch batch jobs
  const { data: batchJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/batch/jobs'],
    refetchInterval: 2000, // Refresh every 2 seconds for real-time updates
  });

  // Create batch job mutation
  const createBatchMutation = useMutation({
    mutationFn: async (data: BatchUploadRequest) => {
      const response = await fetch('/api/batch/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create batch job');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Batch job created",
        description: "Your batch processing job has been started.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/batch/jobs'] });
      setBatchName("");
      setSequences("");
      setSelectedModels(["cnn"]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!batchName.trim()) {
      toast({
        title: "Error",
        description: "Please provide a batch name.",
        variant: "destructive",
      });
      return;
    }

    if (!sequences.trim()) {
      toast({
        title: "Error", 
        description: "Please provide sequences to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (selectedModels.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one model.",
        variant: "destructive",
      });
      return;
    }

    // Parse sequences (handle FASTA format or simple list)
    const sequenceLines = sequences.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('>'))
      .filter(line => /^[ACDEFGHIKLMNPQRSTVWY]+$/.test(line));

    if (sequenceLines.length === 0) {
      toast({
        title: "Error",
        description: "No valid peptide sequences found. Use only standard amino acid letters (A-Y).",
        variant: "destructive",
      });
      return;
    }

    createBatchMutation.mutate({
      projectId: "default", // We'll add project management later
      name: batchName,
      models: selectedModels as any,
      sequences: sequenceLines,
    });
  };

  const handleModelToggle = (modelKey: string) => {
    setSelectedModels(prev => 
      prev.includes(modelKey) 
        ? prev.filter(m => m !== modelKey)
        : [...prev, modelKey]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Batch Processing</h1>
          <p className="text-muted-foreground">Process multiple peptide sequences simultaneously</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New Batch */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>Create New Batch</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="batch-name">Batch Name</Label>
              <Input
                id="batch-name"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g., Cancer peptides analysis"
                data-testid="input-batch-name"
              />
            </div>

            <div>
              <Label htmlFor="sequences">Peptide Sequences</Label>
              <Textarea
                id="sequences"
                value={sequences}
                onChange={(e) => setSequences(e.target.value)}
                placeholder="Enter sequences (one per line or FASTA format):&#10;AAGIGILTV&#10;GILGFVFTL&#10;>sequence3&#10;LLWNGPMAV"
                rows={8}
                data-testid="textarea-sequences"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {sequences.split('\n').filter(line => line.trim() && !line.startsWith('>')).length} sequences detected
              </p>
            </div>

            <div>
              <Label>Select Models</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {models.map((model) => (
                  <div key={model.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={model.key}
                      checked={selectedModels.includes(model.key)}
                      onCheckedChange={() => handleModelToggle(model.key)}
                      data-testid={`checkbox-model-${model.key}`}
                    />
                    <label htmlFor={model.key} className="text-sm flex-1 cursor-pointer">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-muted-foreground ml-2">{model.description}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={createBatchMutation.isPending}
              className="w-full"
              data-testid="button-create-batch"
            >
              {createBatchMutation.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Creating Batch...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Batch Processing
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Batch Jobs Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Batch Jobs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading batch jobs...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {batchJobs && Array.isArray(batchJobs) && batchJobs.length > 0 ? (
                  batchJobs.map((job: BatchJob) => (
                    <div key={job.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-foreground">{job.name}</h3>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(job.status)}
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress:</span>
                          <span className="text-foreground">
                            {job.processedSequences} / {job.totalSequences}
                          </span>
                        </div>
                        
                        <Progress 
                          value={job.totalSequences > 0 ? (job.processedSequences / job.totalSequences) * 100 : 0}
                          className="h-2"
                        />

                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Models:</span>
                          <span className="text-foreground">
                            {job.models?.join(', ') || 'N/A'}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Created:</span>
                          <span className="text-foreground">
                            {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>

                        {job.status === 'completed' && (
                          <Button size="sm" variant="outline" className="w-full mt-2">
                            <Download className="w-4 h-4 mr-2" />
                            Download Results
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No batch jobs yet</p>
                    <p className="text-sm text-muted-foreground">Create your first batch to get started</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}