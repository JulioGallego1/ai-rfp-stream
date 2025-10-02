import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Building2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { format } from "date-fns";

const Dashboard = () => {
  const { data: rfps, isLoading } = useQuery({
    queryKey: ["rfps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfps")
        .select(`
          *,
          rfp_requirements(count),
          compliance_checks(count)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading RFPs...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Your RFPs</h1>
          <p className="text-muted-foreground">
            Manage and analyze your requests for proposals with AI-powered insights
          </p>
        </div>

        {rfps && rfps.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No RFPs yet</h3>
            <p className="text-muted-foreground mb-6">
              Upload your first RFP to get started with AI-powered analysis
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-hero text-primary-foreground rounded-lg font-medium hover:shadow-primary transition-all"
            >
              Upload Your First RFP
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rfps?.map((rfp) => (
              <Link key={rfp.id} to={`/rfp/${rfp.id}`}>
                <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {rfp.title}
                        </h3>
                        <Badge 
                          variant={
                            rfp.status === "accepted" ? "default" :
                            rfp.status === "rejected" ? "destructive" :
                            rfp.status === "proposal_submitted" ? "secondary" :
                            "outline"
                          }
                          className="ml-2"
                        >
                          {rfp.status === "proposal_submitted" ? "Proposal Submitted" : rfp.status}
                        </Badge>
                      </div>
                      {rfp.client_name && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          {rfp.client_name}
                        </div>
                      )}
                    </div>

                    {rfp.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {rfp.description}
                      </p>
                    )}

                    <div className="space-y-2">
                      {rfp.deadline && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-warning" />
                          <span className="text-muted-foreground">
                            Due: {format(new Date(rfp.deadline), "MMM d, yyyy")}
                          </span>
                        </div>
                      )}
                      
                      {(rfp.budget_min || rfp.budget_max) && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-success" />
                          <span className="text-muted-foreground blur-sm select-none">
                            {rfp.budget_min && rfp.budget_max
                              ? `${rfp.budget_min.toLocaleString()} - ${rfp.budget_max.toLocaleString()} ${rfp.currency}`
                              : rfp.budget_min
                              ? `${rfp.budget_min.toLocaleString()}+ ${rfp.currency}`
                              : `Up to ${rfp.budget_max?.toLocaleString()} ${rfp.currency}`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{rfp.rfp_requirements?.[0]?.count || 0} requirements</span>
                      </div>
                      {rfp.compatibility_score !== null && (
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-primary">
                            {Math.round(rfp.compatibility_score)}% match
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
