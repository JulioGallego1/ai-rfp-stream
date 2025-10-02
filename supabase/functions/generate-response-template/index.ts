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

    console.log(`Generating response template for RFP: ${rfpId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get RFP data with requirements
    const { data: rfp, error: rfpError } = await supabase
      .from('rfps')
      .select(`
        *,
        rfp_requirements(*)
      `)
      .eq('id', rfpId)
      .single();

    if (rfpError || !rfp) {
      console.error("RFP fetch error:", rfpError);
      return new Response(
        JSON.stringify({ error: "RFP not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company data with capabilities and past projects
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select(`
        *,
        company_capabilities(*),
        past_projects(*)
      `)
      .limit(1)
      .single();

    if (companyError && companyError.code !== "PGRST116") {
      console.error("Company fetch error:", companyError);
    }

    if (!company) {
      return new Response(
        JSON.stringify({ error: "Please complete your company profile first" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI to generate response template
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context for AI
    const companyContext = `
Company: ${company.name}
Industry: ${company.industry || 'Not specified'}
Size: ${company.employee_count ? `${company.employee_count} employees` : 'Not specified'}
Available Funds: ${company.available_funds ? `$${company.available_funds.toLocaleString()}` : 'Not specified'}
Technologies: ${company.technologies?.join(', ') || 'None specified'}
Description: ${company.description || 'Not provided'}

Capabilities:
${company.company_capabilities?.map((cap: any) => 
  `- ${cap.category}: ${cap.capability} (${cap.proficiency_level})`
).join('\n') || 'No capabilities listed'}

Past Projects:
${company.past_projects?.map((proj: any) => 
  `- ${proj.project_name} for ${proj.client_name || 'undisclosed client'}
  Budget: $${proj.budget?.toLocaleString() || 'undisclosed'}
  Technologies: ${proj.technologies_used?.join(', ') || 'N/A'}
  Outcome: ${proj.outcome || 'N/A'}`
).join('\n\n') || 'No past projects listed'}
`;

    const rfpContext = `
RFP: ${rfp.title}
Client: ${rfp.client_name || 'Not specified'}
Deadline: ${rfp.deadline || 'Not specified'}
Budget: ${rfp.budget_min && rfp.budget_max 
  ? `$${rfp.budget_min.toLocaleString()} - $${rfp.budget_max.toLocaleString()}`
  : 'Not specified'}
Description: ${rfp.description || 'Not provided'}
Required Technologies: ${rfp.required_technologies?.join(', ') || 'Not specified'}

Requirements:
${rfp.rfp_requirements?.map((req: any) => 
  `- [${req.is_mandatory ? 'MANDATORY' : 'Optional'}] ${req.requirement_text} (${req.category}, Priority: ${req.priority})`
).join('\n') || 'No requirements listed'}
`;

    const prompt = `You are an expert proposal writer. Generate a comprehensive RFP response template based on the company's capabilities and the RFP requirements.

${companyContext}

${rfpContext}

Create a professional response template that:
1. Opens with a strong executive summary explaining why this company is the best choice
2. Addresses each requirement explicitly, showing how the company meets it
3. Highlights relevant past projects and success stories
4. Demonstrates technical capabilities matching the required technologies
5. Addresses budget and timeline realistically
6. Includes a compelling value proposition
7. Ends with next steps and contact information

Structure the response with clear sections. Be specific and reference actual company capabilities and past projects. Make it persuasive but realistic.`;

    console.log("Calling AI to generate template...");

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
            content: "You are an expert RFP response writer who creates compelling, professional proposals."
          },
          {
            role: "user",
            content: prompt
          }
        ],
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
    const generatedTemplate = aiData.choices?.[0]?.message?.content;

    if (!generatedTemplate) {
      throw new Error("No content in AI response");
    }

    console.log("Template generated successfully");

    // Save the response template to database
    const { error: saveError } = await supabase
      .from('rfp_responses')
      .insert({
        rfp_id: rfpId,
        company_id: company.id,
        section_title: 'AI Generated Response',
        draft_content: generatedTemplate,
        status: 'draft'
      });

    if (saveError) {
      console.error("Save error:", saveError);
      // Don't fail the whole operation if save fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        template: generatedTemplate,
        message: "Response template generated successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-response-template:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
