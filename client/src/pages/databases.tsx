import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Download, Search, Database, Globe, FileText, Dna } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Databases() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDatabase, setSelectedDatabase] = useState("iedb");
  const { toast } = useToast();

  const databases = [
    {
      id: "iedb",
      name: "IEDB (Immune Epitope Database)",
      description: "The largest repository of experimentally characterized immune epitopes",
      url: "https://www.iedb.org",
      apiUrl: "https://www.iedb.org/api/",
      dataTypes: ["MHC-I binding", "MHC-II binding", "T-cell assays", "B-cell assays"],
      access: "Free",
      lastUpdated: "2024-12-01",
      totalRecords: "1.2M+",
      icon: Database,
      color: "bg-blue-500",
      features: [
        "MHC binding prediction tools",
        "Epitope mapping",
        "Population coverage analysis",
        "Immunogenicity prediction"
      ]
    },
    {
      id: "uniprot",
      name: "UniProt",
      description: "Comprehensive protein sequence and annotation database",
      url: "https://www.uniprot.org",
      apiUrl: "https://rest.uniprot.org/",
      dataTypes: ["Protein sequences", "Functional annotations", "Post-translational modifications"],
      access: "Free",
      lastUpdated: "2024-11-15",
      totalRecords: "245M+",
      icon: Dna,
      color: "bg-green-500",
      features: [
        "Protein sequence retrieval",
        "Functional annotations",
        "Cross-references to other databases",
        "Proteome analysis"
      ]
    },
    {
      id: "pdb",
      name: "Protein Data Bank (PDB)",
      description: "3D structural data of biological macromolecules",
      url: "https://www.rcsb.org",
      apiUrl: "https://data.rcsb.org/rest/v1/",
      dataTypes: ["3D structures", "X-ray crystallography", "NMR", "Cryo-EM"],
      access: "Free",
      lastUpdated: "2024-12-05",
      totalRecords: "210K+",
      icon: Globe,
      color: "bg-purple-500",
      features: [
        "3D structure visualization",
        "Structural analysis tools",
        "Molecular dynamics data",
        "Binding site identification"
      ]
    },
    {
      id: "hla_imt",
      name: "HLA-IMT Database",
      description: "International HLA and Immunogenetics Workshop database",
      url: "https://www.ebi.ac.uk/ipd/imgt/hla/",
      apiUrl: "https://www.ebi.ac.uk/Tools/dbfetch/dbfetch/",
      dataTypes: ["HLA alleles", "Immunogenetic data", "Population frequencies"],
      access: "Free",
      lastUpdated: "2024-10-30",
      totalRecords: "35K+",
      icon: FileText,
      color: "bg-orange-500",
      features: [
        "HLA allele sequences",
        "Population frequency data",
        "Nomenclature standards",
        "Genetic diversity analysis"
      ]
    },
    {
      id: "syfpeithi",
      name: "SYFPEITHI",
      description: "Database of MHC ligands and peptide motifs",
      url: "https://www.syfpeithi.de",
      apiUrl: null,
      dataTypes: ["MHC ligands", "Binding motifs", "Anchor positions"],
      access: "Free",
      lastUpdated: "2023-08-15",
      totalRecords: "7K+",
      icon: Search,
      color: "bg-red-500",
      features: [
        "MHC binding motifs",
        "Peptide scoring algorithms",
        "Allele-specific predictions",
        "Literature-curated data"
      ]
    },
    {
      id: "mhcflurry",
      name: "MHCflurry Dataset",
      description: "Open-source MHC binding affinity prediction datasets",
      url: "https://github.com/openvax/mhcflurry",
      apiUrl: "https://api.github.com/repos/openvax/mhcflurry/",
      dataTypes: ["Training datasets", "Benchmark data", "Model weights"],
      access: "Open Source",
      lastUpdated: "2024-09-20",
      totalRecords: "2M+",
      icon: Download,
      color: "bg-gray-700",
      features: [
        "Pre-trained models",
        "Benchmark datasets",
        "Cross-validation data",
        "Model performance metrics"
      ]
    }
  ];

  const handleDatabaseSearch = async (dbId: string, query: string) => {
    if (!query.trim()) {
      toast({
        title: "Search query required",
        description: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }

    const database = databases.find(db => db.id === dbId);
    if (database?.apiUrl) {
      toast({
        title: "Searching database",
        description: `Querying ${database.name} for: ${query}`,
      });
      // Here you would implement actual API calls to the databases
    } else {
      window.open(database?.url, '_blank');
    }
  };

  const handleDataImport = (dbId: string) => {
    const database = databases.find(db => db.id === dbId);
    toast({
      title: "Import initiated",
      description: `Starting data import from ${database?.name}`,
    });
    // Implement actual data import functionality
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Database Integration</h1>
          <p className="text-muted-foreground">
            Access and integrate data from leading immunological and protein databases
          </p>
        </div>
      </div>

      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList>
          <TabsTrigger value="browse">Browse Databases</TabsTrigger>
          <TabsTrigger value="search">Search & Import</TabsTrigger>
          <TabsTrigger value="status">Connection Status</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {databases.map((db) => (
              <Card key={db.id} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${db.color}`}>
                      <db.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{db.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {db.access}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {db.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-medium">Records:</span>
                      <div className="text-muted-foreground">{db.totalRecords}</div>
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span>
                      <div className="text-muted-foreground">{db.lastUpdated}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-medium">Data Types:</span>
                    <div className="flex flex-wrap gap-1">
                      {db.dataTypes.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-medium">Key Features:</span>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {db.features.slice(0, 3).map((feature) => (
                        <li key={feature}>• {feature}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(db.url, '_blank')}
                      className="flex-1"
                      data-testid={`button-visit-${db.id}`}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Visit
                    </Button>
                    {db.apiUrl && (
                      <Button
                        size="sm"
                        onClick={() => handleDataImport(db.id)}
                        className="flex-1"
                        data-testid={`button-import-${db.id}`}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Import
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Enter peptide sequence, protein ID, or search terms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-database-search"
                  />
                </div>
                <Button
                  onClick={() => handleDatabaseSearch(selectedDatabase, searchQuery)}
                  data-testid="button-search-database"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {databases.filter(db => db.apiUrl).map((db) => (
                  <Button
                    key={db.id}
                    variant={selectedDatabase === db.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDatabase(db.id)}
                    data-testid={`button-select-${db.id}`}
                  >
                    <db.icon className="w-3 h-3 mr-1" />
                    {db.name.split(' ')[0]}
                  </Button>
                ))}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Search Examples:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <code>SIINFEKL</code> - Search for specific peptide sequence</li>
                  <li>• <code>HLA-A*02:01</code> - Find allele-specific data</li>
                  <li>• <code>P53_HUMAN</code> - Search protein entries</li>
                  <li>• <code>influenza epitope</code> - Text-based search</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {databases.map((db) => (
              <Card key={db.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <db.icon className="w-5 h-5" />
                    <span>{db.name}</span>
                    <Badge variant={db.apiUrl ? "default" : "secondary"}>
                      {db.apiUrl ? "API Available" : "Web Only"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Connection Status:</span>
                      <span className="text-sm text-green-600">● Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Last Sync:</span>
                      <span className="text-sm text-muted-foreground">{db.lastUpdated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Access Level:</span>
                      <span className="text-sm">{db.access}</span>
                    </div>
                    {db.apiUrl && (
                      <div className="pt-2">
                        <Button variant="outline" size="sm" className="w-full">
                          Test Connection
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}