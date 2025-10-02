import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Calendar, DollarSign, FileText, Sparkles, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import jsPDF from "jspdf";
import { Eye, EyeOff } from "lucide-react";

const RFPDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatedTemplate, setGeneratedTemplate] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBudget, setShowBudget] = useState(false);

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
        .eq("rfp_id", id)
        .order("priority", { ascending: false });
      
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

  const { data: existingResponse } = useQuery({
    queryKey: ["rfp_response", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfp_responses")
        .select("*")
        .eq("rfp_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const generateTemplateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'generate-response-template',
        { body: { rfpId: id } }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setGeneratedTemplate(data.template);
      queryClient.invalidateQueries({ queryKey: ["rfp_response", id] });
      toast({
        title: "Template generated successfully",
        description: "Review and refine the AI-generated response below",
      });
    },
    onError: (error) => {
      console.error("Generation error:", error);
      toast({
        title: "Failed to generate template",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleGenerateTemplate = () => {
    if (!company) {
      toast({
        title: "Company profile required",
        description: "Please complete your company profile first",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    generateTemplateMutation.mutate();
    setTimeout(() => setIsGenerating(false), 500);
  };

  const handleGeneratePDF = () => {
    const content = generatedTemplate || existingResponse?.draft_content || "";
    
    if (!content) {
      toast({
        title: "No content to export",
        description: "Please generate a template first",
        variant: "destructive",
      });
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Set up formatting
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxLineWidth = pageWidth - (margin * 2);
      
      // Add header
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(rfp.title, margin, margin);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Client: ${rfp.client_name || 'N/A'}`, margin, margin + 10);
      doc.text(`Date: ${format(new Date(), "MMMM d, yyyy")}`, margin, margin + 15);
      
      // Add a line separator
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 20, pageWidth - margin, margin + 20);
      
      // Add content
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      const lines = doc.splitTextToSize(content, maxLineWidth);
      let currentY = margin + 30;
      
      lines.forEach((line: string) => {
        if (currentY > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }
        doc.text(line, margin, currentY);
        currentY += 5;
      });

      // Save the PDF
      const fileName = `RFP_Response_${rfp.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF generated successfully",
        description: `Downloaded as ${fileName}`,
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Failed to generate PDF",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Calculate compliance - VERY LENIENT MATCHING
  const getComplianceStatus = (requirement: any) => {
    if (!company?.company_capabilities) return "unknown";
    
    // Split requirement into individual words (minimum 3 characters to avoid noise)
    const requirementWords = requirement.requirement_text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word: string) => word.length >= 3);
    
    // Check if ANY word in requirement matches ANY word in ANY capability
    const hasMatch = company.company_capabilities.some((cap) => {
      const capabilityWords = cap.capability
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((word: string) => word.length >= 3);
      
      // Also check category words
      const categoryWords = cap.category
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((word: string) => word.length >= 3);
      
      const allCapabilityWords = [...capabilityWords, ...categoryWords];
      
      return requirementWords.some((reqWord: string) =>
        allCapabilityWords.some((capWord: string) => 
          reqWord.includes(capWord) || capWord.includes(reqWord)
        )
      );
    });

    return hasMatch ? "met" : "not_met";
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

  const statusColors = {
    pending: "outline",
    active: "default",
    proposal_submitted: "secondary",
    accepted: "default",
    rejected: "destructive"
  } as const;

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
            <Badge 
              variant={statusColors[rfp.status as keyof typeof statusColors] || "outline"} 
              className="text-sm"
            >
              {rfp.status === "proposal_submitted" ? "Proposal Submitted" : rfp.status}
            </Badge>
          </div>

          {rfp.description && (
            <p className="text-muted-foreground">{rfp.description}</p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {rfp.deadline && (
            <Card className="p-4 bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/15 flex items-center justify-center">
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
            <Card className="p-4 bg-gradient-to-br from-success/5 to-success/10 border-success/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className={`font-semibold ${!showBudget ? 'blur-sm select-none' : ''}`}>
                    {rfp.budget_min && rfp.budget_max
                      ? `$${rfp.budget_min.toLocaleString()} - $${rfp.budget_max.toLocaleString()}`
                      : rfp.budget_min
                      ? `$${rfp.budget_min.toLocaleString()}+`
                      : `Up to $${rfp.budget_max?.toLocaleString()}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBudget(!showBudget)}
                  className="h-8 w-8 p-0"
                >
                  {showBudget ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </Card>
          )}

          <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
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
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                compliancePercentage >= 80 ? 'bg-success/10' :
                compliancePercentage >= 60 ? 'bg-warning/10' :
                'bg-destructive/10'
              }`}>
                <Sparkles className={`w-6 h-6 ${
                  compliancePercentage >= 80 ? 'text-success' :
                  compliancePercentage >= 60 ? 'text-warning' :
                  'text-destructive'
                }`} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Compatibility Analysis</h2>
                <p className="text-sm text-muted-foreground">
                  Matching against your company capabilities
                </p>
              </div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                compliancePercentage >= 80 ? 'text-success' :
                compliancePercentage >= 60 ? 'text-warning' :
                'text-destructive'
              }`}>
                {compliancePercentage}%
              </div>
              <div className="text-sm text-muted-foreground">Match Score</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
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
            <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  <strong>Note:</strong> Complete your company profile to see personalized compliance matching
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Response Template</h2>
              <p className="text-sm text-muted-foreground">
                AI-generated proposal draft based on your capabilities
              </p>
            </div>
            <Button
              onClick={handleGenerateTemplate}
              disabled={isGenerating || generateTemplateMutation.isPending || !company}
              className="bg-gradient-hero hover:shadow-primary"
            >
              {isGenerating || generateTemplateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Template
                </>
              )}
            </Button>
          </div>

          {(generatedTemplate || existingResponse?.draft_content) && (
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Note:</strong> This is an AI-generated draft. Please review and refine before submission.
                </p>
              </div>
              <Textarea
                value={generatedTemplate || existingResponse?.draft_content || ""}
                onChange={(e) => setGeneratedTemplate(e.target.value)}
                rows={20}
                className="font-mono text-sm"
                placeholder="Your response template will appear here..."
              />
              <div className="flex gap-2">
                <Button variant="outline">Save Draft</Button>
                <Button onClick={handleGeneratePDF}>Generate PDF & Submit</Button>
              </div>
            </div>
          )}

          {!generatedTemplate && !existingResponse?.draft_content && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No template generated yet</p>
              <p className="text-sm text-muted-foreground">
                Click "Generate Template" to create an AI-powered response
              </p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default RFPDetail;
