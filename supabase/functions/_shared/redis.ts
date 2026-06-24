import { Redis } from "https://esm.sh/@upstash/redis@1.28.4";

let redisClient: Redis | null = null;
let isRedisAvailable = false;

// Attempt to read Upstash REST connection parameters
const url = Deno.env.get("UPSTASH_REDIS_REST_URL") || Deno.env.get("REDIS_URL");
const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

if (url && token) {
  try {
    redisClient = new Redis({
      url: url,
      token: token,
    });
    isRedisAvailable = true;
    console.log("Redis client initialized successfully with Upstash REST API");
  } catch (err) {
    console.error("Failed to initialize Upstash Redis client:", err);
  }
} else {
  console.log("Redis REST credentials not set. Falling back to Deno memory cache.");
}

// Global Deno process memory cache fallback
// Since edge function instances can be reused, this persists across multiple requests in the same warm container
const memoryCache = new Map<string, { value: any; expiry: number }>();

export async function getCache<T>(key: string): Promise<{ data: T | null; hit: boolean; provider: string; duration_ms: number }> {
  const startTime = performance.now();
  
  if (isRedisAvailable && redisClient) {
    try {
      const data = await redisClient.get(key);
      const duration_ms = Math.round(performance.now() - startTime);
      if (data !== null && data !== undefined) {
        console.log(`[Redis Cache HIT] Key: ${key} (${duration_ms}ms)`);
        // If it's a string that starts with [ or {, let's try to parse it as JSON, or return it directly
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        return { data: parsed as T, hit: true, provider: "Upstash Redis", duration_ms };
      }
    } catch (err) {
      console.warn(`[Redis Error] Failed to get key ${key}:`, err);
    }
  }

  // Memory cache fallback check
  const cached = memoryCache.get(key);
  const duration_ms = Math.round(performance.now() - startTime);
  if (cached) {
    if (cached.expiry > Date.now()) {
      console.log(`[Memory Cache HIT] Key: ${key} (${duration_ms}ms)`);
      return { data: cached.value as T, hit: true, provider: "In-Memory Fallback", duration_ms };
    } else {
      memoryCache.delete(key);
    }
  }

  return { data: null, hit: false, provider: isRedisAvailable ? "Upstash Redis" : "In-Memory Fallback", duration_ms };
}

export async function setCache<T>(key: string, value: T, ttlSeconds = 86400): Promise<void> {
  if (isRedisAvailable && redisClient) {
    try {
      const valueStr = typeof value === "string" ? value : JSON.stringify(value);
      await redisClient.set(key, valueStr, { ex: ttlSeconds });
      console.log(`[Redis Cache SET] Key: ${key}, TTL: ${ttlSeconds}s`);
      return;
    } catch (err) {
      console.warn(`[Redis Error] Failed to set key ${key}:`, err);
    }
  }

  // Memory fallback save
  memoryCache.set(key, {
    value,
    expiry: Date.now() + ttlSeconds * 1000,
  });
  console.log(`[Memory Cache SET] Key: ${key}, TTL: ${ttlSeconds}s`);
}

export async function deleteCache(key: string): Promise<boolean> {
  let deletedFromRedis = false;
  if (isRedisAvailable && redisClient) {
    try {
      const count = await redisClient.del(key);
      deletedFromRedis = count > 0;
      console.log(`[Redis Cache DEL] Key: ${key}`);
    } catch (err) {
      console.warn(`[Redis Error] Failed to delete key ${key}:`, err);
    }
  }
  const deletedFromMemory = memoryCache.delete(key);
  console.log(`[Memory Cache DEL] Key: ${key}`);
  return deletedFromRedis || deletedFromMemory;
}

export async function flushAllCache(): Promise<{ redis_cleared: boolean; memory_cleared: number }> {
  let redisCleared = false;
  if (isRedisAvailable && redisClient) {
    try {
      // Upstash supports FLUSHDB
      await redisClient.flushdb();
      redisCleared = true;
      console.log("[Redis Cache FLUSHDB] All keys cleared from Redis");
    } catch (err) {
      console.error("[Redis Error] Flush DB failed:", err);
    }
  }
  const memoryClearedCount = memoryCache.size;
  memoryCache.clear();
  console.log(`[Memory Cache CLEAR] Cleared ${memoryClearedCount} items`);
  return { redis_cleared: redisCleared, memory_cleared: memoryClearedCount };
}

export function getRedisStatus() {
  return {
    available: isRedisAvailable,
    provider: isRedisAvailable ? "Upstash Redis" : "In-Memory Fallback",
    configured: !!(url && token),
    memory_key_count: memoryCache.size,
  };
}

// Utility to generate a stable SHA-256 hash of any string (e.g. stringified candidates)
export async function hashString(str: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
