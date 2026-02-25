import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Target, Sparkles, Zap, Shield, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DesignRequest } from "@shared/schema";

export default function PeptideDesigner() {
  const { toast } = useToast();
  
  const [targetMhc, setTargetMhc] = useState("HLA-A*02:01");
  const [peptideLength, setPeptideLength] = useState([9]);
  const [designStrategy, setDesignStrategy] = useState("optimize_binding");
  const [customConstraints, setCustomConstraints] = useState("");

  const mhcAlleles = [
    "HLA-A*02:01", "HLA-A*01:01", "HLA-A*03:01", "HLA-A*11:01", "HLA-A*24:02",
    "HLA-B*07:02", "HLA-B*08:01", "HLA-B*27:05", "HLA-B*35:01", "HLA-B*40:01",
    "HLA-C*04:01", "HLA-C*06:02", "HLA-C*07:01", "HLA-C*07:02", "HLA-C*08:02"
  ];

  const strategies = [
    { value: "optimize_binding", label: "Optimize Binding", description: "Maximize MHC binding affinity" },
    { value: "maximize_immunogenicity", label: "Maximize Immunogenicity", description: "Enhance T-cell response" },
    { value: "minimize_toxicity", label: "Minimize Toxicity", description: "Reduce potential side effects" },
  ];

  const designMutation = useMutation({
    mutationFn: async (data: DesignRequest) => {
      const response = await fetch('/api/design/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Peptide design failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Peptide designed successfully",
        description: `Generated ${data.suggestions.length} optimized sequences`,
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

  const handleGenerate = () => {
    designMutation.mutate({
      targetMhc,
      length: peptideLength[0],
      strategy: designStrategy as any,
    });
  };

  const copyToClipboard = (sequence: string) => {
    navigator.clipboard.writeText(sequence);
    toast({
      title: "Copied to clipboard",
      description: sequence,
    });
  };

  // Mock design results
  const mockDesignResults = [
    {
      sequence: "GILGFVFTL",
      predictedAffinity: 0.89,
      confidence: 0.94,
      rank: "High Binder",
      properties: {
        hydrophobicity: 0.72,
        charge: 0,
        stability: 0.85,
        immunogenicity: 0.78
      },
      strategy: "Optimized for high binding affinity"
    },
    {
      sequence: "NLVPMVATV",
      predictedAffinity: 0.85,
      confidence: 0.91,
      rank: "High Binder", 
      properties: {
        hydrophobicity: 0.68,
        charge: 0,
        stability: 0.82,
        immunogenicity: 0.81
      },
      strategy: "Balanced binding and immunogenicity"
    },
    {
      sequence: "KTWGQYWQV",
      predictedAffinity: 0.82,
      confidence: 0.88,
      rank: "Medium Binder",
      properties: {
        hydrophobicity: 0.55,
        charge: 1,
        stability: 0.79,
        immunogenicity: 0.85
      },
      strategy: "Enhanced immunogenic potential"
    }
  ];

  const aminoAcidFrequencies = [
    { aa: 'L', frequency: 18.2, preference: 'Anchor P2' },
    { aa: 'V', frequency: 15.7, preference: 'Anchor P9' },
    { aa: 'A', frequency: 12.1, preference: 'P1, P3' },
    { aa: 'I', frequency: 10.8, preference: 'P2, P9' },
    { aa: 'F', frequency: 9.3, preference: 'P2, P9' },
    { aa: 'T', frequency: 8.6, preference: 'P4-P8' },
    { aa: 'G', frequency: 7.2, preference: 'P4-P8' },
    { aa: 'Y', frequency: 6.4, preference: 'P2, P9' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Peptide Designer</h1>
          <p className="text-muted-foreground">AI-powered peptide optimization for enhanced MHC binding</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Design Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Design Parameters</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="target-mhc">Target MHC Allele</Label>
              <Select value={targetMhc} onValueChange={setTargetMhc}>
                <SelectTrigger data-testid="select-target-mhc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mhcAlleles.map(allele => (
                    <SelectItem key={allele} value={allele}>{allele}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Peptide Length: {peptideLength[0]} amino acids</Label>
              <Slider
                value={peptideLength}
                onValueChange={setPeptideLength}
                min={8}
                max={15}
                step={1}
                className="mt-2"
                data-testid="slider-peptide-length"
              />
            </div>

            <div>
              <Label>Design Strategy</Label>
              <Select value={designStrategy} onValueChange={setDesignStrategy}>
                <SelectTrigger data-testid="select-design-strategy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map(strategy => (
                    <SelectItem key={strategy.value} value={strategy.value}>
                      <div>
                        <div className="font-medium">{strategy.label}</div>
                        <div className="text-sm text-muted-foreground">{strategy.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="constraints">Custom Constraints (optional)</Label>
              <Input
                id="constraints"
                value={customConstraints}
                onChange={(e) => setCustomConstraints(e.target.value)}
                placeholder="e.g., avoid cysteines, include lysine"
                data-testid="input-constraints"
              />
            </div>

            <Button 
              onClick={handleGenerate}
              disabled={designMutation.isPending}
              className="w-full"
              data-testid="button-generate-peptides"
            >
              {designMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Designing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Peptides
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Design Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>Optimized Peptides</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockDesignResults.map((result, index) => (
                <div key={index} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-lg font-bold">{result.sequence}</span>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => copyToClipboard(result.sequence)}
                        data-testid={`button-copy-${index}`}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        className={result.rank === "High Binder" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                      >
                        {result.rank}
                      </Badge>
                      <span className="text-sm font-medium">{(result.predictedAffinity * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Affinity</div>
                      <div className="font-semibold">{result.predictedAffinity.toFixed(3)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Confidence</div>
                      <div className="font-semibold">{result.confidence.toFixed(3)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Stability</div>
                      <div className="font-semibold">{result.properties.stability.toFixed(3)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Immunogen.</div>
                      <div className="font-semibold">{result.properties.immunogenicity.toFixed(3)}</div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <strong>Strategy:</strong> {result.strategy}
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    <div className="flex space-x-2">
                      <Badge variant="outline">
                        Hydrophobicity: {result.properties.hydrophobicity.toFixed(2)}
                      </Badge>
                      <Badge variant="outline">
                        Charge: {result.properties.charge}
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline" data-testid={`button-analyze-${index}`}>
                      Analyze Further
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* MHC Binding Preferences */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>MHC-I Binding Preferences for {targetMhc}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Amino Acid Preferences</h4>
                <div className="space-y-2">
                  {aminoAcidFrequencies.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="font-mono font-medium">{item.aa}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${(item.frequency / 20) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12">{item.frequency}%</span>
                        <span className="text-xs text-muted-foreground">{item.preference}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Position-Specific Motifs</h4>
                <div className="space-y-3">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="font-mono text-sm">Position 2 (P2): Anchor</div>
                    <div className="text-sm text-muted-foreground">Prefers: L, I, V, F, M</div>
                    <div className="text-sm text-muted-foreground">Critical for binding stability</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="font-mono text-sm">Position 9 (P9): C-terminal</div>
                    <div className="text-sm text-muted-foreground">Prefers: V, L, I, F, Y</div>
                    <div className="text-sm text-muted-foreground">Primary anchor position</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="font-mono text-sm">Positions 4-8: TCR Contact</div>
                    <div className="text-sm text-muted-foreground">Variable residues for T-cell recognition</div>
                    <div className="text-sm text-muted-foreground">Balance binding and immunogenicity</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}