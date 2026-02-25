import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Dna, Home, Upload, BarChart3, Settings, Users, FlaskConical, BookOpen, Target, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigationSections = [
  {
    title: "Core",
    items: [
      { name: "Dashboard", path: "/", icon: Home },
      { name: "Single Prediction", path: "/predict", icon: Target },
    ]
  },
  {
    title: "Batch & Analysis", 
    subtitle: "Beta",
    items: [
      { name: "Batch Processing", path: "/batch", icon: Upload },
      { name: "Visualization", path: "/visualize", icon: BarChart3 },
      { name: "Analysis Tools", path: "/analysis", icon: FlaskConical },
    ]
  },
  {
    title: "Research",
    subtitle: "Beta",
    items: [
      { name: "Peptide Designer", path: "/design", icon: Target },
      { name: "Literature", path: "/literature", icon: BookOpen },
      { name: "Projects", path: "/projects", icon: Users },
    ]
  },
  {
    title: "Databases",
    items: [
      { name: "Data Sources", path: "/databases", icon: BookOpen },
    ]
  },
  {
    title: "Settings",
    items: [
      { name: "Configuration", path: "/settings", icon: Settings },
    ]
  }
];

export default function Navigation() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [location] = useLocation();

  const NavigationContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo/Header */}
      <div className="p-4 border-b border-border">
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
        </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
            {navigationSections.map((section) => (
              <div key={section.title}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                  {section.subtitle && (
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-md font-medium">
                      {section.subtitle}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location === item.path;
                    return (
                      <Link key={item.name} href={item.path}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={`w-full justify-start text-sm ${
                            isActive 
                              ? "bg-primary/10 text-primary border border-primary/20" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                          onClick={() => setIsMobileOpen(false)}
                        >
                          <item.icon className="w-4 h-4 mr-3" />
                          {item.name}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* Status Footer */}
      <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center justify-between">
              <span>Models:</span>
              <span className="text-accent">5 Loaded</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <span className="text-green-500">●</span>
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