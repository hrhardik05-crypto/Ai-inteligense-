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
    const { candidates } = await req.json();
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return new Response(JSON.stringify({ error: "Pipeline candidates data required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a stable key from the current state of candidates in the pipeline
    const pipelineSig = candidates
      .map(c => `${c.id || c.candidate_id}:${c.joining_probability}:${c.offer_drop_risk}:${c.joined}`)
      .sort()
      .join(",");
    const sigHash = await hashString(pipelineSig);
    const cacheKey = `pipeline-intelligence:${sigHash}`;

    // Check cache (TTL 1 hour since pipeline is dynamic)
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

    // Build a compact pipeline summary for the AI
    const summary = candidates.map((c: any) => ({
      id: c.candidate_id,
      exp: c.total_experience,
      current_ctc: c.current_ctc,
      offered_ctc: c.offered_ctc,
      hike: c.hike_percentage,
      notice: c.notice_period,
      counter_offer: c.counter_offer_history,
      company_type: c.company_type,
      work_mode: c.work_mode,
      location_change: c.location_change,
      years_in_org: c.years_in_current_org,
      job_changes: c.job_changes,
      joining_prob: c.joining_probability,
      risk: c.offer_drop_risk,
      joined: c.joined,
    }));

    const systemPrompt = `You are an expert recruitment strategist AI. Analyze the entire candidate pipeline and provide strategic intelligence. You MUST respond with ONLY valid JSON, no markdown, no explanation.

Return this exact JSON structure:
{
  "best_hiring_sources": [
    {
      "source": "<company type or channel>",
      "success_rate": <number 0-100>,
      "avg_joining_probability": <number>,
      "recommendation": "<one sentence why>"
    }
  ],
  "time_to_close": {
    "avg_days": <number>,
    "fastest_profile": "<description of profile that closes fastest>",
    "slowest_profile": "<description of profile that takes longest>",
    "bottleneck": "<main delay factor>",
    "tips": ["<tip1>", "<tip2>"]
  },
  "salary_intelligence": {
    "optimal_hike_range": { "min": <number>, "max": <number> },
    "sweet_spot_hike": <number>,
    "current_avg_hike": <number>,
    "candidates_below_optimal": <number>,
    "recommendation": "<specific salary strategy advice>",
    "by_experience": [
      { "range": "<e.g. 0-5y>", "recommended_hike_min": <number>, "recommended_hike_max": <number> }
    ]
  },
  "pipeline_health": {
    "overall_score": <number 0-100>,
    "strengths": ["<strength1>", "<strength2>"],
    "risks": ["<risk1>", "<risk2>"],
    "actionable_insight": "<one key strategic recommendation>"
  },
  "market_insights": [
    {
      "title": "<insight title>",
      "insight": "<2 sentences of data-driven insight>",
      "impact": "<high|medium|low>"
    }
  ]
}

Base your analysis on actual patterns in the data. Be specific with numbers. Consider:
- Which company types/work modes yield highest joining rates
- Notice period patterns and their impact on closure time
- Hike percentages that correlate with successful joins vs drops
- Counter-offer patterns and mitigation strategies
- Experience-level salary benchmarks from the data`;

    const userPrompt = `Analyze this recruitment pipeline of ${candidates.length} candidates:\n\n${JSON.stringify(summary, null, 1)}`;

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

    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI intelligence response");
    }

    // Save to cache (1 hour)
    await setCache(cacheKey, parsed, 3600);

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
    console.error("recruitment-intelligence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
