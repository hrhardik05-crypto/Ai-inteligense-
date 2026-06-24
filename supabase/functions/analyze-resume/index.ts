import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCache, setCache, hashString } from "../_shared/redis.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function downloadAndExtractText(
  supabase: ReturnType<typeof createClient>,
  resumePath: string,
  apiKey: string
): Promise<string> {
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("resumes")
    .download(resumePath);

  if (downloadError || !fileData) {
    console.error("Storage download error:", downloadError);
    throw new Error("Failed to download resume from storage. Please re-upload the file.");
  }

  const fileName = resumePath.toLowerCase();
  
  if (fileName.endsWith(".txt")) {
    return await fileData.text();
  }

  if (fileName.endsWith(".doc") || fileName.endsWith(".docx")) {
    // DOC/DOCX: attempt text extraction, fall back to AI
    const rawText = await fileData.text();
    if (rawText && rawText.trim().length > 100 && !rawText.includes("\u0000")) {
      return rawText;
    }
  }

  // For PDF and binary DOC/DOCX: use AI vision to extract text
  const arrayBuffer = await fileData.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // Check file size - limit to 5MB for base64 processing
  if (bytes.length > 5 * 1024 * 1024) {
    throw new Error("File too large for AI processing. Please upload a file under 5MB.");
  }

  let binary = "";
  // Process in chunks to avoid stack overflow
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  const base64 = btoa(binary);

  const mimeType = fileName.endsWith(".pdf") ? "application/pdf" : "application/octet-stream";

  console.log(`Sending ${(bytes.length / 1024).toFixed(1)}KB file to AI for text extraction`);

  const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "Extract ALL text content from this document. Return only the raw text, preserving structure. No commentary.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all text from this resume document:" },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!extractResponse.ok) {
    const status = extractResponse.status;
    console.error("Text extraction AI error:", status);
    if (status === 429) throw new Error("Rate limited during text extraction. Please retry in a moment.");
    if (status === 402) throw new Error("AI credits exhausted. Please add credits in Settings.");
    throw new Error(`Text extraction failed (status ${status}). Try uploading a TXT version.`);
  }

  const extractResult = await extractResponse.json();
  return extractResult.choices?.[0]?.message?.content || "";
}

function buildAnalysisPrompt(structuredData?: Record<string, unknown>): string {
  const structuredInfo = structuredData
    ? `
STRUCTURED CANDIDATE DATA:
- Name: ${structuredData.name || "N/A"}
- Total Experience: ${structuredData.total_experience} years
- Years in Current Org: ${structuredData.years_in_current_org} years
- Job Changes: ${structuredData.job_changes}
- Current CTC: ₹${structuredData.current_ctc}
- Offered CTC: ₹${structuredData.offered_ctc}
- Hike: ${structuredData.hike_percentage}%
- Notice Period: ${structuredData.notice_period} days
- Counter-Offer History: ${structuredData.counter_offer_history ? "Yes" : "No"}
- Location Change: ${structuredData.location_change ? "Yes" : "No"}
- Company Type: ${structuredData.company_type}
- Work Mode: ${structuredData.work_mode}
`
    : "";
  return structuredInfo;
}

