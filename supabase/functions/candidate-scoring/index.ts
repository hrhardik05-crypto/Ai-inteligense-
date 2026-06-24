import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCache, setCache, hashString } from "../_shared/redis.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = performance.now();

  try {
    const { candidate } = await req.json();
    if (!candidate) {
      return new Response(JSON.stringify({ error: "candidate data required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a stable payload of the candidate parameters that affect the prediction
    const stablePayload = {
      total_experience: candidate.total_experience,
      years_in_current_org: candidate.years_in_current_org,
      job_changes: candidate.job_changes,
      current_ctc: candidate.current_ctc,
      offered_ctc: candidate.offered_ctc,
      hike_percentage: candidate.hike_percentage,
      notice_period: candidate.notice_period,
      notice_negotiated: candidate.notice_negotiated,
      reduced_notice_period: candidate.reduced_notice_period,
      counter_offer_history: candidate.counter_offer_history,
      location_change: candidate.location_change,
      company_type: candidate.company_type,
      work_mode: candidate.work_mode,
      joined: candidate.joined
    };
    const stableString = JSON.stringify(stablePayload);
    const payloadHash = await hashString(stableString);
    const cacheKey = `candidate-score:${payloadHash}`;

    // Try to get from cache
    const { data: cachedData, hit, provider, duration_ms } = await getCache(cacheKey);
    if (hit && cachedData) {
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

    const systemPrompt = `You are an expert recruitment analytics AI. Analyze candidate data and return a structured JSON assessment. You MUST respond with ONLY valid JSON, no markdown, no explanation.

Return this exact JSON structure:
{
  "joining_probability": <number 5-98>,
  "offer_drop_risk": "<Low|Medium|High>",
  "confidence": <number 0.0-1.0>,
  "shap_values": [
    {"feature": "<name>", "value": "<display value>", "impact": <number -25 to 25>, "direction": "<positive|negative>"}
  ],
  "behavioral_scores": {
    "job_stability": <number 0-100>,
    "loyalty_index": <number 0-100>,
    "aggressive_switch": <number 0-100>
  },
  "financial_impact": {
    "cost_of_vacancy": <number>,
    "rehiring_cost": <number>,
    "productivity_loss": <number>,
    "total_risk": <number>
  },
  "recommendations": [
    {"title": "<short title>", "description": "<actionable advice>", "priority": "<critical|high|medium|low>", "category": "<compensation|notice|engagement|relocation|retention>", "estimated_impact": "<e.g. +10-15% joining probability>"}
  ],
  "risk_factors": ["<factor1>", "<factor2>"],
  "positive_signals": ["<signal1>", "<signal2>"],
  "narrative": "<2-3 sentence executive summary of the candidate's joining likelihood>"
}

Scoring guidelines:
- Counter-offer history is the strongest negative signal (weight ~22%)
- Salary hike <20% significantly reduces joining probability
- Notice period >90 days adds high friction
- Location change required reduces probability by ~8-10%
- Long tenure (>4y) at current org creates comfort zone bias
- Remote work mode slightly increases joining willingness
- Startup candidates are slightly more willing to switch
- Financial impact should be based on offered CTC with seniority multipliers`;

    const userPrompt = `Analyze this candidate for joining probability prediction:

Name: ${candidate.name}
Candidate ID: ${candidate.candidate_id}
Total Experience: ${candidate.total_experience} years
Years in Current Org: ${candidate.years_in_current_org} years
Job Changes: ${candidate.job_changes}
Current CTC: ₹${candidate.current_ctc}
Offered CTC: ₹${candidate.offered_ctc}
Hike Percentage: ${candidate.hike_percentage}%
Notice Period: ${candidate.notice_period} days
Notice Negotiated: ${candidate.notice_negotiated ? "Yes" : "No"}
Reduced Notice Period: ${candidate.reduced_notice_period} days
Counter-Offer History: ${candidate.counter_offer_history ? "Yes" : "No"}
Location Change Required: ${candidate.location_change ? "Yes" : "No"}
Company Type: ${candidate.company_type}
Work Mode: ${candidate.work_mode}
Currently Joined: ${candidate.joined ? "Yes" : "No"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content in AI response");

    // Parse JSON from response (handle potential markdown wrapping)
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI scoring response");
    }

    // Save to cache for future runs (24 hours)
    await setCache(cacheKey, parsed, 86400);

    const responseBody = {
      ...parsed,
      cache_status: {
        hit: false,
        provider,
        duration_ms: Math.round(performance.now() - startTime),
      }
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("candidate-scoring error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
