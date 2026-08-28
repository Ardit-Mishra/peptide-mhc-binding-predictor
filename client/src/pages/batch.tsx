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
import AlleleSelect from "@/components/allele-select";
import { useToast } from "@/hooks/use-toast";
import type { BatchJob, BatchUploadRequest } from "@shared/schema";

const AA_ONLY = /^[ACDEFGHIKLMNPQRSTVWY]+$/;

/** One scored peptide-allele pair, as returned by the in-browser backend. */
type BatchResultRow = {
  sequence: string;
  mhcAllele: string;
  probability: number;
  rank: string;
  alleleSupportN: number | null;
};

type ParsedRow = { peptide: string; allele: string; usedFallback: boolean };

/**
 * Each line is `PEPTIDE` or `PEPTIDE,ALLELE` (comma, tab or semicolon).
 *
 * Binding is a property of the peptide-allele PAIR, so a row that names its own
 * allele is scored against that allele. A row that doesn't falls back to the
 * allele picked in the form — and `usedFallback` is surfaced in the UI, because
 * the previous behaviour (scoring every row against HLA-A*02:01 with no
 * indication) produced numbers that looked like results for pairings the user
 * never asked for.
 */
export function parseBatchInput(
  raw: string,
  fallbackAllele: string,
): { entries: ParsedRow[]; invalid: string[]; badLength: string[] } {
  const entries: ParsedRow[] = [];
  const invalid: string[] = [];
  const badLength: string[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(">")) continue; // blank or FASTA header

    const [rawPeptide = "", rawAllele = ""] = trimmed.split(/[,;\t]/, 2).map((s) => s.trim());
    const peptide = rawPeptide.toUpperCase();

    if (!AA_ONLY.test(peptide)) {
      invalid.push(trimmed);
    } else if (peptide.length < 8 || peptide.length > 11) {
      badLength.push(peptide);
    } else {
      entries.push({
        peptide,
        allele: rawAllele || fallbackAllele,
        usedFallback: rawAllele === "",
      });
    }
  }
  return { entries, invalid, badLength };
}

