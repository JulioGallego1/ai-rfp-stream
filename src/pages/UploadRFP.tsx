import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const UploadRFP = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [rfpData, setRfpData] = useState({
    title: "",
    client_name: "",
    description: "",
    deadline: "",
    budget_min: "",
    budget_max: "",
  });

  const handleSubmit = async () => {
    if (!rfpData.title) {
      toast({
        title: "Title required",
        description: "Please provide a title for the RFP",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase
        .from("rfps")
        .insert({
          title: rfpData.title,
          client_name: rfpData.client_name || null,
          description: rfpData.description || null,
          deadline: rfpData.deadline ? new Date(rfpData.deadline).toISOString() : null,
          budget_min: rfpData.budget_min ? parseFloat(rfpData.budget_min) : null,
          budget_max: rfpData.budget_max ? parseFloat(rfpData.budget_max) : null,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      // Create sample requirements for demo
      await supabase.from("rfp_requirements").insert([
        {
          rfp_id: data.id,
          requirement_text: "Cloud infrastructure experience",
          category: "Technical",
          priority: "high",
          is_mandatory: true,
        },
        {
          rfp_id: data.id,
          requirement_text: "ISO 27001 certification",
          category: "Compliance",
          priority: "high",
          is_mandatory: true,
        },
        {
          rfp_id: data.id,
          requirement_text: "24/7 support availability",
          category: "Operations",
          priority: "medium",
          is_mandatory: false,
        },
      ]);

      toast({
        title: "RFP created successfully",
        description: "Sample requirements have been added for demo purposes",
      });

      navigate(`/rfp/${data.id}`);
    } catch (error) {
      console.error("Error creating RFP:", error);
      toast({
        title: "Error creating RFP",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Upload New RFP</h1>
          <p className="text-muted-foreground">
            Add RFP details and let AI extract key requirements automatically
          </p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center">
              <FileText className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">RFP Details</h2>
              <p className="text-sm text-muted-foreground">Enter basic information about the proposal</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">RFP Title *</label>
              <Input
                value={rfpData.title}
                onChange={(e) => setRfpData({ ...rfpData, title: e.target.value })}
                placeholder="e.g., Cloud Infrastructure Modernization"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Client Name</label>
              <Input
                value={rfpData.client_name}
                onChange={(e) => setRfpData({ ...rfpData, client_name: e.target.value })}
                placeholder="e.g., Government Agency XYZ"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={rfpData.description}
                onChange={(e) => setRfpData({ ...rfpData, description: e.target.value })}
                placeholder="Brief description of the RFP..."
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Deadline</label>
              <Input
                type="date"
                value={rfpData.deadline}
                onChange={(e) => setRfpData({ ...rfpData, deadline: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Minimum Budget (USD)</label>
                <Input
                  type="number"
                  value={rfpData.budget_min}
                  onChange={(e) => setRfpData({ ...rfpData, budget_min: e.target.value })}
                  placeholder="100000"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Maximum Budget (USD)</label>
                <Input
                  type="number"
                  value={rfpData.budget_max}
                  onChange={(e) => setRfpData({ ...rfpData, budget_max: e.target.value })}
                  placeholder="500000"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">AI-Powered Analysis</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Once created, you can upload the actual RFP document and our AI will automatically extract
                key requirements, deadlines, and evaluation criteria.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isProcessing || !rfpData.title}
                  className="bg-gradient-hero hover:shadow-primary"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Create RFP
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default UploadRFP;
