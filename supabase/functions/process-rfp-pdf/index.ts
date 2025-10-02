import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rfpId } = await req.json();
    
    if (!rfpId) {
      return new Response(
        JSON.stringify({ error: "RFP ID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing RFP: ${rfpId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get RFP data
    const { data: rfp, error: rfpError } = await supabase
      .from('rfps')
      .select('*')
      .eq('id', rfpId)
      .single();

    if (rfpError || !rfp) {
      console.error("RFP fetch error:", rfpError);
      return new Response(
        JSON.stringify({ error: "RFP not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rfp.document_url) {
      return new Response(
        JSON.stringify({ error: "No document attached to this RFP" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the PDF file
    const filePath = rfp.document_url.replace('rfp-documents/', '');
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('rfp-documents')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("File download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download PDF" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert PDF to text (simple extraction - in production, use proper PDF parser)
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfText = new TextDecoder().decode(arrayBuffer);

    // Use Lovable AI to extract structured information
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing RFP documents. Extract key information in JSON format."
          },
          {
            role: "user",
            content: `Analyze this RFP document and extract the following information in JSON format:
{
  "client_name": "client or company name if found",
  "deadline": "deadline date in ISO format (YYYY-MM-DD) if found",
  "budget_min": number or null,
  "budget_max": number or null,
  "currency": "USD or other currency",
  "description": "brief project description",
  "required_technologies": ["list", "of", "technologies"],
  "requirements": [
    {
      "text": "requirement description",
      "category": "Technical/Compliance/Operations/Business",
      "priority": "high/medium/low",
      "is_mandatory": true/false
    }
  ]
}

RFP Content:
${pdfText.substring(0, 50000)}` // Limit to avoid token limits
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_rfp_data",
              description: "Extract structured data from RFP document",
              parameters: {
                type: "object",
                properties: {
                  client_name: { type: "string" },
                  deadline: { type: "string" },
                  budget_min: { type: "number" },
                  budget_max: { type: "number" },
                  currency: { type: "string" },
                  description: { type: "string" },
                  required_technologies: {
                    type: "array",
                    items: { type: "string" }
                  },
                  requirements: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        category: { type: "string" },
                        priority: { type: "string" },
                        is_mandatory: { type: "boolean" }
                      },
                      required: ["text", "category", "priority", "is_mandatory"]
                    }
                  }
                },
                required: ["requirements"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_rfp_data" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData));

    // Extract the function call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted data:", extractedData);

    // Update RFP with extracted information
    const { error: updateError } = await supabase
      .from('rfps')
      .update({
        client_name: extractedData.client_name || rfp.client_name,
        deadline: extractedData.deadline || rfp.deadline,
        budget_min: extractedData.budget_min || rfp.budget_min,
        budget_max: extractedData.budget_max || rfp.budget_max,
        currency: extractedData.currency || rfp.currency,
        description: extractedData.description || rfp.description,
        required_technologies: extractedData.required_technologies || [],
        extracted_data: extractedData,
        status: 'active'
      })
      .eq('id', rfpId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    // Insert requirements
    if (extractedData.requirements && extractedData.requirements.length > 0) {
      const requirementsToInsert = extractedData.requirements.map((req: any) => ({
        rfp_id: rfpId,
        requirement_text: req.text,
        category: req.category,
        priority: req.priority,
        is_mandatory: req.is_mandatory
      }));

      const { error: reqError } = await supabase
        .from('rfp_requirements')
        .insert(requirementsToInsert);

      if (reqError) {
        console.error("Requirements insert error:", reqError);
        // Don't fail the whole operation if requirements fail
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedData,
        message: "RFP processed successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in process-rfp-pdf:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
