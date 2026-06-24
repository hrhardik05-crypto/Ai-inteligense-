import { toast } from "sonner";

/**
 * Record and parse caching metrics returned by the Edge Functions.
 * Stores statistics in localStorage to persist across user sessions.
 */
export function recordCacheMetrics(functionName: string, data: any) {
  if (data && typeof data === "object" && "cache_status" in data) {
    const cs = data.cache_status;
    const hit = cs.hit;
    const duration = cs.duration_ms;
    const provider = cs.provider;

    if (hit) {
      const currentHits = parseInt(localStorage.getItem("redis_cache_hits") || "0") + 1;
      localStorage.setItem("redis_cache_hits", currentHits.toString());

      // standard AI is ~4500ms
      const timeSaved = Math.max(0, 4500 - duration);
      const currentTimeSaved = parseInt(localStorage.getItem("redis_time_saved_ms") || "0") + timeSaved;
      localStorage.setItem("redis_time_saved_ms", currentTimeSaved.toString());

      localStorage.setItem("redis_last_latency_ms", duration.toString());
      localStorage.setItem("redis_last_provider", provider);

      toast.success(`Cache Hit (${functionName})!`, {
        description: `Retrieved in ${duration}ms via ${provider}. Saved ~4.5s & 1 credit.`,
        duration: 3500,
      });
    } else {
      const currentMisses = parseInt(localStorage.getItem("redis_cache_misses") || "0") + 1;
      localStorage.setItem("redis_cache_misses", currentMisses.toString());
      localStorage.setItem("redis_last_latency_ms", duration.toString());
      localStorage.setItem("redis_last_provider", "Fresh AI Generation");

      toast.info(`${functionName} completed in ${(duration / 1000).toFixed(1)}s (Cache Miss).`);
    }

    // Trigger update event
    window.dispatchEvent(new Event("redis_stats_updated"));
  }
}
