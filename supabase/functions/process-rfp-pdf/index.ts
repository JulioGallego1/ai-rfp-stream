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
    const { pdfText, rfpId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Processing RFP PDF with AI...');

    // Use AI to extract structured information from the PDF
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
            content: `You are an expert at analyzing RFP documents. Extract the following information and return it as a JSON object:
            - title: Project title
            - client_name: Client/organization name
            - description: Brief project description
            - deadline: Deadline date (ISO format if found)
            - budget_min: Minimum budget
            - budget_max: Maximum budget
            - currency: Currency (USD, EUR, etc.)
            - required_technologies: Array of required technologies/skills
            - requirements: Array of specific requirements with these fields:
              - requirement_text: The requirement description
              - category: Category (technical, business, compliance, etc.)
              - is_mandatory: boolean
              - priority: low, medium, or high
            
            Return ONLY valid JSON, no additional text.`
          },
          {
            role: 'user',
            content: `Analyze this RFP document and extract the information:\n\n${pdfText}`
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
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);

    // Parse the JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(aiResponse);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', aiResponse);
      throw new Error('AI did not return valid JSON');
    }

    // Update the RFP with extracted data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabase
      .from('rfps')
      .update({
        title: extractedData.title || 'Untitled RFP',
        client_name: extractedData.client_name,
        description: extractedData.description,
        deadline: extractedData.deadline,
        budget_min: extractedData.budget_min,
        budget_max: extractedData.budget_max,
        currency: extractedData.currency || 'USD',
        required_technologies: extractedData.required_technologies || [],
        extracted_data: extractedData,
      })
      .eq('id', rfpId);

    if (updateError) {
      console.error('Error updating RFP:', updateError);
      throw updateError;
    }

    // Insert requirements if any
    if (extractedData.requirements && extractedData.requirements.length > 0) {
      const requirements = extractedData.requirements.map((req: any) => ({
        rfp_id: rfpId,
        requirement_text: req.requirement_text,
        category: req.category || 'general',
        is_mandatory: req.is_mandatory !== false,
        priority: req.priority || 'medium',
      }));

      const { error: reqError } = await supabase
        .from('rfp_requirements')
        .insert(requirements);

      if (reqError) {
        console.error('Error inserting requirements:', reqError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-rfp-pdf:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
