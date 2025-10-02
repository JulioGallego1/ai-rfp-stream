import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";


// Regex patterns for fallback extraction
const REGEX_PATTERNS = {
  deadline: [
    /(?:submission\s+)?deadline[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /(?:due|closing|submission)\s+date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /deadline[:\s]+([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/i,
    /([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/g
  ],
  budget: [
    /budget.*?[€$£]?\s*(\d+(?:\.\d+)?)\s*[MmBb].*?[€$£]?\s*(\d+(?:\.\d+)?)\s*[MmBb]/i,
    /[€$£]\s*(\d+(?:\.\d+)?)\s*[MmBb].*?[€$£]?\s*(\d+(?:\.\d+)?)\s*[MmBb]/i,
    /budget[:\s]+(?:USD|EUR|GBP|\$|€|£)?\s*([0-9,]+(?:\.[0-9]{2})?)/i
  ],
  currency: [
    /[€]\s*\d+/,
    /\b(USD|EUR|GBP|CAD|AUD|JPY)\b/i,
    /(\$|€|£|¥)/
  ],
  requirements: [
    /●\s*(.+?)(?=\n●|\n\n|$)/gs,
    /[-•]\s*(.+?)(?=\n[-•]|\n\n|$)/gs,
    /\d+\.\s+(.+?)(?=\n\d+\.|\n\n|$)/gs,
    /(?:must demonstrate|must include|must have|required)[:\s]+(.+?)(?=\n|$)/gi,
    /(?:requirement|deliverable|capability)[:\s]+(.+?)(?=\n|$)/gi
  ]
};

function parseDate(dateStr: string): string | null {
  try {
    // Try parsing "Month DD, YYYY" format (e.g., "November 15, 2025")
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                        'july', 'august', 'september', 'october', 'november', 'december'];
    const monthMatch = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
    if (monthMatch) {
      const monthName = monthMatch[1].toLowerCase();
      const day = parseInt(monthMatch[2]);
      const year = parseInt(monthMatch[3]);
      const month = monthNames.indexOf(monthName) + 1;
      if (month > 0 && day >= 1 && day <= 31 && year >= 2020 && year <= 2050) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    
    // Try parsing DD/MM/YYYY or MM/DD/YYYY format
    const parts = dateStr.split(/[-\/]/);
    if (parts.length === 3) {
      let year, month, day;
      if (parts[2].length === 4) {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
        year = parseInt(parts[2]);
      } else {
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
        day = parseInt(parts[2]);
      }
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
        // Range found - handle M/B suffixes
        let min = parseFloat(match[1].replace(/,/g, ''));
        let max = parseFloat(match[2].replace(/,/g, ''));
        
        // Check for M (millions) or B (billions) suffix
        if (/\d+(?:\.\d+)?\s*[Mm]/.test(text.substring(match.index!, match.index! + 50))) {
          min *= 1000000;
          max *= 1000000;
        } else if (/\d+(?:\.\d+)?\s*[Bb]/.test(text.substring(match.index!, match.index! + 50))) {
          min *= 1000000000;
          max *= 1000000000;
        }
        
        extracted.budget_min = min;
        extracted.budget_max = max;
      } else {
        // Single value
        let budget = parseFloat(match[1].replace(/,/g, ''));
        if (/\d+(?:\.\d+)?\s*[Mm]/.test(text.substring(match.index!, match.index! + 50))) {
          budget *= 1000000;
        } else if (/\d+(?:\.\d+)?\s*[Bb]/.test(text.substring(match.index!, match.index! + 50))) {
          budget *= 1000000000;
        }
        extracted.budget_max = budget;
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
      if (req && req.length > 15 && req.length < 800) {
        // Clean up the requirement text
        const cleanReq = req
          .replace(/\s+/g, ' ')
          .replace(/[●•\-]\s*/, '')
          .trim();
        if (cleanReq.length > 15) {
          reqSet.add(cleanReq);
        }
      }
    }
  }

  extracted.requirements = Array.from(reqSet).slice(0, 30).map(text => {
    const lowerText = text.toLowerCase();
    const isMandatory = lowerText.includes('must') || 
                       lowerText.includes('shall') || 
                       lowerText.includes('required') ||
                       lowerText.includes('mandatory');
    
    let category = 'Technical';
    if (lowerText.includes('compliance') || lowerText.includes('regulatory') || lowerText.includes('legal')) {
      category = 'Compliance';
    } else if (lowerText.includes('experience') || lowerText.includes('expertise') || lowerText.includes('proven')) {
      category = 'Qualification';
    } else if (lowerText.includes('deliver') || lowerText.includes('provide') || lowerText.includes('implement')) {
      category = 'Deliverable';
    } else if (lowerText.includes('budget') || lowerText.includes('cost') || lowerText.includes('payment')) {
      category = 'Financial';
    }
    
    const priority = isMandatory ? 'high' : 'medium';
    
    return { text, category, priority, is_mandatory: isMandatory };
  });

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
    
    // Extract text from PDF with improved method
    let pdfText = '';
    try {
      const uint8Array = new Uint8Array(arrayBuffer);
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      const rawText = textDecoder.decode(uint8Array);
      
      // Method 1: Extract text between parentheses (PDF text objects)
      const textMatches = rawText.match(/\(([^)]+)\)/g) || [];
      let extractedText = textMatches
        .map(match => {
          let text = match.slice(1, -1);
          // Handle PDF escape sequences
          text = text.replace(/\\n/g, '\n');
          text = text.replace(/\\r/g, '\r');
          text = text.replace(/\\t/g, '\t');
          text = text.replace(/\\([()])/g, '$1');
          text = text.replace(/\\\\/g, '\\');
          return text;
        })
        .join(' ');
      
      // Method 2: Extract text from BT...ET blocks (text blocks)
      const btEtMatches = rawText.match(/BT\s*(.+?)\s*ET/gs) || [];
      const btEtText = btEtMatches.map(block => {
        const texts = block.match(/\(([^)]+)\)/g) || [];
        return texts.map(t => t.slice(1, -1)).join(' ');
      }).join('\n');
      
      pdfText = (extractedText + '\n' + btEtText).trim();
      
      // Fallback: if extraction is poor, use raw text with filtering
      if (pdfText.length < 200) {
        pdfText = rawText
          .replace(/[^\x20-\x7E\n\r€£$¥●•\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      console.log(`Extracted ${pdfText.length} characters from PDF`);
      console.log(`First 500 chars: ${pdfText.substring(0, 500)}`);
    } catch (pdfError) {
      console.error("PDF parsing error:", pdfError);
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
            content: `You are an expert RFP analyst. Your PRIMARY TASK is to extract ALL requirements from the document.

REQUIREMENTS EXTRACTION (MOST IMPORTANT):
Extract EVERY requirement mentioned. Look for:
1. Bullet points (●, •, -, numbers)
2. "Must", "Shall", "Required", "Should", "Need to"
3. Experience/expertise requirements (years, certifications, case studies)
4. Technical capabilities (technologies, platforms, tools)
5. Compliance requirements (regulations, standards, certifications)
6. Deliverables and scope items
7. Team/staffing requirements
8. Qualifications and past project requirements

Categorize each requirement:
- "Technical" - technologies, platforms, tools, infrastructure
- "Qualification" - experience, expertise, certifications, past projects
- "Compliance" - regulations, standards, legal requirements
- "Deliverable" - outputs, solutions, implementations
- "Operational" - timelines, team size, methodologies
- "Financial" - budget, payment terms

Mark as mandatory if text contains: must, shall, required, mandatory, essential.

ALSO EXTRACT:
- Client name (organization issuing the RFP)
- Deadline (submission deadline in ISO format YYYY-MM-DD)
- Budget range (convert M = millions, B = billions to numeric values)
- Currency (EUR, USD, GBP, etc.)
- Description (brief project overview, 1-2 sentences)
- Required technologies (list of specific technologies mentioned)`
          },
          {
            role: "user",
            content: `Analyze this RFP document and extract ALL requirements comprehensively.

CRITICAL FOCUS: REQUIREMENTS
- Extract EVERY bullet point, numbered item, and stated requirement
- Look for "must demonstrate", "must have", "must include" sections
- Capture experience requirements (e.g., "10 years expertise")
- Capture capability requirements (e.g., "cloud platforms", "AI expertise")
- Capture compliance requirements (e.g., "GDPR", "Basel III")
- Find staffing/team requirements
- Find all technical requirements

For each requirement:
1. Extract the FULL text (not truncated)
2. Categorize correctly (Technical/Qualification/Compliance/Deliverable/Operational/Financial)
3. Set priority (high if mandatory, medium otherwise)
4. Set is_mandatory (true if contains must/shall/required/mandatory)

Also extract: client_name, deadline (ISO format), budget (numeric values), currency, description, required_technologies

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
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later.", details: errorText }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace.", details: errorText }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI processing failed", details: errorText, status: aiResponse.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response received:", JSON.stringify(aiData).substring(0, 500));

    // Extract the function call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response. Full response:", JSON.stringify(aiData));
      throw new Error("No tool call in AI response. This might indicate the AI couldn't parse the PDF content.");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("AI extracted data summary:", {
      client_name: extractedData.client_name,
      deadline: extractedData.deadline,
      budget_range: `${extractedData.budget_min} - ${extractedData.budget_max}`,
      currency: extractedData.currency,
      requirements_count: extractedData.requirements?.length || 0,
      technologies_count: extractedData.required_technologies?.length || 0
    });

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
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