export default function BatchProcessing() {
  const [batchName, setBatchName] = useState("");
  const [sequences, setSequences] = useState("");
  const [selectedModels] = useState<string[]>(["xgb_pseudoseq"]);
  const [batchAllele, setBatchAllele] = useState("HLA-A*02:01");
  // Live preview of how the input parses, so the pairing is visible before submit.
  const parsed = parseBatchInput(sequences, batchAllele);
  const fallbackCount = parsed.entries.filter((e) => e.usedFallback).length;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const models = [
    {
      key: 'xgb_pseudoseq',
      name: 'XGBoost + allele pseudo-sequence',
      description: 'Held-out ROC-AUC 0.919 — runs in your browser',
    },
  ];

  // Fetch batch jobs
  const { data: batchJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/batch/jobs'],
    refetchInterval: 2000, // Refresh every 2 seconds for real-time updates
  });

  // Create batch job mutation
  const createBatchMutation = useMutation({
    // Must go through apiRequest: predictions are served by the in-browser
    // backend, so a raw fetch() hits the static host and 404s.
    mutationFn: async (data: BatchUploadRequest) => {
      const response = await apiRequest("POST", "/api/batch/create", data);
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

    const { entries, invalid, badLength } = parseBatchInput(sequences, batchAllele);

    // The model encodes 8-11mers; anything else is rejected server-side as a
    // whole-batch 400, so catch it here and name the offending sequences.
    if (badLength.length > 0) {
      toast({
        title: "Unsupported peptide length",
        description:
          `MHC class I peptides are 8-11 residues. Remove or trim: ` +
          `${badLength.slice(0, 3).join(", ")}${badLength.length > 3 ? ` (+${badLength.length - 3} more)` : ""}.`,
        variant: "destructive",
      });
      return;
    }

    if (invalid.length > 0) {
      toast({
        title: "Unreadable rows",
        description:
          `Use one peptide per line, optionally "PEPTIDE,HLA-A*02:01". Could not read: ` +
          `${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? ` (+${invalid.length - 3} more)` : ""}.`,
        variant: "destructive",
      });
      return;
    }

    if (entries.length === 0) {
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
      entries: entries.map(({ peptide, allele }) => ({ peptide, allele })),
    });
  };

  /** Rows a completed job actually produced, or [] while it is still running. */
  const resultRows = (job: BatchJob): BatchResultRow[] => {
    const r = job.results as { results?: BatchResultRow[] } | null;
    return r?.results ?? [];
  };

  /**
   * Export exactly what was scored — including the allele each peptide was
   * paired with, and how many training measurements back that allele — so a
   * downloaded CSV can't be read as allele-agnostic.
   */
  const downloadResults = (job: BatchJob) => {
    const rows = resultRows(job);
    if (rows.length === 0) return;
    const header = ["peptide", "allele", "probability", "binding_call", "allele_training_n"];
    const body = rows.map((r) =>
      [
        r.sequence,
        r.mhcAllele,
        r.probability.toFixed(4),
        r.rank,
        r.alleleSupportN ?? "not recorded",
      ].join(","),
    );
    const csv = [header.join(","), ...body].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.name.replace(/[^\w.-]+/g, "_") || "batch"}-predictions.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
                placeholder={"One per line. Add an allele per row to pair them:\nGILGFVFTL,HLA-A*02:01\nKRWIILGLNK,HLA-B*27:05\nNLVPMVATV"}
                rows={8}
                data-testid="textarea-sequences"
              />
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-parse-summary">
                {parsed.entries.length} peptide{parsed.entries.length === 1 ? "" : "s"} ready
                {fallbackCount > 0 && (
                  <>
                    {" · "}
                    <span className="text-amber-600 dark:text-amber-500">
                      {fallbackCount} without an allele → {batchAllele}
                    </span>
                  </>
                )}
                {parsed.badLength.length > 0 && ` · ${parsed.badLength.length} wrong length`}
                {parsed.invalid.length > 0 && ` · ${parsed.invalid.length} unreadable`}
              </p>
            </div>

            <div>
              <Label>Allele for rows that don't specify one</Label>
              <div className="mt-2">
                <AlleleSelect
                  value={batchAllele}
                  onChange={setBatchAllele}
                  testId="select-batch-allele"
                />
              </div>
              {/* Binding is a property of the peptide-allele pair. This used to
                  score every row against one allele with nothing in the results
                  saying so, which made unrequested pairings look like findings. */}
              <p className="text-xs text-muted-foreground mt-2">
                Rows written as <code className="font-mono">PEPTIDE,ALLELE</code> use their own allele.
                This is only the fallback, and every result shows the allele it was actually scored against.
              </p>
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

                        {job.status === 'completed' && resultRows(job).length > 0 && (
                          <div className="mt-3 space-y-2">
                            {/* Each row names the allele it was scored against.
                                Binding is a peptide-allele property, so a result
                                without its allele is not interpretable. */}
                            <div className="overflow-x-auto rounded-md border border-border">
                              <table className="w-full text-xs" data-testid={`table-results-${job.id}`}>
                                <thead className="bg-muted/50 text-muted-foreground">
                                  <tr>
                                    <th className="px-2 py-1.5 text-left font-medium">Peptide</th>
                                    <th className="px-2 py-1.5 text-left font-medium">Allele</th>
                                    <th className="px-2 py-1.5 text-right font-medium">p(bind)</th>
                                    <th className="px-2 py-1.5 text-right font-medium">Training n</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {resultRows(job).map((r, i) => (
                                    <tr key={`${r.sequence}-${r.mhcAllele}-${i}`} className="border-t border-border">
                                      <td className="px-2 py-1.5 font-mono">{r.sequence}</td>
                                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{r.mhcAllele}</td>
                                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                                        {r.probability.toFixed(4)}
                                      </td>
                                      <td className="px-2 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                                        {r.alleleSupportN?.toLocaleString() ?? "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => downloadResults(job)}
                              data-testid={`button-download-${job.id}`}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download CSV
                            </Button>
                          </div>
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