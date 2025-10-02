import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rfpId, companyId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching RFP and company data...');

    // Fetch RFP data
    const { data: rfp, error: rfpError } = await supabase
      .from('rfps')
      .select('*')
      .eq('id', rfpId)
      .single();

    if (rfpError || !rfp) {
      throw new Error('RFP not found');
    }

    // Fetch company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      throw new Error('Company not found');
    }

    // Fetch company capabilities
    const { data: capabilities } = await supabase
      .from('company_capabilities')
      .select('*')
      .eq('company_id', companyId);

    // Fetch past projects
    const { data: pastProjects } = await supabase
      .from('past_projects')
      .select('*')
      .eq('company_id', companyId)
      .order('completion_date', { ascending: false })
      .limit(5);

    // Fetch compliance checks
    const { data: compliance } = await supabase
      .from('compliance_checks')
      .select('*')
      .eq('rfp_id', rfpId)
      .eq('company_id', companyId);

    console.log('Generating RFP response with AI...');

    // Generate response template using AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert RFP response writer. Create a professional, compelling proposal response that:
            1. Highlights the company's strengths and capabilities
            2. Addresses all requirements mentioned in the RFP
            3. References past successful projects as proof of capability
            4. Explains why the company is the best fit for this project
            5. Uses a professional, confident tone
            
            Structure the response with these sections:
            - Executive Summary
            - Company Overview
            - Technical Approach
            - Team & Capabilities
            - Past Experience & References
            - Budget & Timeline
            - Why Choose Us
            
            Make it persuasive but honest. Do not make up information.`
          },
          {
            role: 'user',
            content: `Generate a proposal response for this RFP.
            
RFP Details:
${JSON.stringify(rfp, null, 2)}

Company Information:
${JSON.stringify(company, null, 2)}

Company Capabilities:
${JSON.stringify(capabilities, null, 2)}

Past Projects:
${JSON.stringify(pastProjects, null, 2)}

Compliance Status:
${JSON.stringify(compliance, null, 2)}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI processing failed: ${response.status}`);
    }

    const data = await response.json();
    const generatedResponse = data.choices[0].message.content;

    // Store the generated response
    const { error: insertError } = await supabase
      .from('rfp_responses')
      .insert({
        rfp_id: rfpId,
        company_id: companyId,
        section_title: 'Complete Proposal',
        draft_content: generatedResponse,
        status: 'draft',
      });

    if (insertError) {
      console.error('Error storing response:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, response: generatedResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-rfp-response:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
