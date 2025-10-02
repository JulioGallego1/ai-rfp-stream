import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Calendar, DollarSign, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PastProjectsProps {
  companyId: string | undefined;
}

const PastProjects = ({ companyId }: PastProjectsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProject, setNewProject] = useState({
    project_name: "",
    client_name: "",
    description: "",
    outcome: "",
    completion_date: "",
    budget: null as number | null,
    technologies_used: [] as string[],
  });
  const [newTech, setNewTech] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["past_projects", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("past_projects")
        .select("*")
        .eq("company_id", companyId)
        .order("completion_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const addProjectMutation = useMutation({
    mutationFn: async (project: typeof newProject) => {
      if (!companyId) throw new Error("Company profile must be created first");
      
      const { error } = await supabase
        .from("past_projects")
        .insert({ ...project, company_id: companyId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["past_projects"] });
      setNewProject({
        project_name: "",
        client_name: "",
        description: "",
        outcome: "",
        completion_date: "",
        budget: null,
        technologies_used: [],
      });
      setShowAddForm(false);
      toast({ title: "Project added successfully" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("past_projects")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["past_projects"] });
      toast({ title: "Project removed" });
    },
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Past Projects</h2>
          <p className="text-sm text-muted-foreground">
            Track your completed RFPs and demonstrate work capacity
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={!companyId}
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showAddForm ? "Cancel" : "Add Project"}
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-4 mb-6 bg-secondary/50">
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Project Name</label>
                <Input
                  value={newProject.project_name}
                  onChange={(e) => setNewProject({ ...newProject, project_name: e.target.value })}
                  placeholder="Digital Transformation Initiative"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Client Name</label>
                <Input
                  value={newProject.client_name || ""}
                  onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Completion Date</label>
                <Input
                  type="date"
                  value={newProject.completion_date}
                  onChange={(e) => setNewProject({ ...newProject, completion_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Budget (USD)</label>
                <Input
                  type="number"
                  value={newProject.budget || ""}
                  onChange={(e) => setNewProject({ ...newProject, budget: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="500000"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={newProject.description || ""}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Brief description of the project..."
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Outcome</label>
              <Textarea
                value={newProject.outcome || ""}
                onChange={(e) => setNewProject({ ...newProject, outcome: e.target.value })}
                placeholder="Project results and achievements..."
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Technologies Used</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newTech}
                    onChange={(e) => setNewTech(e.target.value)}
                    placeholder="e.g., React, AWS, PostgreSQL"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newTech.trim()) {
                        e.preventDefault();
                        setNewProject({
                          ...newProject,
                          technologies_used: [...newProject.technologies_used, newTech.trim()]
                        });
                        setNewTech("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newTech.trim()) {
                        setNewProject({
                          ...newProject,
                          technologies_used: [...newProject.technologies_used, newTech.trim()]
                        });
                        setNewTech("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newProject.technologies_used.map((tech, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tech}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => {
                          setNewProject({
                            ...newProject,
                            technologies_used: newProject.technologies_used.filter((_, i) => i !== index)
                          });
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={() => addProjectMutation.mutate(newProject)}
              disabled={!newProject.project_name || addProjectMutation.isPending}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {projects && projects.length > 0 ? (
          projects.map((project) => (
            <Card key={project.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">{project.project_name}</h3>
                  </div>
                  
                  {project.client_name && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Client: {project.client_name}
                    </p>
                  )}

                  {project.description && (
                    <p className="text-sm mb-3">{project.description}</p>
                  )}

                  {project.outcome && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Outcome:</p>
                      <p className="text-sm">{project.outcome}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mb-3 text-sm text-muted-foreground">
                    {project.completion_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(project.completion_date).toLocaleDateString()}
                      </div>
                    )}
                    {project.budget && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {project.budget.toLocaleString()} USD
                      </div>
                    )}
                  </div>

                  {project.technologies_used && project.technologies_used.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.technologies_used.map((tech, index) => (
                        <Badge key={index} variant="outline">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteProjectMutation.mutate(project.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No past projects yet. Add your first completed project above.</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PastProjects;
