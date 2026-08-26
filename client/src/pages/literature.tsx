import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, ExternalLink, Database } from "lucide-react";

export default function Literature() {
  const [searchQuery, setSearchQuery] = useState("");

  // No fabricated paper database is shown here. Search links out to PubMed/IEDB directly
  // rather than presenting invented PubMed IDs, citation counts, or impact factors.
  const searchUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(
    searchQuery || "peptide MHC binding prediction"
  )}`;

  const keyDatabases = [
    {
      name: "IEDB",
      description: "Immune Epitope Database - largest repository of immune epitope data",
      url: "https://www.iedb.org",
      dataTypes: ["MHC-I binding", "T-cell assays", "Epitope mapping"]
    },
    {
      name: "UniProt",
      description: "Universal protein database with comprehensive sequence data",
      url: "https://www.uniprot.org",
      dataTypes: ["Protein sequences", "Functional annotations", "PTMs"]
    },
    {
      name: "PDB",
      description: "Protein Data Bank with 3D structural information",
      url: "https://www.rcsb.org",
      dataTypes: ["3D structures", "Binding sites", "Molecular dynamics"]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Literature & References</h1>
          <p className="text-muted-foreground">References for peptide-MHC binding studies</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-3">
            This demo does not host a paper database. Search below opens a live PubMed query in a new tab —
            it does not return a fabricated list of "matching" papers.
          </p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              window.open(searchUrl, "_blank");
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search PubMed for peptide-MHC literature..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-literature"
              />
            </div>
            <Button type="submit" data-testid="button-search-pubmed">
              <ExternalLink className="w-4 h-4 mr-2" />
              Search PubMed
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Key Researchers — real, publicly known names in this field; not tied to any fabricated paper data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>Selected Background Reading</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <h4 className="font-medium mb-3">Key Researchers in Peptide-MHC / Immunoinformatics</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>Morten Nielsen (DTU)</div>
              <div>Bjoern Peters (La Jolla Institute)</div>
              <div>Alessandro Sette (La Jolla Institute)</div>
              <div>Tim O'Donnell (MSKCC)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Resources Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Key Databases for Peptide-MHC Research</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {keyDatabases.map((db) => (
              <div key={db.name} className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">{db.name}</h4>
                <p className="text-sm text-muted-foreground">{db.description}</p>
                <div className="space-y-1">
                  <span className="text-xs font-medium">Data Types:</span>
                  <div className="flex flex-wrap gap-1">
                    {db.dataTypes.map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(db.url, '_blank')}
                  className="w-full"
                  data-testid={`button-database-${db.name.toLowerCase()}`}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Visit Database
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Integration Available:</strong> Use our Database Integration page to search and import data 
              directly from these sources into your research workflows.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}