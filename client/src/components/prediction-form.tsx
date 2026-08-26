import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { MODEL_KEYS, predictRequestSchema, type PredictRequest, type PredictResponse } from "@shared/schema";
import { loadAlleleList } from "@/lib/pmhc-model";
import { Microscope, Info, Play } from "lucide-react";

interface PredictionFormProps {
  onPredictionStart: () => void;
  onPredictionComplete: (results: PredictResponse) => void;
  onPredictionEnd: () => void;
  selectedModel: string;
}

export default function PredictionForm({
  onPredictionStart,
  onPredictionComplete,
  onPredictionEnd,
  selectedModel
}: PredictionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PredictRequest>({
    resolver: zodResolver(predictRequestSchema),
    defaultValues: {
      sequence: "GILGFVFTL",
      model: MODEL_KEYS[0],
      mhcAllele: "HLA-A*02:01",
    },
  });

  // Only one trained model exists, so the form always submits that key. The
  // `selectedModel` prop is kept for the parent's display state.
  React.useEffect(() => {
    form.setValue("model", MODEL_KEYS[0]);
  }, [selectedModel, form]);

  // The allele list is a ~12 KB asset, fetched separately from the model so the
  // picker fills in immediately without downloading the tree ensemble.
  const [alleles, setAlleles] = useState<{ allele: string; support?: { n: number } }[]>([]);
  const [alleleError, setAlleleError] = useState(false);
  React.useEffect(() => {
    let active = true;
    loadAlleleList()
      .then((list) => { if (active) setAlleles(list); })
      .catch(() => { if (active) setAlleleError(true); });
    return () => { active = false; };
  }, []);

  const predictMutation = useMutation({
    mutationFn: api.predict,
    onMutate: () => {
      onPredictionStart();
    },
    onSuccess: (data) => {
      onPredictionComplete(data);
      toast({
        title: "Prediction Complete",
        description: `Binding probability: ${(data.probability * 100).toFixed(1)}%`,
      });
      // Invalidate system status to update prediction count
      queryClient.invalidateQueries({ queryKey: ["/api/system-status"] });
    },
    onError: (error) => {
      toast({
        title: "Prediction Failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      onPredictionEnd();
    },
  });

  const onSubmit = (data: PredictRequest) => {
    predictMutation.mutate(data);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !predictMutation.isPending) {
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <Card className="card-shadow" data-testid="card-prediction-form">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center space-x-2 mb-4 sm:mb-6">
          <Microscope className="w-5 h-5 text-primary" />
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Peptide Sequence Input</h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sequence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amino Acid Sequence</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        {...field}
                        className="font-mono text-sm pr-10"
                        placeholder="8-11 residues, e.g. GILGFVFTL"
                        onKeyPress={handleKeyPress}
                        data-testid="input-sequence"
                      />
                    </FormControl>
                    <div className="absolute right-3 top-3">
                      <div title="Enter 8-11 amino acid sequence">
                        <Info className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported amino acids: A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mhcAllele"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    MHC Allele
                    {alleles.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {alleles.length} trained alleles
                      </span>
                    )}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-mhc-allele">
                        <SelectValue placeholder={alleleError ? "Allele list unavailable" : "Loading alleles..."} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      {/* Only alleles the model was actually trained on are listed, so the
                          picker cannot offer one the model has never seen. The count next to
                          each is how many training measurements back that allele. */}
                      {alleles.map(({ allele, support }) => (
                        <SelectItem key={allele} value={allele}>
                          {allele}
                          {support ? ` (n=${support.n.toLocaleString()})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={predictMutation.isPending}
                data-testid="button-predict"
              >
                {predictMutation.isPending ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="loading-spinner" />
                    <span>Predicting...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <Play className="w-4 h-4" />
                    <span>Predict Binding Affinity</span>
                  </span>
                )}
              </Button>

              <Button variant="outline" type="button" className="px-6" data-testid="button-history">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
