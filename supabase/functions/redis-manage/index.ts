import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getRedisStatus, flushAllCache } from "../_shared/redis.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const method = req.method;

    if (method === "GET") {
      const status = getRedisStatus();
      return new Response(JSON.stringify({ status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "POST") {
      const result = await flushAllCache();
      return new Response(JSON.stringify({ success: true, message: "Cache successfully flushed", result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("redis-manage error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
