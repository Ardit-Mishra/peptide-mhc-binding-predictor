import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Dna, Home, Upload, BarChart3, Target, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Mutation } from "@/components/icons";

// Only routes backed by the real in-browser model appear here. Pages that
// rendered hardcoded "results" (mock motifs, invented mutation impacts,
// non-functional integrations and settings) were removed rather than shipped
// behind a "Beta" badge — the app must not advertise capabilities it lacks.
// "Dashboard" and "Single Prediction" both rendered the same page, and a
// single-item "Method" section was a heading with one link under it. Three
// destinations, flat — the app has three things you can do.
const navigationItems = [
  { name: "Predict", path: "/", icon: Target },
  { name: "Batch", path: "/batch", icon: Upload },
  { name: "Mutation scan", path: "/mutation-scan", icon: Mutation },
  { name: "Benchmarks", path: "/visualize", icon: BarChart3 },
];

export default function Navigation() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [location] = useLocation();


  const NavigationContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo/Header */}
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <Dna className="h-4 w-4 flex-none text-[var(--ds-accent)]" aria-hidden="true" />
          <span className="seq text-[13px] font-semibold text-foreground">pMHC</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-0.5">
          {navigationItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.name} href={item.path}>
                <Button
                  variant="ghost"
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full cursor-pointer justify-start rounded-[var(--ds-radius-sm)] text-sm ${
                    isActive
                      ? "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-ink)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Status Footer */}
      <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center justify-between">
              <span>Model:</span>
              <span className="text-accent" data-testid="status-model">XGBoost</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Alleles:</span>
              <span data-testid="status-alleles">129</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Runs:</span>
              <span data-testid="status-runtime">in your browser</span>
            </div>
          </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Navigation */}
      <div className="md:hidden">
        <Card className="border-b border-border bg-card">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <div className="gradient-bg p-2 rounded-lg">
                <Dna className="text-white text-lg" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground text-sm">
                  Peptide-MHC Predictor
                </h1>
                <p className="text-xs text-muted-foreground">
                  Research Platform
                </p>
              </div>
            </div>
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <NavigationContent />
              </SheetContent>
            </Sheet>
          </div>
        </Card>
      </div>

      {/* Desktop Navigation */}
      <Card className="hidden md:flex h-full w-64 border-r border-border bg-card">
        <NavigationContent />
      </Card>
    </>
  );
}