const SYSTEM_PROMPT = `You are an expert recruitment intelligence AI that analyzes resumes combined with structured HR data. You MUST respond with ONLY valid JSON, no markdown.

Return this exact JSON structure:
{
  "resume_insights": {
    "extracted_experience_years": <number>,
    "skill_keywords": ["<skill1>", "<skill2>"],
    "domain": "<primary domain>",
    "education_level": "<PhD|Masters|Bachelors|Diploma|Other>",
    "career_progression": "<ascending|lateral|descending|mixed>",
    "avg_tenure_months": <number>,
    "employment_gaps": [{"period": "<from-to>", "duration_months": <number>}],
    "job_switch_frequency": <number>,
    "latest_role": "<job title>",
    "companies_worked": ["<company1>", "<company2>"]
  },
  "resume_risk_indicators": [
    {"indicator": "<description>", "severity": "<high|medium|low>", "impact_on_joining": "<description>"}
  ],
  "resume_positive_signals": [
    {"signal": "<description>", "strength": "<strong|moderate|weak>"}
  ],
  "skill_relevance_score": <0-100>,
  "job_stability_score": <0-100>,
  "career_growth_score": <0-100>,
  "hybrid_prediction": {
    "joining_probability": <5-98>,
    "offer_drop_risk": "<Low|Medium|High>",
    "confidence": <0.0-1.0>,
    "notice_negotiation_success": <0-100>,
    "key_factors": [
      {"factor": "<name>", "source": "<resume|structured|both>", "impact": <-25 to 25>, "direction": "<positive|negative>"}
    ]
  },
  "recommendations": [
    {"title": "<short>", "description": "<actionable>", "priority": "<critical|high|medium|low>", "source": "<resume_insight|structured_data|combined>"}
  ],
  "narrative": "<3-4 sentence executive summary>"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = performance.now();

  try {
    const { candidateId, resumePath, structuredData } = await req.json();

    if (!resumePath || typeof resumePath !== "string") {
      return errorResponse("resumePath is required and must be a string", 400);
    }

    const stableStruct = structuredData ? JSON.stringify(structuredData) : "";
    const structHash = await hashString(stableStruct);
    const cacheKey = `resume-analysis:${resumePath}:${structHash}`;

    // Try to get from cache
    const { data: cachedData, hit, provider, duration_ms } = await getCache(cacheKey);
    if (hit && cachedData) {
      // If we got a cache hit, update the DB metadata to keep it sync'd
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      if (candidateId) {
        const { error: updateError } = await supabase
          .from("candidates")
          .update({
            resume_url: resumePath,
            resume_analysis: cachedData,
            joining_probability: cachedData.hybrid_prediction?.joining_probability,
            offer_drop_risk: cachedData.hybrid_prediction?.offer_drop_risk,
            notice_negotiation_success: cachedData.hybrid_prediction?.notice_negotiation_success,
          })
          .eq("id", candidateId);
        if (updateError) console.error("DB update error (from cache hit):", updateError);
      }

      const responseBody = {
        ...cachedData,
        cache_status: {
          hit: true,
          provider,
          duration_ms,
        }
      };

      return new Response(JSON.stringify(responseBody), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Download and extract text
    console.log(`Processing resume: ${resumePath}`);
    let resumeText: string;
    try {
      resumeText = await downloadAndExtractText(supabase, resumePath, LOVABLE_API_KEY);
    } catch (extractError) {
      console.error("Text extraction failed:", extractError);
      return errorResponse(
        extractError instanceof Error ? extractError.message : "Failed to extract text from resume",
        422
      );
    }

    if (!resumeText || resumeText.trim().length < 30) {
      console.warn("Extracted text too short, using fallback");
      resumeText = "[Resume text could not be fully extracted. Analyze based on structured data only.]";
    }

    console.log(`Extracted ${resumeText.length} chars. Sending to AI for analysis...`);

    // Step 2: AI analysis
    const structuredInfo = buildAnalysisPrompt(structuredData);
    const userPrompt = `Analyze this candidate's resume combined with their structured HR data to produce a hybrid joining probability prediction.

${structuredInfo}

RESUME TEXT:
${resumeText.substring(0, 6000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return errorResponse("Rate limit exceeded. Please try again in a moment.", 429);
      if (status === 402) return errorResponse("AI credits exhausted. Please add credits in Settings.", 402);
      const body = await response.text();
      console.error("AI analysis error:", status, body);
      throw new Error(`AI analysis failed (status ${status})`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("JSON parse failed. Raw content:", content.substring(0, 500));
      throw new Error("Failed to parse AI analysis response");
    }

    // Step 3: Save to database if candidateId provided
    if (candidateId) {
      const { error: updateError } = await supabase
        .from("candidates")
        .update({
          resume_url: resumePath,
          resume_analysis: parsed,
          joining_probability: parsed.hybrid_prediction?.joining_probability,
          offer_drop_risk: parsed.hybrid_prediction?.offer_drop_risk,
          notice_negotiation_success: parsed.hybrid_prediction?.notice_negotiation_success,
        })
        .eq("id", candidateId);
      if (updateError) console.error("DB update error:", updateError);
    }

    // Save to cache
    await setCache(cacheKey, parsed, 86400);

    const responseBody = {
      ...parsed,
      cache_status: {
        hit: false,
        provider,
        duration_ms: Math.round(performance.now() - startTime),
      }
    };

    console.log("Analysis complete successfully");
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-resume error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
