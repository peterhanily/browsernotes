/**
 * Token-bucket rate limiter for bot execution.
 * Tracks both per-bot and per-external-API limits.
 */

interface Bucket {
  tokens: number;
  maxTokens: number;
  refillRate: number;   // tokens per millisecond
  lastRefill: number;   // timestamp
}

export class BotRateLimiter {
  private buckets = new Map<string, Bucket>();

  /**
   * Register a rate limit bucket.
   * @param key - Unique identifier (e.g., 'bot:abc123:hour', 'api:virustotal')
   * @param maxTokens - Maximum tokens (requests) in the window
   * @param windowMs - Window size in milliseconds
   */
  register(key: string, maxTokens: number, windowMs: number): void {
    this.buckets.set(key, {
      tokens: maxTokens,
      maxTokens,
      refillRate: maxTokens / windowMs,
      lastRefill: Date.now(),
    });
  }

  /**
   * Try to consume a token. Returns true if allowed, false if rate-limited.
   */
  tryConsume(key: string, count: number = 1): boolean {
    const bucket = this.buckets.get(key);
    if (!bucket) return true; // No limit registered = allow

    this.refill(bucket);

    if (bucket.tokens >= count) {
      bucket.tokens -= count;
      return true;
    }
    return false;
  }

  /**
   * Get remaining tokens for a bucket.
   */
  remaining(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return Infinity;
    this.refill(bucket);
    return Math.floor(bucket.tokens);
  }

  /**
   * Get time until next token is available (ms).
   */
  retryAfter(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.tokens >= 1) return 0;
    const deficit = 1 - bucket.tokens;
    return Math.ceil(deficit / bucket.refillRate);
  }

  /**
   * Remove all buckets for a bot (on bot disable/delete).
   */
  removeBuckets(botId: string): void {
    for (const key of this.buckets.keys()) {
      if (key.startsWith(`bot:${botId}`)) {
        this.buckets.delete(key);
      }
    }
  }

  private refill(bucket: Bucket): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    if (elapsed > 0) {
      bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + elapsed * bucket.refillRate);
      bucket.lastRefill = now;
    }
  }
}

// Singleton
export const botRateLimiter = new BotRateLimiter();
