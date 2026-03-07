import { logger } from '../lib/logger.js';

// ─── Constants ──────────────────────────────────────────────────

export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;   // 15 minutes
export const LOCKOUT_MS = 15 * 60 * 1000;  // 15 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Types ──────────────────────────────────────────────────────

interface AttemptRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

// ─── State ──────────────────────────────────────────────────────

const attempts = new Map<string, AttemptRecord>();

// ─── Helpers ────────────────────────────────────────────────────

function normalizeKey(username: string): string {
  return username.trim().toLowerCase();
}

// ─── Public API ─────────────────────────────────────────────────

export function isLocked(username: string): { locked: boolean; retryAfterMinutes?: number } {
  const key = normalizeKey(username);
  const record = attempts.get(key);
  if (!record || !record.lockedUntil) return { locked: false };

  const now = Date.now();
  if (now >= record.lockedUntil) {
    // Lockout expired — clean up
    attempts.delete(key);
    return { locked: false };
  }

  const retryAfterMinutes = Math.ceil((record.lockedUntil - now) / 60_000);
  return { locked: true, retryAfterMinutes };
}

export function recordFailedAttempt(username: string): { locked: boolean; retryAfterMinutes?: number } {
  const key = normalizeKey(username);
  const now = Date.now();
  let record = attempts.get(key);

  if (!record) {
    record = { attempts: 0, firstAttemptAt: now, lockedUntil: null };
    attempts.set(key, record);
  }

  // If already locked, just return the lockout status
  if (record.lockedUntil && now < record.lockedUntil) {
    const retryAfterMinutes = Math.ceil((record.lockedUntil - now) / 60_000);
    return { locked: true, retryAfterMinutes };
  }

  // If the window has expired, reset the counter
  if (now - record.firstAttemptAt > WINDOW_MS) {
    record.attempts = 0;
    record.firstAttemptAt = now;
    record.lockedUntil = null;
  }

  record.attempts++;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    const retryAfterMinutes = Math.ceil(LOCKOUT_MS / 60_000);
    logger.warn('Account locked due to too many failed login attempts', { username: key });
    return { locked: true, retryAfterMinutes };
  }

  return { locked: false };
}

export function resetAttempts(username: string): void {
  const key = normalizeKey(username);
  attempts.delete(key);
}

// ─── Cleanup ────────────────────────────────────────────────────

export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, record] of attempts) {
    // Remove if lockout has expired
    if (record.lockedUntil && now >= record.lockedUntil) {
      attempts.delete(key);
      continue;
    }
    // Remove if attempt window has expired and not locked
    if (!record.lockedUntil && now - record.firstAttemptAt > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function startCleanupTimer(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS);
  // Allow the process to exit even if the timer is running
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function stopCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// ─── Test helpers ───────────────────────────────────────────────

/** Clear all tracked attempts (for testing only) */
export function _clearAll(): void {
  attempts.clear();
}

// Start cleanup on module load
startCleanupTimer();
