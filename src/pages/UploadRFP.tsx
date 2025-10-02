import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Sparkles, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const UploadRFP = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rfpData, setRfpData] = useState({
    title: "",
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 20MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!rfpData.title) {
      toast({
        title: "Title required",
        description: "Please provide a title for the RFP",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "PDF required",
        description: "Please upload a PDF document",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create RFP entry first
      const { data: rfp, error: rfpError } = await supabase
        .from("rfps")
        .insert({
          title: rfpData.title,
          status: "pending",
        })
        .select()
        .single();

      if (rfpError) throw rfpError;

      // Upload PDF to storage
      const fileName = `${rfp.id}/${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("rfp-documents")
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload PDF");
      }

      // Update RFP with document URL
      const { error: updateError } = await supabase
        .from("rfps")
        .update({ document_url: `rfp-documents/${fileName}` })
        .eq("id", rfp.id);

      if (updateError) throw updateError;

      toast({
        title: "Processing PDF",
        description: "AI is extracting key information from your document...",
      });

      // Call edge function to process the PDF
      const { data: processData, error: processError } = await supabase.functions.invoke(
        'process-rfp-pdf',
        { body: { rfpId: rfp.id } }
      );

      if (processError) {
        console.error("Processing error:", processError);
        toast({
          title: "Processing completed with warnings",
          description: "RFP created but some information may need manual review",
        });
      } else {
        toast({
          title: "RFP created successfully",
          description: "AI has extracted key requirements and information",
        });
      }

      navigate(`/rfp/${rfp.id}`);
    } catch (error) {
      console.error("Error creating RFP:", error);
      toast({
        title: "Error creating RFP",
        description: error instanceof Error ? error.message : "Please try again",
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
            Upload a PDF and let AI extract requirements, deadlines, and budget automatically
          </p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center">
              <FileText className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">RFP Information</h2>
              <p className="text-sm text-muted-foreground">Provide basic details and upload PDF</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Project Name *</label>
              <Input
                value={rfpData.title}
                onChange={(e) => setRfpData({ ...rfpData, title: e.target.value })}
                placeholder="e.g., Cloud Infrastructure Modernization"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">RFP Document (PDF) *</label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {selectedFile ? (
                    <>
                      <File className="w-12 h-12 text-primary" />
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button type="button" variant="outline" size="sm">
                        Change File
                      </Button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload PDF</p>
                      <p className="text-xs text-muted-foreground">
                        Maximum file size: 20MB
                      </p>
                    </>
                  )}
                </label>
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
              <h3 className="font-semibold mb-2">AI-Powered Extraction</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Our AI will automatically analyze the PDF and extract:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li>• Client information and project deadlines</li>
                <li>• Budget ranges and currency</li>
                <li>• Required technologies and technical requirements</li>
                <li>• Compliance and operational requirements</li>
                <li>• Priority levels for each requirement</li>
              </ul>
              <Button
                onClick={handleSubmit}
                disabled={isProcessing || !rfpData.title || !selectedFile}
                className="bg-gradient-hero hover:shadow-primary"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing PDF...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upload & Process RFP
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default UploadRFP;
