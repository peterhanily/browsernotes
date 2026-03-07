import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import {
  isLocked,
  recordFailedAttempt,
  resetAttempts,
  cleanupExpiredEntries,
  stopCleanupTimer,
  _clearAll,
  MAX_ATTEMPTS,
  WINDOW_MS,
  LOCKOUT_MS,
} from '../services/login-limiter.js';

afterAll(() => {
  stopCleanupTimer();
});

describe('login-limiter', () => {
  beforeEach(() => {
    _clearAll();
    vi.restoreAllMocks();
  });

  it('allows login when under the attempt limit', () => {
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      const result = recordFailedAttempt('testuser');
      expect(result.locked).toBe(false);
    }
    expect(isLocked('testuser').locked).toBe(false);
  });

  it('locks account after MAX_ATTEMPTS failures', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      recordFailedAttempt('testuser');
    }
    const status = isLocked('testuser');
    expect(status.locked).toBe(true);
    expect(status.retryAfterMinutes).toBeGreaterThan(0);
    expect(status.retryAfterMinutes).toBeLessThanOrEqual(15);
  });

  it('returns locked status on the attempt that triggers lockout', () => {
    let result: { locked: boolean; retryAfterMinutes?: number } = { locked: false };
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      result = recordFailedAttempt('testuser');
    }
    expect(result.locked).toBe(true);
    expect(result.retryAfterMinutes).toBe(15);
  });

  it('returns correct retry-after time', () => {
    // Lock the account
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      recordFailedAttempt('testuser');
    }

    const status = isLocked('testuser');
    expect(status.locked).toBe(true);
    // Should be approximately 15 minutes
    expect(status.retryAfterMinutes).toBeGreaterThanOrEqual(14);
    expect(status.retryAfterMinutes).toBeLessThanOrEqual(15);
  });

  it('resets counter on successful login', () => {
    // Record some failed attempts
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      recordFailedAttempt('testuser');
    }
    expect(isLocked('testuser').locked).toBe(false);

    // Simulate successful login
    resetAttempts('testuser');

    // Should be able to fail again without lockout
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      recordFailedAttempt('testuser');
    }
    expect(isLocked('testuser').locked).toBe(false);
  });

  it('normalizes username to lowercase', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      recordFailedAttempt('TestUser');
    }
    expect(isLocked('testuser').locked).toBe(true);
    expect(isLocked('TESTUSER').locked).toBe(true);
  });

  it('tracks attempts per username independently', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      recordFailedAttempt('user1');
    }
    expect(isLocked('user1').locked).toBe(true);
    expect(isLocked('user2').locked).toBe(false);
  });

  it('unlocks after lockout period expires', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      recordFailedAttempt('testuser');
    }
    expect(isLocked('testuser').locked).toBe(true);

    // Advance time past lockout
    vi.spyOn(Date, 'now').mockReturnValue(now + LOCKOUT_MS + 1);
    expect(isLocked('testuser').locked).toBe(false);
  });

  it('resets attempt window after WINDOW_MS', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    // Record some attempts (not enough to lock)
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      recordFailedAttempt('testuser');
    }

    // Advance time past the window
    vi.spyOn(Date, 'now').mockReturnValue(now + WINDOW_MS + 1);

    // Should reset the counter — can fail MAX_ATTEMPTS - 1 times again without lockout
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      const result = recordFailedAttempt('testuser');
      expect(result.locked).toBe(false);
    }
  });

  it('continues to return locked for subsequent failed attempts while locked', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      recordFailedAttempt('testuser');
    }
    // Additional attempt while locked
    const result = recordFailedAttempt('testuser');
    expect(result.locked).toBe(true);
  });

  describe('cleanupExpiredEntries', () => {
    it('removes entries with expired lockout', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        recordFailedAttempt('testuser');
      }
      expect(isLocked('testuser').locked).toBe(true);

      // Advance time past lockout
      vi.spyOn(Date, 'now').mockReturnValue(now + LOCKOUT_MS + 1);
      cleanupExpiredEntries();

      // isLocked should return false and the entry should be cleaned up
      expect(isLocked('testuser').locked).toBe(false);
    });

    it('removes entries with expired attempt windows', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // Record a single failed attempt (not enough to lock)
      recordFailedAttempt('testuser');

      // Advance time past the window
      vi.spyOn(Date, 'now').mockReturnValue(now + WINDOW_MS + 1);
      cleanupExpiredEntries();

      // Should be fully cleaned — next attempts start fresh
      // If we fail MAX_ATTEMPTS times, it should lock (fresh counter)
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        recordFailedAttempt('testuser');
      }
      expect(isLocked('testuser').locked).toBe(true);
    });
  });
});
