import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Calendar, DollarSign, FileText, Sparkles } from "lucide-react";
import { format } from "date-fns";

const RFPDetail = () => {
  const { id } = useParams();

  const { data: rfp, isLoading } = useQuery({
    queryKey: ["rfp", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfps")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: requirements } = useQuery({
    queryKey: ["requirements", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfp_requirements")
        .select("*")
        .eq("rfp_id", id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: company } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          *,
          company_capabilities(*)
        `)
        .limit(1)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Simulate compliance matching
  const getComplianceStatus = (requirement: any) => {
    if (!company?.company_capabilities) return "unknown";
    
    const matchingCapabilities = company.company_capabilities.filter((cap) =>
      requirement.requirement_text.toLowerCase().includes(cap.capability.toLowerCase()) ||
      cap.capability.toLowerCase().includes(requirement.requirement_text.toLowerCase())
    );

    return matchingCapabilities.length > 0 ? "met" : "not_met";
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading RFP details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!rfp) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">RFP not found</h2>
          <p className="text-muted-foreground">The RFP you're looking for doesn't exist.</p>
        </div>
      </Layout>
    );
  }

  const metRequirements = requirements?.filter(req => getComplianceStatus(req) === "met").length || 0;
  const totalRequirements = requirements?.length || 0;
  const compliancePercentage = totalRequirements > 0 ? Math.round((metRequirements / totalRequirements) * 100) : 0;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{rfp.title}</h1>
              {rfp.client_name && (
                <p className="text-muted-foreground text-lg">{rfp.client_name}</p>
              )}
            </div>
            <Badge variant={rfp.status === "active" ? "default" : "secondary"} className="text-sm">
              {rfp.status}
            </Badge>
          </div>

          {rfp.description && (
            <p className="text-muted-foreground">{rfp.description}</p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {rfp.deadline && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deadline</p>
                  <p className="font-semibold">{format(new Date(rfp.deadline), "MMM d, yyyy")}</p>
                </div>
              </div>
            </Card>
          )}

          {(rfp.budget_min || rfp.budget_max) && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="font-semibold">
                    {rfp.budget_min && rfp.budget_max
                      ? `$${rfp.budget_min.toLocaleString()} - $${rfp.budget_max.toLocaleString()}`
                      : rfp.budget_min
                      ? `$${rfp.budget_min.toLocaleString()}+`
                      : `Up to $${rfp.budget_max?.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requirements</p>
                <p className="font-semibold">{totalRequirements} total</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-success flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Compliance Analysis</h2>
                <p className="text-sm text-muted-foreground">
                  Automatic matching against your company capabilities
                </p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{compliancePercentage}%</div>
              <div className="text-sm text-muted-foreground">Match Score</div>
            </div>
          </div>

          <div className="space-y-3">
            {requirements?.map((req) => {
              const status = getComplianceStatus(req);
              return (
                <div
                  key={req.id}
                  className="flex items-start gap-4 p-4 bg-secondary/50 rounded-lg"
                >
                  {status === "met" ? (
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-medium">{req.requirement_text}</p>
                      <div className="flex gap-2 flex-shrink-0">
                        <Badge variant="outline">{req.category}</Badge>
                        {req.is_mandatory && (
                          <Badge variant="destructive" className="text-xs">
                            Mandatory
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Priority: {req.priority}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {!company && (
            <div className="mt-6 p-4 bg-warning-light rounded-lg border border-warning/20">
              <p className="text-sm text-warning-foreground">
                <strong>Note:</strong> Complete your company profile to see personalized compliance matching
              </p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default RFPDetail;
