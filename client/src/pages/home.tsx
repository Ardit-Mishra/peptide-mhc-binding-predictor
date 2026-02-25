import { useState } from "react";
import { Link } from "wouter";
import PredictionForm from "@/components/prediction-form";
import ModelSelector from "@/components/model-selector";
import PredictionResults from "@/components/prediction-results";
import SystemStatus from "@/components/system-status";
import ModelPerformance from "@/components/model-performance";
import RecentActivity from "@/components/recent-activity";
import { Dna, Server, ChartLine, Clock, Download, Upload, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PredictResponse } from "@shared/schema";

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<string>("cnn");
  const [predictionResults, setPredictionResults] = useState<PredictResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePredictionComplete = (results: PredictResponse) => {
    setPredictionResults(results);
  };

  const handlePredictionStart = () => {
    setIsLoading(true);
    setPredictionResults(null);
  };

  const handlePredictionEnd = () => {
    setIsLoading(false);
  };

  const handleDownloadResults = () => {
    if (!predictionResults) {
      toast({
        title: "No results to download",
        description: "Please run a prediction first.",
        variant: "destructive",
      });
      return;
    }
    
    const data = JSON.stringify(predictionResults, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prediction-${predictionResults.sequence}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Results downloaded",
      description: "Prediction results have been saved to your downloads.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center space-x-3">
              <div className="gradient-bg p-2 rounded-lg">
                <Dna className="text-white text-lg sm:text-xl" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-foreground">
                  Peptide–MHC Binding Predictor
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Advanced ML Models for Immunological Research
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <SystemStatus compact />
              
              <div className="hidden sm:flex items-center space-x-2 text-sm">
                <Server className="w-4 h-4 text-accent" />
                <span className="text-muted-foreground">Models Loaded</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Prediction Form */}
            <PredictionForm
              onPredictionStart={handlePredictionStart}
              onPredictionComplete={handlePredictionComplete}
              onPredictionEnd={handlePredictionEnd}
              selectedModel={selectedModel}
            />

            {/* Model Selection */}
            <ModelSelector
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
            />

            {/* Prediction Results */}
            {predictionResults && (
              <PredictionResults results={predictionResults} />
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-6">
            {/* System Status */}
            <SystemStatus />

            {/* Model Performance */}
            <ModelPerformance />

            {/* Recent Activity */}
            <RecentActivity />

            {/* Quick Actions */}
            <div className="bg-card rounded-xl p-6 card-shadow">
              <div className="flex items-center space-x-2 mb-4">
                <ChartLine className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleDownloadResults}
                  className="w-full text-left p-3 border border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors"
                  data-testid="button-download-results"
                >
                  <div className="flex items-center space-x-3">
                    <Download className="w-4 h-4 text-muted-foreground" />
                    <div className="text-sm">
                      <div className="text-foreground">Download Results</div>
                      <div className="text-muted-foreground text-xs">Export prediction data</div>
                    </div>
                  </div>
                </button>

                <Link href="/batch">
                  <button 
                    className="w-full text-left p-3 border border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors"
                    data-testid="button-batch-predict"
                  >
                    <div className="flex items-center space-x-3">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="text-foreground">Batch Predict</div>
                        <div className="text-muted-foreground text-xs">Upload sequence file</div>
                      </div>
                    </div>
                  </button>
                </Link>

                <Link href="/settings">
                  <button 
                    className="w-full text-left p-3 border border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors"
                    data-testid="button-model-settings"
                  >
                    <div className="flex items-center space-x-3">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="text-foreground">Model Settings</div>
                        <div className="text-muted-foreground text-xs">Configure parameters</div>
                      </div>
                    </div>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Educational Disclaimer */}
        <div className="mt-12 bg-muted/30 border border-accent/20 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">🎓 Educational Purpose & Legal Disclaimer</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>FOR EDUCATIONAL AND RESEARCH PURPOSES ONLY.</strong> This application is designed for academic learning, 
                  research training, and educational demonstrations in computational biology and machine learning.
                </p>
                <p>
                  <strong>Not for Clinical Use:</strong> Predictions provided by this tool are not validated for clinical, 
                  diagnostic, therapeutic, or commercial applications. Do not use for medical decisions or patient care.
                </p>
                <p>
                  <strong>No Warranties:</strong> Results are provided "as-is" without warranties of accuracy, completeness, 
                  or fitness for any particular purpose. Users assume all responsibility for interpretation and use of results.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-foreground mb-3">About This Tool</h3>
              <p className="text-sm text-muted-foreground">
                Educational machine learning models for peptide-MHC binding prediction, 
                developed for academic research and learning purposes.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Legal Compliance</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• MIT License (Open Source)</li>
                <li>• IEDB Terms of Use Compliant</li>
                <li>• No Personal Health Information</li>
                <li>• Academic Use License</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Data Sources</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• IEDB Public Database</li>
                <li>• Open-source ML frameworks</li>
                <li>• Published research datasets</li>
                <li>• Educational training data</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Usage Rights</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Educational use permitted</li>
                <li>• Research applications allowed</li>
                <li>• Commercial use prohibited</li>
                <li>• Attribution required</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="text-center text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">
                ⚖️ Legal Notice: This software is provided under educational license terms
              </p>
              <p>
                By using this application, you acknowledge it is for educational purposes only and agree to comply with all 
                applicable laws, regulations, and institutional policies. No medical or commercial use permitted.
              </p>
              <p className="mt-4">
                Developed by Ardit Mishra •{" "}
                <a 
                  href="https://arditmishra.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  arditmishra.com
                </a>
                {" "}• Licensed under MIT License • Educational Use Only
              </p>
              <p className="text-xs opacity-75">
                Built with React, Express, PyTorch • Complies with IEDB, institutional, and open-source licensing terms
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
