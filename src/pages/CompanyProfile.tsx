import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Save, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PastProjects from "@/components/PastProjects";

const CompanyProfile = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [companyData, setCompanyData] = useState({
    name: "",
    description: "",
    industry: "",
    size: "",
    website: "",
    employee_count: null as number | null,
    available_funds: null as number | null,
    technologies: [] as string[],
  });
  const [newTechnology, setNewTechnology] = useState("");
  const [newCapability, setNewCapability] = useState({
    category: "",
    capability: "",
    proficiency_level: "intermediate",
  });

  const { data: company } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .limit(1)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      if (data) setCompanyData(data);
      return data;
    },
  });

  const { data: capabilities } = useQuery({
    queryKey: ["capabilities", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("company_capabilities")
        .select("*")
        .eq("company_id", company.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const saveCompanyMutation = useMutation({
    mutationFn: async (data: typeof companyData) => {
      if (company?.id) {
        const { error } = await supabase
          .from("companies")
          .update(data)
          .eq("id", company.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("companies").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast({ title: "Company profile saved successfully" });
    },
  });

  const addCapabilityMutation = useMutation({
    mutationFn: async (capability: typeof newCapability) => {
      if (!company?.id) throw new Error("Create company profile first");
      
      const { error } = await supabase
        .from("company_capabilities")
        .insert({ ...capability, company_id: company.id });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capabilities"] });
      setNewCapability({ category: "", capability: "", proficiency_level: "intermediate" });
      toast({ title: "Capability added successfully" });
    },
  });

  const deleteCapabilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("company_capabilities")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capabilities"] });
      toast({ title: "Capability removed" });
    },
  });

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Company Profile</h1>
          <p className="text-muted-foreground">
            Define your company's capabilities to automatically match against RFP requirements
          </p>
        </div>

        <Card className="p-8 bg-gradient-card border-2 shadow-lg">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-primary">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">Company Information</h2>
              <p className="text-muted-foreground">Basic details about your organization</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Company Name</label>
              <Input
                value={companyData.name}
                onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                placeholder="Acme Consulting"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={companyData.description || ""}
                onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                placeholder="Brief description of your company..."
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Industry</label>
                <Input
                  value={companyData.industry || ""}
                  onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                  placeholder="IT Services"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Company Size</label>
                <Input
                  value={companyData.size || ""}
                  onChange={(e) => setCompanyData({ ...companyData, size: e.target.value })}
                  placeholder="50-200 employees"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Website</label>
              <Input
                value={companyData.website || ""}
                onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Number of Employees</label>
                <Input
                  type="number"
                  value={companyData.employee_count || ""}
                  onChange={(e) => setCompanyData({ ...companyData, employee_count: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="250"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Available Funds (USD)</label>
                <Input
                  type="number"
                  value={companyData.available_funds || ""}
                  onChange={(e) => setCompanyData({ ...companyData, available_funds: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="1000000"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Technologies</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newTechnology}
                    onChange={(e) => setNewTechnology(e.target.value)}
                    placeholder="e.g., React, Node.js, AWS"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newTechnology.trim()) {
                        e.preventDefault();
                        setCompanyData({
                          ...companyData,
                          technologies: [...companyData.technologies, newTechnology.trim()]
                        });
                        setNewTechnology("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newTechnology.trim()) {
                        setCompanyData({
                          ...companyData,
                          technologies: [...companyData.technologies, newTechnology.trim()]
                        });
                        setNewTechnology("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {companyData.technologies.map((tech, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tech}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => {
                          setCompanyData({
                            ...companyData,
                            technologies: companyData.technologies.filter((_, i) => i !== index)
                          });
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={() => saveCompanyMutation.mutate(companyData)}
              disabled={!companyData.name || saveCompanyMutation.isPending}
              className="w-full bg-gradient-hero hover:shadow-xl hover:scale-105 transition-all text-white font-semibold py-6 text-lg shadow-primary"
            >
              <Save className="w-5 h-5 mr-2" />
              Save Company Profile
            </Button>
          </div>
        </Card>

        <Card className="p-8 bg-gradient-card border-2 shadow-lg">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-secondary bg-clip-text text-transparent">Capabilities</h2>
          
          <div className="space-y-4 mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Input
                  value={newCapability.category}
                  onChange={(e) => setNewCapability({ ...newCapability, category: e.target.value })}
                  placeholder="Cloud Services"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Capability</label>
                <Input
                  value={newCapability.capability}
                  onChange={(e) => setNewCapability({ ...newCapability, capability: e.target.value })}
                  placeholder="AWS Infrastructure"
                />
              </div>
            </div>

            <Button
              onClick={() => addCapabilityMutation.mutate(newCapability)}
              disabled={!newCapability.category || !newCapability.capability || !company?.id}
              className="w-full bg-gradient-secondary hover:shadow-xl hover:scale-105 transition-all text-white font-semibold py-4 shadow-secondary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Capability
            </Button>
          </div>

          <div className="space-y-2">
            {capabilities?.map((cap) => (
              <div
                key={cap.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-muted to-secondary/50 rounded-xl shadow-md hover:shadow-lg transition-all border border-border/50"
              >
                <div>
                  <Badge variant="outline" className="mb-1">
                    {cap.category}
                  </Badge>
                  <p className="font-medium">{cap.capability}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCapabilityMutation.mutate(cap.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <PastProjects companyId={company?.id} />
      </div>
    </Layout>
  );
};

export default CompanyProfile;
