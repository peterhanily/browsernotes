import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  updatePresence,
  removePresence,
  removeUserFromAllFolders,
  getPresence,
} from '../ws/presence.js';

describe('presence', () => {
  // Clear all presence state between tests by removing all known users
  beforeEach(() => {
    // Remove any leftover state
    removeUserFromAllFolders('user-1');
    removeUserFromAllFolders('user-2');
    removeUserFromAllFolders('user-3');
  });

  it('should track user presence in a folder', () => {
    updatePresence('folder-1', 'user-1', 'Alice', null, 'notes');

    const present = getPresence('folder-1');
    expect(present).toHaveLength(1);
    expect(present[0]).toEqual({
      id: 'user-1',
      displayName: 'Alice',
      avatarUrl: null,
      view: 'notes',
    });
  });

  it('should track multiple users in a folder', () => {
    updatePresence('folder-1', 'user-1', 'Alice', null, 'notes');
    updatePresence('folder-1', 'user-2', 'Bob', 'https://example.com/bob.png', 'timeline');

    const present = getPresence('folder-1');
    expect(present).toHaveLength(2);

    const alice = present.find(p => p.id === 'user-1');
    const bob = present.find(p => p.id === 'user-2');
    expect(alice?.displayName).toBe('Alice');
    expect(bob?.displayName).toBe('Bob');
    expect(bob?.avatarUrl).toBe('https://example.com/bob.png');
  });

  it('should update presence when user changes view', () => {
    updatePresence('folder-1', 'user-1', 'Alice', null, 'notes');
    updatePresence('folder-1', 'user-1', 'Alice', null, 'timeline');

    const present = getPresence('folder-1');
    expect(present).toHaveLength(1);
    expect(present[0].view).toBe('timeline');
  });

  it('should remove user from folder', () => {
    updatePresence('folder-1', 'user-1', 'Alice', null, 'notes');
    updatePresence('folder-1', 'user-2', 'Bob', null, 'timeline');

    removePresence('folder-1', 'user-1');

    const present = getPresence('folder-1');
    expect(present).toHaveLength(1);
    expect(present[0].id).toBe('user-2');
  });

  it('should return empty array for unknown folder', () => {
    expect(getPresence('nonexistent')).toEqual([]);
  });

  it('should remove user from all folders', () => {
    updatePresence('folder-1', 'user-1', 'Alice', null, 'notes');
    updatePresence('folder-2', 'user-1', 'Alice', null, 'timeline');
    updatePresence('folder-2', 'user-2', 'Bob', null, 'tasks');

    removeUserFromAllFolders('user-1');

    expect(getPresence('folder-1')).toEqual([]);
    expect(getPresence('folder-2')).toHaveLength(1);
    expect(getPresence('folder-2')[0].id).toBe('user-2');
  });

  it('should evict stale entries after 30s', () => {
    // Mock Date.now to control staleness
    const realNow = Date.now;
    const baseTime = realNow.call(Date);

    vi.spyOn(Date, 'now').mockReturnValue(baseTime);
    updatePresence('folder-1', 'user-1', 'Alice', null, 'notes');

    // Advance time by 31 seconds
    vi.spyOn(Date, 'now').mockReturnValue(baseTime + 31_000);

    const present = getPresence('folder-1');
    expect(present).toHaveLength(0);

    vi.restoreAllMocks();
  });

  it('should not evict fresh entries', () => {
    const realNow = Date.now;
    const baseTime = realNow.call(Date);

    vi.spyOn(Date, 'now').mockReturnValue(baseTime);
    updatePresence('folder-1', 'user-1', 'Alice', null, 'notes');

    // Only 10 seconds have passed
    vi.spyOn(Date, 'now').mockReturnValue(baseTime + 10_000);

    const present = getPresence('folder-1');
    expect(present).toHaveLength(1);

    vi.restoreAllMocks();
  });

  it('should handle removing from nonexistent folder gracefully', () => {
    expect(() => removePresence('nonexistent', 'user-1')).not.toThrow();
  });
});
