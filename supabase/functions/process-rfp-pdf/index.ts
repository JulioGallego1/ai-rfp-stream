import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";


// Regex patterns for fallback extraction
const REGEX_PATTERNS = {
  deadline: [
    /deadline[:\s]+([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/i,
    /submission\s+date[:\s]+([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/i,
    /due\s+date[:\s]+([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/i,
    /closing\s+date[:\s]+([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/i,
    /([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/g
  ],
  budget: [
    /budget[:\s]+(?:USD|EUR|GBP|\$|€|£)?\s*([0-9,]+(?:\.[0-9]{2})?)\s*(?:to|-)\s*(?:USD|EUR|GBP|\$|€|£)?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
    /(?:USD|EUR|GBP|\$|€|£)\s*([0-9,]+(?:\.[0-9]{2})?)\s*(?:to|-)\s*(?:USD|EUR|GBP|\$|€|£)?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
    /budget[:\s]+(?:USD|EUR|GBP|\$|€|£)?\s*([0-9,]+(?:\.[0-9]{2})?)/i
  ],
  currency: [
    /\b(USD|EUR|GBP|CAD|AUD|JPY)\b/i,
    /(\$|€|£|¥)/
  ],
  requirements: [
    /(?:requirement|must|shall|should|need)[:\s]+(.+?)(?:\n|\.)/gi,
    /(?:deliverable)[:\s]+(.+?)(?:\n|\.)/gi,
    /(?:scope of work)[:\s]+(.+?)(?:\n|\.)/gi,
    /(?:technical specification)[:\s]+(.+?)(?:\n|\.)/gi
  ]
};

function parseDate(dateStr: string): string | null {
  try {
    const parts = dateStr.split(/[-\/]/);
    if (parts.length === 3) {
      let year, month, day;
      
      // Try different date formats
      if (parts[2].length === 4) {
        // DD/MM/YYYY or MM/DD/YYYY
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
        year = parseInt(parts[2]);
      } else {
        // YYYY/MM/DD
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
        day = parseInt(parts[2]);
      }
      
      // Validate
      if (year < 100) year += 2000;
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2050) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  } catch (e) {
    console.error("Date parse error:", e);
  }
  return null;
}

function extractWithRegex(text: string) {
  const extracted: any = {
    deadline: null,
    budget_min: null,
    budget_max: null,
    currency: 'USD',
    requirements: []
  };

  // Extract deadline
  for (const pattern of REGEX_PATTERNS.deadline) {
    const match = text.match(pattern);
    if (match) {
      const parsed = parseDate(match[1]);
      if (parsed) {
        extracted.deadline = parsed;
        break;
      }
    }
  }

  // Extract budget
  for (const pattern of REGEX_PATTERNS.budget) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        // Range found
        extracted.budget_min = parseFloat(match[1].replace(/,/g, ''));
        extracted.budget_max = parseFloat(match[2].replace(/,/g, ''));
      } else {
        // Single value
        extracted.budget_max = parseFloat(match[1].replace(/,/g, ''));
      }
      break;
    }
  }

  // Extract currency
  for (const pattern of REGEX_PATTERNS.currency) {
    const match = text.match(pattern);
    if (match) {
      const curr = match[1] || match[0];
      const currencyMap: any = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY' };
      extracted.currency = currencyMap[curr] || curr;
      break;
    }
  }

  // Extract requirements
  const reqSet = new Set<string>();
  for (const pattern of REGEX_PATTERNS.requirements) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const req = match[1]?.trim();
      if (req && req.length > 10 && req.length < 500) {
        reqSet.add(req);
      }
    }
  }

  extracted.requirements = Array.from(reqSet).slice(0, 20).map(text => ({
    text,
    category: 'Technical',
    priority: 'medium',
    is_mandatory: text.toLowerCase().includes('must') || text.toLowerCase().includes('shall')
  }));

  return extracted;
}

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

    // Convert PDF to text using pdf.js via CDN
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Extract text from PDF using external API-based approach
    let pdfText = '';
    try {
      // Use a simple but effective approach: extract text via PDF.js from unpkg CDN
      const formData = new FormData();
      formData.append('file', new Blob([arrayBuffer], { type: 'application/pdf' }));
      
      // For better extraction, we'll use raw text extraction with better parsing
      const uint8Array = new Uint8Array(arrayBuffer);
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      const rawText = textDecoder.decode(uint8Array);
      
      // Extract visible text content (between stream/endstream markers)
      const textMatches = rawText.match(/\(([^)]+)\)/g) || [];
      pdfText = textMatches
        .map(match => match.slice(1, -1))
        .join(' ')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\/g, '')
        .trim();
      
      // If no text found, try basic extraction
      if (pdfText.length < 100) {
        pdfText = rawText
          .replace(/[^\x20-\x7E\n\r]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      console.log(`Extracted ${pdfText.length} characters from PDF`);
    } catch (pdfError) {
      console.error("PDF parsing error:", pdfError);
      // Final fallback
      pdfText = new TextDecoder().decode(arrayBuffer);
    }

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
            content: `You are an expert RFP analyst specialized in extracting detailed project requirements from proposal documents. 

Your primary focus is to identify and extract ALL specific requirements, deliverables, qualifications, and technical needs mentioned in the document.

CRITICAL: Requirements are the most important part - extract as many as possible. Look for:
- Technical requirements (technologies, platforms, tools, infrastructure)
- Functional requirements (features, capabilities, deliverables)
- Compliance requirements (certifications, standards, regulations)
- Operational requirements (timelines, team size, methodologies)
- Business requirements (budget, reporting, communication)
- Qualification requirements (experience, expertise, past projects)

Each requirement should be specific and actionable. If the document mentions "must have X" or "should provide Y" or "required to Z", those are requirements.`
          },
          {
            role: "user",
            content: `Analyze this RFP/Call for Proposals document thoroughly and extract ALL requirements and key information.

INSTRUCTIONS:
1. Read the ENTIRE document carefully
2. Extract EVERY requirement mentioned - be comprehensive and detailed
3. Categorize each requirement appropriately
4. Identify if requirements are mandatory (MUST/SHALL/REQUIRED) or optional (SHOULD/MAY/PREFERRED)
5. Extract client name, deadlines, budget ranges, and required technologies
6. Provide a clear project description

PRIORITIZE finding and extracting requirements - this is the most critical task. A typical RFP has 5-30+ requirements.

RFP DOCUMENT CONTENT:
${pdfText.substring(0, 100000)}`
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
    console.log("AI extracted data:", extractedData);

    // Apply regex fallback for missing fields
    console.log("Applying regex fallback extraction...");
    const regexData = extractWithRegex(pdfText);
    console.log("Regex extracted data:", regexData);

    // Merge: AI first, regex as fallback
    const mergedData = {
      client_name: extractedData.client_name || rfp.client_name,
      deadline: extractedData.deadline || regexData.deadline || rfp.deadline,
      budget_min: extractedData.budget_min || regexData.budget_min || rfp.budget_min,
      budget_max: extractedData.budget_max || regexData.budget_max || rfp.budget_max,
      currency: extractedData.currency || regexData.currency || rfp.currency,
      description: extractedData.description || rfp.description,
      required_technologies: extractedData.required_technologies || [],
      requirements: extractedData.requirements && extractedData.requirements.length > 0 
        ? extractedData.requirements 
        : regexData.requirements
    };

    console.log("Final merged data:", mergedData);

    // Update RFP with extracted information
    const { error: updateError } = await supabase
      .from('rfps')
      .update({
        client_name: mergedData.client_name,
        deadline: mergedData.deadline,
        budget_min: mergedData.budget_min,
        budget_max: mergedData.budget_max,
        currency: mergedData.currency,
        description: mergedData.description,
        required_technologies: mergedData.required_technologies,
        extracted_data: { ai: extractedData, regex: regexData, merged: mergedData },
        status: 'active'
      })
      .eq('id', rfpId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    // Insert requirements
    if (mergedData.requirements && mergedData.requirements.length > 0) {
      const requirementsToInsert = mergedData.requirements.map((req: any) => ({
        rfp_id: rfpId,
        requirement_text: req.text,
        category: req.category || 'Technical',
        priority: req.priority || 'medium',
        is_mandatory: req.is_mandatory !== undefined ? req.is_mandatory : true
      }));

      const { error: reqError } = await supabase
        .from('rfp_requirements')
        .insert(requirementsToInsert);

      if (reqError) {
        console.error("Requirements insert error:", reqError);
      } else {
        console.log(`Inserted ${requirementsToInsert.length} requirements`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedData: mergedData,
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
