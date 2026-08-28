import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/navigation";
import Home from "@/pages/home";
import BatchProcessing from "@/pages/batch";
import Visualization from "@/pages/visualize";
import NotFound from "@/pages/not-found";

/**
 * The disclaimer has to stay visible, but it was a full-bleed amber bar that
 * shouted louder than the tool itself and owned the first thing you saw. It is
 * now a quiet hairline strip: a small ochre mark carries the "this is qualified"
 * signal (the same meaning ochre has everywhere else here), and the text sits in
 * muted ink at label scale.
 */
function ModelBanner() {
  return (
    <div
      role="note"
      className="flex w-full items-center gap-2.5 border-b border-border bg-[var(--ds-surface-sunk)] px-4 py-1.5 text-[11px] leading-tight text-muted-foreground"
    >
      <span
        aria-hidden="true"
        className="h-3 w-0.5 flex-none rounded-full"
        style={{ background: "var(--ds-caveat)" }}
      />
      <p>
        <span className="text-foreground">Research demo — not a clinical or diagnostic tool.</span>{" "}
        Gradient-boosted tree model on public MHCflurry data, held-out ROC-AUC 0.919, run in your browser.
      </p>
    </div>
  );
}

function Router() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <ModelBanner />
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        <Navigation />
        <main className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4 md:p-6">
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/predict" component={Home} />
              <Route path="/batch" component={BatchProcessing} />
              <Route path="/visualize" component={Visualization} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
