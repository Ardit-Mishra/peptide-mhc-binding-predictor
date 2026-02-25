import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Share, Settings, Calendar, Folder, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Project, InsertProject } from "@shared/schema";

export default function Projects() {
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create project');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project created",
        description: "Your new project has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsCreateDialogOpen(false);
      setNewProjectName("");
      setNewProjectDescription("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Please provide a project name.",
        variant: "destructive",
      });
      return;
    }

    createProjectMutation.mutate({
      name: newProjectName,
      description: newProjectDescription,
      userId: "user-1", // We'll replace this with actual auth later
      isPublic: false,
    });
  };

  // Mock data for demonstration
  const mockProjects = [
    {
      id: "1",
      name: "Cancer Immunotherapy Research",
      description: "Analysis of tumor-associated peptides for HLA-A*02:01 binding prediction",
      userId: "user-1",
      isPublic: false,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-20"),
      collaborators: ["Dr. Smith", "Dr. Johnson"],
      batchCount: 5,
      predictionsCount: 247,
      status: "Active"
    },
    {
      id: "2", 
      name: "Viral Epitope Mapping",
      description: "Systematic analysis of SARS-CoV-2 peptide epitopes across multiple MHC alleles",
      userId: "user-1",
      isPublic: true,
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-18"),
      collaborators: ["Dr. Chen", "Dr. Williams", "Dr. Brown"],
      batchCount: 12,
      predictionsCount: 1203,
      status: "Active"
    },
    {
      id: "3",
      name: "Autoimmune Peptide Study",
      description: "Investigation of self-peptides implicated in autoimmune diseases",
      userId: "user-2",
      isPublic: false,
      createdAt: new Date("2024-01-05"),
      updatedAt: new Date("2024-01-12"),
      collaborators: ["Dr. Davis"],
      batchCount: 3,
      predictionsCount: 89,
      status: "Completed"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Research Projects</h1>
          <p className="text-muted-foreground">Organize and collaborate on peptide research projects</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-project">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name"
                  data-testid="input-project-name"
                />
              </div>
              <div>
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Describe your research project"
                  rows={3}
                  data-testid="textarea-project-description"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-project"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateProject}
                  disabled={createProjectMutation.isPending}
                  data-testid="button-confirm-create-project"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  <Folder className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  {project.isPublic && (
                    <Badge variant="outline" className="text-xs">
                      <Share className="w-3 h-3 mr-1" />
                      Public
                    </Badge>
                  )}
                  <Badge 
                    className={
                      project.status === "Active" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {project.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {project.description}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">{project.batchCount}</div>
                  <div className="text-muted-foreground">Batch Jobs</div>
                </div>
                <div>
                  <div className="font-medium">{project.predictionsCount}</div>
                  <div className="text-muted-foreground">Predictions</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Collaborators</span>
                  <Button size="sm" variant="ghost">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {project.collaborators.map((collaborator, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {collaborator}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Updated {project.updatedAt.toLocaleDateString()}</span>
                </div>
                <Button size="sm" variant="ghost">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex space-x-2">
                <Button size="sm" className="flex-1" data-testid={`button-open-project-${project.id}`}>
                  Open Project
                </Button>
                <Button size="sm" variant="outline" data-testid={`button-share-project-${project.id}`}>
                  <Share className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">3</div>
            <div className="text-sm text-muted-foreground">Active Projects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">20</div>
            <div className="text-sm text-muted-foreground">Total Batches</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">1,539</div>
            <div className="text-sm text-muted-foreground">Total Predictions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">7</div>
            <div className="text-sm text-muted-foreground">Collaborators</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}