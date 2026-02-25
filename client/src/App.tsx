import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/navigation";
import Home from "@/pages/home";
import BatchProcessing from "@/pages/batch";
import Visualization from "@/pages/visualize";
import AnalysisTools from "@/pages/analysis";
import PeptideDesigner from "@/pages/design";
import Projects from "@/pages/projects";
import Literature from "@/pages/literature";
import Databases from "@/pages/databases";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-background">
      <Navigation />
      <main className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 md:p-6">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/predict" component={Home} />
            <Route path="/batch" component={BatchProcessing} />
            <Route path="/visualize" component={Visualization} />
            <Route path="/analysis" component={AnalysisTools} />
            <Route path="/design" component={PeptideDesigner} />
            <Route path="/projects" component={Projects} />
            <Route path="/literature" component={Literature} />
            <Route path="/databases" component={Databases} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
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
