import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BotRateLimiter } from '../bots/rate-limiter.js';

describe('BotRateLimiter', () => {
  let limiter: BotRateLimiter;

  beforeEach(() => {
    limiter = new BotRateLimiter();
  });

  afterEach(() => {
    limiter.destroy();
  });

  describe('Allows requests under limit', () => {
    it('allows all requests within the token budget', () => {
      limiter.register('test:hourly', 100, 60 * 60 * 1000); // 100 per hour

      // Should allow 100 requests
      for (let i = 0; i < 100; i++) {
        expect(limiter.tryConsume('test:hourly')).toBe(true);
      }
    });

    it('returns true for unregistered keys (no limit)', () => {
      expect(limiter.tryConsume('unregistered-key')).toBe(true);
    });

    it('canConsume returns true without consuming', () => {
      limiter.register('test:key', 5, 60_000);
      expect(limiter.canConsume('test:key')).toBe(true);
      expect(limiter.remaining('test:key')).toBe(5);
    });
  });

  describe('Blocks requests over limit', () => {
    it('rejects requests after tokens are exhausted', () => {
      limiter.register('test:limit', 3, 60_000); // 3 per minute

      expect(limiter.tryConsume('test:limit')).toBe(true);
      expect(limiter.tryConsume('test:limit')).toBe(true);
      expect(limiter.tryConsume('test:limit')).toBe(true);
      // 4th request should be blocked
      expect(limiter.tryConsume('test:limit')).toBe(false);
    });

    it('correctly reports remaining tokens', () => {
      limiter.register('test:remaining', 5, 60_000);
      limiter.tryConsume('test:remaining');
      limiter.tryConsume('test:remaining');
      expect(limiter.remaining('test:remaining')).toBe(3);
    });

    it('tryConsume with count > 1 works correctly', () => {
      limiter.register('test:batch', 10, 60_000);
      expect(limiter.tryConsume('test:batch', 5)).toBe(true);
      expect(limiter.remaining('test:batch')).toBe(5);
      expect(limiter.tryConsume('test:batch', 6)).toBe(false);
      expect(limiter.tryConsume('test:batch', 5)).toBe(true);
    });
  });

  describe('Resets after window expires', () => {
    it('refills tokens over time', () => {
      vi.useFakeTimers();

      limiter.register('test:refill', 10, 10_000); // 10 per 10 seconds = 1/s

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        limiter.tryConsume('test:refill');
      }
      expect(limiter.tryConsume('test:refill')).toBe(false);

      // Advance time by 5 seconds — should refill 5 tokens
      vi.advanceTimersByTime(5000);
      expect(limiter.remaining('test:refill')).toBe(5);
      expect(limiter.tryConsume('test:refill')).toBe(true);

      // Advance full window — should be back to max
      vi.advanceTimersByTime(10_000);
      expect(limiter.remaining('test:refill')).toBe(10);

      vi.useRealTimers();
    });
  });

  describe('retryAfter', () => {
    it('returns 0 when tokens are available', () => {
      limiter.register('test:retry', 10, 60_000);
      expect(limiter.retryAfter('test:retry')).toBe(0);
    });

    it('returns positive value when rate limited', () => {
      limiter.register('test:retry2', 1, 60_000);
      limiter.tryConsume('test:retry2');
      const retryMs = limiter.retryAfter('test:retry2');
      expect(retryMs).toBeGreaterThan(0);
    });

    it('returns 0 for unregistered keys', () => {
      expect(limiter.retryAfter('unregistered')).toBe(0);
    });
  });

  describe('Correct remaining count (analogous to X-RateLimit-Remaining)', () => {
    it('remaining returns Infinity for unregistered keys', () => {
      expect(limiter.remaining('unknown')).toBe(Infinity);
    });

    it('tracks remaining correctly through consumption and refill', () => {
      vi.useFakeTimers();

      limiter.register('test:track', 100, 60_000); // 100 per minute
      expect(limiter.remaining('test:track')).toBe(100);

      limiter.tryConsume('test:track', 30);
      expect(limiter.remaining('test:track')).toBe(70);

      // Advance 30 seconds (half window) — should refill 50
      vi.advanceTimersByTime(30_000);
      // remaining should be 70 + 50 = 120, but capped at 100
      expect(limiter.remaining('test:track')).toBe(100);

      vi.useRealTimers();
    });
  });

  describe('removeBuckets', () => {
    it('removes all buckets for a specific bot', () => {
      limiter.register('bot:abc123:hour', 100, 3600_000);
      limiter.register('bot:abc123:day', 1000, 86400_000);
      limiter.register('bot:other:hour', 100, 3600_000);

      limiter.removeBuckets('abc123');

      // abc123 buckets should be gone (returns true = no limit)
      expect(limiter.remaining('bot:abc123:hour')).toBe(Infinity);
      expect(limiter.remaining('bot:abc123:day')).toBe(Infinity);
      // other bot bucket should remain
      expect(limiter.remaining('bot:other:hour')).toBe(100);
    });
  });
});
