import { describe, it, expect, beforeEach } from 'vitest';
import { markPending, clearPending, hasPendingChanges } from '../lib/pending-changes';

describe('pending-changes', () => {
  beforeEach(() => {
    // Reset to zero by clearing until hasPendingChanges returns false
    while (hasPendingChanges()) {
      clearPending();
    }
  });

  it('starts with no pending changes', () => {
    expect(hasPendingChanges()).toBe(false);
  });

  it('reports pending after markPending', () => {
    markPending();
    expect(hasPendingChanges()).toBe(true);
  });

  it('clears pending after clearPending', () => {
    markPending();
    clearPending();
    expect(hasPendingChanges()).toBe(false);
  });

  it('tracks multiple pending changes', () => {
    markPending();
    markPending();
    markPending();
    expect(hasPendingChanges()).toBe(true);

    clearPending();
    expect(hasPendingChanges()).toBe(true); // still 2 pending

    clearPending();
    expect(hasPendingChanges()).toBe(true); // still 1 pending

    clearPending();
    expect(hasPendingChanges()).toBe(false); // all cleared
  });

  it('does not go below zero on extra clearPending calls', () => {
    clearPending();
    clearPending();
    expect(hasPendingChanges()).toBe(false);

    // Should still work correctly after over-clearing
    markPending();
    expect(hasPendingChanges()).toBe(true);
  });
});
