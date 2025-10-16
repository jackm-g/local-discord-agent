/**
 * In-memory cache for recent results (prompt deduplication)
 */
import crypto from "crypto";
import { CachedResult } from "../types.js";
import { CACHE_TTL_MINUTES } from "../config.js";

export class ResultCache {
  private cache: Map<string, CachedResult> = new Map();

  /**
   * Generate cache key from prompt and parameters
   */
  private generateKey(data: any): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  /**
   * Get cached result
   */
  get(toolName: string, args: any): any | null {
    const key = this.generateKey({ toolName, args });
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (new Date() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log(`✅ Cache hit for ${toolName}`);
    return cached.result;
  }

  /**
   * Store result in cache
   */
  set(toolName: string, args: any, result: any, ttlMinutes: number = CACHE_TTL_MINUTES): void {
    const key = this.generateKey({ toolName, args });
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    this.cache.set(key, {
      key,
      result,
      timestamp: now,
      expiresAt,
    });

    console.log(`💾 Cached result for ${toolName} (expires in ${ttlMinutes}m)`);
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = new Date();
    let removed = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} expired cache entries`);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log("Cache cleared");
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Run cleanup every 5 minutes
export function startCacheCleanup(cache: ResultCache): NodeJS.Timeout {
  return setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}

