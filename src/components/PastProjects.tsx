import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PastProjectsProps {
  companyId: string;
}

const PastProjects = ({ companyId }: PastProjectsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newProject, setNewProject] = useState({
    project_name: "",
    client_name: "",
    completion_date: "",
    budget: "",
    description: "",
    outcome: "",
    technologies_used: [] as string[],
  });
  const [newTech, setNewTech] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["past_projects", companyId],
    queryFn: async () => {
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
      const { error } = await supabase.from("past_projects").insert({
        ...project,
        company_id: companyId,
        budget: project.budget ? parseFloat(project.budget) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["past_projects"] });
      setNewProject({
        project_name: "",
        client_name: "",
        completion_date: "",
        budget: "",
        description: "",
        outcome: "",
        technologies_used: [],
      });
      setIsAdding(false);
      toast({ title: "Proyecto añadido al historial" });
    },
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Historial de Proyectos</h2>
        <Button onClick={() => setIsAdding(!isAdding)} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Añadir Proyecto
        </Button>
      </div>

      {isAdding && (
        <Card className="p-4 mb-4 bg-secondary/50">
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                placeholder="Nombre del Proyecto"
                value={newProject.project_name}
                onChange={(e) => setNewProject({ ...newProject, project_name: e.target.value })}
              />
              <Input
                placeholder="Cliente"
                value={newProject.client_name}
                onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                type="date"
                value={newProject.completion_date}
                onChange={(e) => setNewProject({ ...newProject, completion_date: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Presupuesto (€)"
                value={newProject.budget}
                onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
              />
            </div>
            <Textarea
              placeholder="Descripción del proyecto"
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              rows={2}
            />
            <Textarea
              placeholder="Resultado/Outcome"
              value={newProject.outcome}
              onChange={(e) => setNewProject({ ...newProject, outcome: e.target.value })}
              rows={2}
            />
            <div>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Tecnologías usadas"
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newTech.trim()) {
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
              <div className="flex flex-wrap gap-1">
                {newProject.technologies_used.map((tech, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tech}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => {
                        setNewProject({
                          ...newProject,
                          technologies_used: newProject.technologies_used.filter((_, i) => i !== idx)
                        });
                      }}
                    />
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => addProjectMutation.mutate(newProject)}
                disabled={!newProject.project_name || addProjectMutation.isPending}
                className="flex-1"
              >
                Guardar Proyecto
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {projects?.map((project) => (
          <Card key={project.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{project.project_name}</h3>
                <p className="text-sm text-muted-foreground">{project.client_name}</p>
              </div>
              <div className="flex gap-2 text-sm text-muted-foreground">
                {project.completion_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(project.completion_date), 'MMM yyyy')}
                  </div>
                )}
                {project.budget && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    €{project.budget.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            {project.description && (
              <p className="text-sm mb-2">{project.description}</p>
            )}
            {project.outcome && (
              <p className="text-sm text-success mb-2">✓ {project.outcome}</p>
            )}
            {project.technologies_used && project.technologies_used.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {project.technologies_used.map((tech, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </Card>
  );
};

export default PastProjects;
