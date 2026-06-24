import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCache, setCache } from "../_shared/redis.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { candidate, category } = await req.json();

    if (!candidate || !category) {
      return new Response(JSON.stringify({ error: "candidate and category are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = `engagement-email:${candidate.id || candidate.candidate_id}:${category}`;
    
    // Check Cache
    const { data: cached, hit, provider } = await getCache(cacheKey);
    if (hit && cached) {
      return new Response(JSON.stringify({ ...cached, cache_status: { hit: true, provider } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert, highly persuasive recruitment director. Write a warm, personalized outreach email to a candidate who has been offered a role.
Your goal is to address their specific offer friction/risk area to keep them enthusiastic and ensure they join.
Respond with ONLY valid JSON containing a subject line and the email body. No markdown formatting, no explanations.

Expected JSON structure:
{
  "subject": "<Email Subject Line>",
  "body": "<Email Body (with proper paragraphs). Max 3 short paragraphs. Include recruiter signature placeholder. Do not add general salutations like 'Dear Candidate', address them personally if appropriate.>"
}`;

    const promptMap: Record<string, string> = {
      notice: `Write an email to candidate ${candidate.name} who has a long notice period of ${candidate.notice_period} days. Make them feel excited about their upcoming transition, mention upcoming team syncs they can attend, and invite them for a casual team lunch to bridge the gap.`,
      compensation: `Write an email to candidate ${candidate.name} highlighting our company culture, high-impact projects, growth paths, and non-monetary perks to neutralize their compensation concerns.`,
      relocation: `Write an email to candidate ${candidate.name} who is relocating. Detail our relocation resources, structural transition support, flexible first-month hybrid onboarding, and a welcoming team message to minimize relocation stress.`,
      engagement: `Write a standard warm check-in email to candidate ${candidate.name} checking on transition progress, sharing a recent project success, and solidifying excitement for their onboarding on their joining date.`
    };

    const userPrompt = promptMap[category] || promptMap.engagement;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway responded with status ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse email JSON content:", content);
      throw new Error("Failed to parse generated email template");
    }

    // Cache the email template in Redis for 10 minutes to prevent double billing of credits
    await setCache(cacheKey, parsed, 600);

    return new Response(JSON.stringify({ ...parsed, cache_status: { hit: false, provider } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-engagement error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
