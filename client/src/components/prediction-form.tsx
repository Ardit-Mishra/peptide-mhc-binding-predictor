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
import { predictRequestSchema, type PredictRequest, type PredictResponse } from "@shared/schema";
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
      sequence: "SIINFEKL",
      model: selectedModel as "cnn" | "bilstm" | "cnn_bilstm" | "cnn_bilstm_best" | "transformer",
      mhcAllele: "",
    },
  });

  // Update form when selected model changes
  React.useEffect(() => {
    form.setValue("model", selectedModel as "cnn" | "bilstm" | "cnn_bilstm" | "cnn_bilstm_best" | "transformer");
  }, [selectedModel, form]);

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
                        placeholder="Enter peptide sequence (e.g., SIINFEKL)"
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
                  <FormLabel>MHC Allele (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-mhc-allele">
                        <SelectValue placeholder="Auto-detect from sequence" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect from sequence</SelectItem>
                      <SelectItem value="HLA-A*02:01">HLA-A*02:01</SelectItem>
                      <SelectItem value="HLA-A*01:01">HLA-A*01:01</SelectItem>
                      <SelectItem value="HLA-B*07:02">HLA-B*07:02</SelectItem>
                      <SelectItem value="HLA-C*07:01">HLA-C*07:01</SelectItem>
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
