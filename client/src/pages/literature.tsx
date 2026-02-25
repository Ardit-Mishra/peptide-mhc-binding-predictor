import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, ExternalLink, Download, Star, Calendar, Database } from "lucide-react";

export default function Literature() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");

  // Mock literature data
  const mockPapers = [
    {
      id: "1",
      pubmedId: "35123456",
      title: "Deep learning approaches for peptide-MHC class I binding prediction: A comprehensive comparison",
      authors: "Smith, J.A., Johnson, M.B., Chen, L.W., Williams, R.K.",
      journal: "Nature Biotechnology",
      year: 2024,
      impact: 9.7,
      citations: 142,
      relevantSequences: ["GILGFVFTL", "NLVPMVATV", "AAGIGILTV"],
      abstract: "Recent advances in deep learning have revolutionized peptide-MHC binding prediction. This study compares CNN, LSTM, and transformer architectures...",
      keywords: ["MHC-I", "Deep Learning", "CNN", "LSTM", "Transformer"],
      url: "https://pubmed.ncbi.nlm.nih.gov/35123456"
    },
    {
      id: "2",
      pubmedId: "34987654",
      title: "NetMHCpan-4.1 and NetMHCIIpan-4.0: improved predictions of MHC antigen presentation",
      authors: "Reynisson, B., Alvarez, B., Paul, S., Peters, B., Nielsen, M.",
      journal: "Nucleic Acids Research",
      year: 2023,
      impact: 8.4,
      citations: 523,
      relevantSequences: ["KTWGQYWQV", "LLWNGPMAV"],
      abstract: "We present NetMHCpan-4.1 and NetMHCIIpan-4.0, updated versions of the widely used tools for MHC binding prediction...",
      keywords: ["NetMHCpan", "MHC-II", "Antigen Presentation", "Immunoinformatics"],
      url: "https://pubmed.ncbi.nlm.nih.gov/34987654"
    },
    {
      id: "3",
      pubmedId: "33456789",
      title: "Systematic evaluation of peptide-MHC binding prediction algorithms for personalized cancer immunotherapy",
      authors: "Garcia, M.C., Thompson, K.L., Anderson, P.R., Lee, S.H.",
      journal: "Cell",
      year: 2023,
      impact: 12.8,
      citations: 289,
      relevantSequences: ["AAGIGILTV", "GILGFVFTL"],
      abstract: "Personalized cancer immunotherapy relies on accurate prediction of tumor neoantigen presentation. We systematically evaluate...",
      keywords: ["Cancer Immunotherapy", "Neoantigens", "Personalized Medicine", "MHC Binding"],
      url: "https://pubmed.ncbi.nlm.nih.gov/33456789"
    }
  ];

  const topicFilters = [
    { value: "all", label: "All Topics", count: 156 },
    { value: "deep-learning", label: "Deep Learning", count: 42 },
    { value: "mhc-binding", label: "MHC Binding", count: 89 },
    { value: "immunotherapy", label: "Immunotherapy", count: 34 },
    { value: "neoantigens", label: "Neoantigens", count: 28 },
  ];

  const keyDatabases = [
    {
      name: "IEDB",
      description: "Immune Epitope Database - largest repository of immune epitope data",
      url: "https://www.iedb.org",
      relevantPapers: 523,
      dataTypes: ["MHC-I binding", "T-cell assays", "Epitope mapping"]
    },
    {
      name: "UniProt",
      description: "Universal protein database with comprehensive sequence data",
      url: "https://www.uniprot.org", 
      relevantPapers: 1247,
      dataTypes: ["Protein sequences", "Functional annotations", "PTMs"]
    },
    {
      name: "PDB",
      description: "Protein Data Bank with 3D structural information",
      url: "https://www.rcsb.org",
      relevantPapers: 892,
      dataTypes: ["3D structures", "Binding sites", "Molecular dynamics"]
    }
  ];

  const filteredPapers = mockPapers.filter(paper => {
    const matchesSearch = searchQuery === "" || 
      paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTopic = selectedTopic === "all" || 
      paper.keywords.some(keyword => keyword.toLowerCase().includes(selectedTopic.replace("-", " ")));
    
    return matchesSearch && matchesTopic;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Literature & References</h1>
          <p className="text-muted-foreground">Curated research papers and references for peptide-MHC binding studies</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search papers by title, authors, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-literature"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {topicFilters.map((topic) => (
            <Button
              key={topic.value}
              variant={selectedTopic === topic.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTopic(topic.value)}
              data-testid={`filter-${topic.value}`}
            >
              {topic.label} ({topic.count})
            </Button>
          ))}
        </div>
      </div>

      {/* Papers List */}
      <div className="space-y-4">
        {filteredPapers.map((paper) => (
          <Card key={paper.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Paper Header */}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {paper.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {paper.authors}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="font-medium">{paper.journal}</span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{paper.year}</span>
                      </span>
                      <span>Impact: {paper.impact}</span>
                      <span>{paper.citations} citations</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="ghost">
                      <Star className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={paper.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Abstract */}
                <p className="text-sm text-muted-foreground">
                  {paper.abstract}
                </p>

                {/* Keywords */}
                <div className="flex flex-wrap gap-2">
                  {paper.keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>

                {/* Relevant Sequences */}
                {paper.relevantSequences.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Relevant Sequences:</h4>
                    <div className="flex flex-wrap gap-2">
                      {paper.relevantSequences.map((sequence, index) => (
                        <Badge key={index} variant="outline" className="font-mono text-xs">
                          {sequence}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>PubMed ID: {paper.pubmedId}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" data-testid={`button-cite-${paper.id}`}>
                      Cite
                    </Button>
                    <Button size="sm" variant="outline" data-testid={`button-download-${paper.id}`}>
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                    <Button size="sm" data-testid={`button-analyze-sequences-${paper.id}`}>
                      Analyze Sequences
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Research Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>Research Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-3">Hot Topics (2024)</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Transformer Models</span>
                  <Badge>+127%</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cancer Neoantigens</span>
                  <Badge>+89%</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Multi-modal Learning</span>
                  <Badge>+76%</Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Top Journals</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Nature Biotechnology (IF: 9.7)</div>
                <div>Cell (IF: 12.8)</div>
                <div>Nucleic Acids Research (IF: 8.4)</div>
                <div>Bioinformatics (IF: 6.9)</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Key Researchers</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Morten Nielsen (DTU)</div>
                <div>Bjoern Peters (La Jolla)</div>
                <div>Alessandro Sette (La Jolla)</div>
                <div>Tim O'Donnell (MSKCC)</div>
              </div>
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
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{db.name}</h4>
                  <Badge variant="secondary">{db.relevantPapers} papers</Badge>
                </div>
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