import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, GitCompare, Shuffle, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MutationRequest } from "@shared/schema";

export default function AnalysisTools() {
  const { toast } = useToast();
  
  // Mutation Analysis State
  const [mutationSequence, setMutationSequence] = useState("AAGIGILTV");
  const [mutationPosition, setMutationPosition] = useState(0);
  const [newAminoAcid, setNewAminoAcid] = useState("A");
  const [mutationModel, setMutationModel] = useState("cnn");
  
  // Sequence Alignment State
  const [sequence1, setSequence1] = useState("");
  const [sequence2, setSequence2] = useState("");
  
  // Motif Discovery State
  const [motifSequences, setMotifSequences] = useState("");

  const aminoAcids = ['A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'Y'];
  
  const mutationAnalysisMutation = useMutation({
    mutationFn: async (data: MutationRequest) => {
      const response = await fetch('/api/analysis/mutation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Mutation analysis failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Mutation analysis complete",
        description: `Impact score: ${data.impactScore.toFixed(3)}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMutationAnalysis = () => {
    if (!mutationSequence || mutationPosition < 0 || mutationPosition >= mutationSequence.length) {
      toast({
        title: "Error",
        description: "Please provide valid sequence and position.",
        variant: "destructive",
      });
      return;
    }

    mutationAnalysisMutation.mutate({
      sequence: mutationSequence,
      position: mutationPosition,
      newAminoAcid,
      model: mutationModel as any,
    });
  };

  // Mock results for demonstration
  const mockMutationResults = [
    { position: 3, original: 'I', mutated: 'L', impact: -0.23, effect: 'Decreased binding' },
    { position: 5, original: 'I', mutated: 'V', impact: -0.12, effect: 'Slightly decreased' },
    { position: 7, original: 'L', mutated: 'F', impact: 0.15, effect: 'Improved binding' },
    { position: 8, original: 'T', mutated: 'S', impact: -0.08, effect: 'Minimal effect' },
  ];

  const mockAlignmentResult = {
    sequence1: "AAGIGILTV",
    sequence2: "AAGVGILTV", 
    identity: 88.9,
    similarity: 100,
    gaps: 0,
    alignedSeq1: "AAGIGILTV",
    alignedSeq2: "AAGVGILTV",
    differences: [{ position: 3, seq1: 'I', seq2: 'V' }]
  };

  const mockMotifs = [
    { pattern: 'GIL', frequency: 12, positions: [3, 15, 27, 41], significance: 0.001 },
    { pattern: 'LTV', frequency: 8, positions: [7, 22, 34], significance: 0.005 },
    { pattern: 'AAG', frequency: 6, positions: [0, 18, 29], significance: 0.01 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analysis Tools</h1>
          <p className="text-muted-foreground">Advanced peptide sequence analysis and comparison tools</p>
        </div>
      </div>

      <Tabs defaultValue="mutation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mutation" data-testid="tab-mutation">Mutation Analysis</TabsTrigger>
          <TabsTrigger value="alignment" data-testid="tab-alignment">Sequence Alignment</TabsTrigger>
          <TabsTrigger value="motif" data-testid="tab-motif">Motif Discovery</TabsTrigger>
        </TabsList>

        {/* Mutation Analysis Tab */}
        <TabsContent value="mutation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shuffle className="w-5 h-5" />
                  <span>Mutation Impact Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mutation-sequence">Original Sequence</Label>
                  <Input
                    id="mutation-sequence"
                    value={mutationSequence}
                    onChange={(e) => setMutationSequence(e.target.value.toUpperCase())}
                    placeholder="Enter peptide sequence"
                    data-testid="input-mutation-sequence"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mutation-position">Position (0-based)</Label>
                    <Input
                      id="mutation-position"
                      type="number"
                      min="0"
                      max={mutationSequence.length - 1}
                      value={mutationPosition}
                      onChange={(e) => setMutationPosition(parseInt(e.target.value) || 0)}
                      data-testid="input-mutation-position"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-amino-acid">New Amino Acid</Label>
                    <Select value={newAminoAcid} onValueChange={setNewAminoAcid}>
                      <SelectTrigger data-testid="select-amino-acid">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {aminoAcids.map(aa => (
                          <SelectItem key={aa} value={aa}>{aa}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="mutation-model">Model</Label>
                  <Select value={mutationModel} onValueChange={setMutationModel}>
                    <SelectTrigger data-testid="select-mutation-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cnn">CNN</SelectItem>
                      <SelectItem value="bilstm">BiLSTM</SelectItem>
                      <SelectItem value="cnn_bilstm_best">CNN+BiLSTM Best</SelectItem>
                      <SelectItem value="cnn_bilstm">CNN+BiLSTM</SelectItem>
                      <SelectItem value="transformer">Transformer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleMutationAnalysis}
                  disabled={mutationAnalysisMutation.isPending}
                  className="w-full"
                  data-testid="button-analyze-mutation"
                >
                  {mutationAnalysisMutation.isPending ? "Analyzing..." : "Analyze Mutation"}
                </Button>

                {mutationSequence && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Sequence Preview</h4>
                    <div className="font-mono text-sm bg-muted p-2 rounded">
                      {mutationSequence.split('').map((aa, index) => (
                        <span
                          key={index}
                          className={index === mutationPosition ? "bg-yellow-200 px-1 rounded" : ""}
                        >
                          {index === mutationPosition ? newAminoAcid : aa}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mutation Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockMutationResults.map((result, index) => (
                    <div key={index} className="border border-border rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-mono text-sm">
                          Position {result.position}: {result.original} → {result.mutated}
                        </span>
                        <Badge 
                          variant={result.impact > 0 ? "default" : "secondary"}
                          className={result.impact > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                        >
                          {result.impact > 0 ? "+" : ""}{result.impact.toFixed(3)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.effect}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sequence Alignment Tab */}
        <TabsContent value="alignment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <GitCompare className="w-5 h-5" />
                  <span>Pairwise Sequence Alignment</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sequence1">Sequence 1</Label>
                  <Input
                    id="sequence1"
                    value={sequence1}
                    onChange={(e) => setSequence1(e.target.value.toUpperCase())}
                    placeholder="Enter first peptide sequence"
                    data-testid="input-sequence1"
                  />
                </div>

                <div>
                  <Label htmlFor="sequence2">Sequence 2</Label>
                  <Input
                    id="sequence2"
                    value={sequence2}
                    onChange={(e) => setSequence2(e.target.value.toUpperCase())}
                    placeholder="Enter second peptide sequence"
                    data-testid="input-sequence2"
                  />
                </div>

                <Button className="w-full" data-testid="button-align-sequences">
                  <GitCompare className="w-4 h-4 mr-2" />
                  Align Sequences
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alignment Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{mockAlignmentResult.identity}%</div>
                      <div className="text-muted-foreground">Identity</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{mockAlignmentResult.similarity}%</div>
                      <div className="text-muted-foreground">Similarity</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{mockAlignmentResult.gaps}</div>
                      <div className="text-muted-foreground">Gaps</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Aligned Sequences</h4>
                    <div className="font-mono text-sm bg-muted p-3 rounded">
                      <div>{mockAlignmentResult.alignedSeq1}</div>
                      <div className="text-muted-foreground">|||||||X|</div>
                      <div>{mockAlignmentResult.alignedSeq2}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Differences</h4>
                    {mockAlignmentResult.differences.map((diff, index) => (
                      <Badge key={index} variant="outline" className="mr-2">
                        Pos {diff.position}: {diff.seq1}→{diff.seq2}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Motif Discovery Tab */}
        <TabsContent value="motif" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FlaskConical className="w-5 h-5" />
                  <span>Motif Discovery</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="motif-sequences">Sequence Dataset</Label>
                  <textarea
                    id="motif-sequences"
                    value={motifSequences}
                    onChange={(e) => setMotifSequences(e.target.value)}
                    placeholder="Enter multiple sequences (one per line):&#10;AAGIGILTV&#10;GILGFVFTL&#10;LLWNGPMAV"
                    rows={8}
                    className="w-full p-2 border border-border rounded-md"
                    data-testid="textarea-motif-sequences"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Minimum Length</Label>
                    <Select defaultValue="3">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 amino acids</SelectItem>
                        <SelectItem value="3">3 amino acids</SelectItem>
                        <SelectItem value="4">4 amino acids</SelectItem>
                        <SelectItem value="5">5 amino acids</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Minimum Frequency</Label>
                    <Select defaultValue="3">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 occurrences</SelectItem>
                        <SelectItem value="3">3 occurrences</SelectItem>
                        <SelectItem value="5">5 occurrences</SelectItem>
                        <SelectItem value="10">10 occurrences</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button className="w-full" data-testid="button-discover-motifs">
                  <FlaskConical className="w-4 h-4 mr-2" />
                  Discover Motifs
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Discovered Motifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockMotifs.map((motif, index) => (
                    <div key={index} className="border border-border rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-mono text-lg font-bold">{motif.pattern}</span>
                        <div className="flex items-center space-x-2">
                          <Badge>{motif.frequency}x</Badge>
                          <Badge variant="outline">p={motif.significance}</Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Found at positions: {motif.positions.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}