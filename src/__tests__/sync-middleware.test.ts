/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock sync-engine ───────────────────────────────────────────────

const mockEnqueue = vi.fn<(table: string, entityId: string, op: 'put' | 'delete', data?: Record<string, unknown>) => Promise<void>>();
mockEnqueue.mockResolvedValue(undefined);

vi.mock('../lib/sync-engine', () => ({
  syncEngine: {
    enqueue: (...args: Parameters<typeof mockEnqueue>) => mockEnqueue(...args),
  },
}));

// ─── Mock db with hook tracking ─────────────────────────────────────

type HookCallback = (...args: unknown[]) => void;

const hookCallbacks: Record<string, Record<string, HookCallback[]>> = {};

function getHooks(table: string, hookName: string): HookCallback[] {
  if (!hookCallbacks[table]) hookCallbacks[table] = {};
  if (!hookCallbacks[table][hookName]) hookCallbacks[table][hookName] = [];
  return hookCallbacks[table][hookName];
}

function clearHooks() {
  for (const key of Object.keys(hookCallbacks)) {
    delete hookCallbacks[key];
  }
}

const mockFoldersToArray = vi.fn<() => Promise<Array<{ id: string; localOnly?: boolean }>>>();
mockFoldersToArray.mockResolvedValue([]);

vi.mock('../db', () => ({
  db: new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== 'string') return undefined;
        if (prop === 'folders') {
          return {
            toArray: mockFoldersToArray,
            hook: (hookName: string, cb: HookCallback) => {
              getHooks('folders', hookName).push(cb);
            },
          };
        }
        return {
          hook: (hookName: string, cb: HookCallback) => {
            getHooks(prop, hookName).push(cb);
          },
        };
      },
    },
  ),
}));

// ─── Import after mocks ─────────────────────────────────────────────

import {
  enableSync,
  disableSync,
  installSyncHooks,
  markFolderLocalOnly,
  initLocalOnlyFlags,
} from '../lib/sync-middleware';

// ─── Test Suite ─────────────────────────────────────────────────────

describe('sync-middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    clearHooks();
    disableSync(); // Start with sync disabled
  });

  afterEach(() => {
    vi.useRealTimers();
    disableSync(); // Clean state
  });

  // ── enableSync / disableSync ──────────────────────────────────────

  describe('enableSync / disableSync', () => {
    it('enableSync / disableSync do not throw', () => {
      expect(() => enableSync()).not.toThrow();
      expect(() => disableSync()).not.toThrow();
    });

    it('hooks do not fire when sync is disabled', () => {
      installSyncHooks();
      const creatingHooks = getHooks('notes', 'creating');
      expect(creatingHooks.length).toBeGreaterThan(0);

      // Call the creating hook while sync is disabled
      creatingHooks[0]('n1', { id: 'n1', title: 'Test' });

      vi.advanceTimersByTime(10);

      // enqueue should NOT have been called
      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it('hooks fire when sync is enabled', () => {
      installSyncHooks();
      enableSync();

      const creatingHooks = getHooks('notes', 'creating');
      creatingHooks[0]('n1', { id: 'n1', title: 'Test' });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).toHaveBeenCalledWith(
        'notes', 'n1', 'put', { id: 'n1', title: 'Test' },
      );
    });
  });

  // ── installSyncHooks ──────────────────────────────────────────────

  describe('installSyncHooks', () => {
    it('installs creating, updating, and deleting hooks on all synced tables', () => {
      installSyncHooks();

      const expectedTables = [
        'notes', 'tasks', 'folders', 'tags',
        'timelineEvents', 'timelines', 'whiteboards',
        'standaloneIOCs', 'chatThreads',
      ];

      for (const table of expectedTables) {
        expect(getHooks(table, 'creating').length).toBeGreaterThanOrEqual(1);
        expect(getHooks(table, 'updating').length).toBeGreaterThanOrEqual(1);
        expect(getHooks(table, 'deleting').length).toBeGreaterThanOrEqual(1);
      }
    });

    it('does not install hooks on non-synced tables', () => {
      installSyncHooks();

      // activityLog and _syncQueue should NOT have hooks
      expect(getHooks('activityLog', 'creating')).toHaveLength(0);
      expect(getHooks('_syncQueue', 'creating')).toHaveLength(0);
      expect(getHooks('_syncMeta', 'creating')).toHaveLength(0);
    });
  });

  // ── Creating hook ─────────────────────────────────────────────────

  describe('creating hook', () => {
    beforeEach(() => {
      installSyncHooks();
      enableSync();
    });

    it('enqueues a put operation when a record is created', () => {
      const hooks = getHooks('notes', 'creating');
      hooks[0]('n1', { id: 'n1', title: 'New Note', tags: [] });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).toHaveBeenCalledWith(
        'notes', 'n1', 'put',
        { id: 'n1', title: 'New Note', tags: [] },
      );
    });

    it('uses primKey as entityId when obj has no id', () => {
      const hooks = getHooks('notes', 'creating');
      hooks[0]('pk-123', { title: 'No ID' });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).toHaveBeenCalledWith(
        'notes', 'pk-123', 'put',
        { title: 'No ID' },
      );
    });

    it('captures a snapshot of data (does not pass reference)', () => {
      const hooks = getHooks('notes', 'creating');
      const obj = { id: 'n1', title: 'Original' };
      hooks[0]('n1', obj);

      // Mutate the original after the hook fires
      obj.title = 'Mutated';

      vi.advanceTimersByTime(10);

      const data = mockEnqueue.mock.calls[0][3];
      expect(data!.title).toBe('Original');
    });

    it('defers the enqueue call via setTimeout (async)', () => {
      const hooks = getHooks('notes', 'creating');
      hooks[0]('n1', { id: 'n1', title: 'Test' });

      // Before timer fires, enqueue should NOT have been called
      expect(mockEnqueue).not.toHaveBeenCalled();

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).toHaveBeenCalledTimes(1);
    });
  });

  // ── Updating hook ─────────────────────────────────────────────────

  describe('updating hook', () => {
    beforeEach(() => {
      installSyncHooks();
      enableSync();
    });

    it('enqueues a put with merged data (original + modifications)', () => {
      const hooks = getHooks('notes', 'updating');
      const modifications = { title: 'Updated Title' };
      const originalObj = { id: 'n1', title: 'Old Title', content: 'body' };

      hooks[0](modifications, 'n1', originalObj);

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).toHaveBeenCalledWith(
        'notes', 'n1', 'put',
        { id: 'n1', title: 'Updated Title', content: 'body' },
      );
    });

    it('modifications override original values', () => {
      const hooks = getHooks('tasks', 'updating');
      hooks[0](
        { status: 'done', completed: true },
        't1',
        { id: 't1', status: 'todo', completed: false, title: 'Task' },
      );

      vi.advanceTimersByTime(10);

      const data = mockEnqueue.mock.calls[0][3];
      expect(data!.status).toBe('done');
      expect(data!.completed).toBe(true);
      expect(data!.title).toBe('Task');
    });
  });

  // ── Deleting hook ─────────────────────────────────────────────────

  describe('deleting hook', () => {
    beforeEach(() => {
      installSyncHooks();
      enableSync();
    });

    it('enqueues a delete operation with no data', () => {
      const hooks = getHooks('notes', 'deleting');
      hooks[0]('n1', { id: 'n1', title: 'Deleted Note' });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).toHaveBeenCalledWith(
        'notes', 'n1', 'delete',
      );
    });

    it('uses primKey as entityId for deletion', () => {
      const hooks = getHooks('tasks', 'deleting');
      hooks[0]('task-abc', { id: 'task-abc' });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).toHaveBeenCalledWith(
        'tasks', 'task-abc', 'delete',
      );
    });
  });

  // ── Local-only folder skipping ────────────────────────────────────

  describe('local-only folder skipping', () => {
    beforeEach(() => {
      installSyncHooks();
      enableSync();
    });

    it('skips sync for folders marked as localOnly via obj.localOnly', () => {
      const hooks = getHooks('folders', 'creating');
      hooks[0]('f1', { id: 'f1', name: 'Local Folder', localOnly: true });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it('skips sync for folders whose ID is in the localOnly set', () => {
      markFolderLocalOnly('f2', true);

      const hooks = getHooks('folders', 'creating');
      hooks[0]('f2', { id: 'f2', name: 'Also Local' });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it('skips sync for folder-scoped entities belonging to a local-only folder', () => {
      markFolderLocalOnly('f3', true);

      const hooks = getHooks('notes', 'creating');
      hooks[0]('n1', { id: 'n1', folderId: 'f3', title: 'Local Note' });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it('does not skip sync for entities in non-local-only folders', () => {
      const hooks = getHooks('notes', 'creating');
      hooks[0]('n1', { id: 'n1', folderId: 'f-normal', title: 'Normal Note' });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).toHaveBeenCalled();
    });

    it('markFolderLocalOnly(false) unmarks a folder as local-only', () => {
      markFolderLocalOnly('f4', true);
      markFolderLocalOnly('f4', false);

      const hooks = getHooks('folders', 'creating');
      hooks[0]('f4', { id: 'f4', name: 'Unmarked Folder' });

      vi.advanceTimersByTime(10);

      // Should sync now since it's no longer local-only
      expect(mockEnqueue).toHaveBeenCalled();
    });

    it('skips sync for updating hooks on local-only folder entities', () => {
      markFolderLocalOnly('f5', true);

      const hooks = getHooks('notes', 'updating');
      hooks[0](
        { title: 'Updated' },
        'n1',
        { id: 'n1', folderId: 'f5', title: 'Original' },
      );

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it('skips sync for deleting hooks on local-only folder entities', () => {
      markFolderLocalOnly('f6', true);

      const hooks = getHooks('notes', 'deleting');
      hooks[0]('n1', { id: 'n1', folderId: 'f6' });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it('handles updating that moves entity to a localOnly folder', () => {
      markFolderLocalOnly('f-local', true);

      const hooks = getHooks('notes', 'updating');
      // Original is in a normal folder, modifications move it to local-only
      hooks[0](
        { folderId: 'f-local' },
        'n1',
        { id: 'n1', folderId: 'f-normal', title: 'Note' },
      );

      vi.advanceTimersByTime(10);

      // The merged object has folderId=f-local, so it should be skipped
      expect(mockEnqueue).not.toHaveBeenCalled();
    });
  });

  // ── initLocalOnlyFlags ────────────────────────────────────────────

  describe('initLocalOnlyFlags', () => {
    it('loads localOnly flags from existing folders', async () => {
      mockFoldersToArray.mockResolvedValueOnce([
        { id: 'init-f1', localOnly: true },
        { id: 'init-f2', localOnly: false },
        { id: 'init-f3' }, // no localOnly field
      ]);

      await initLocalOnlyFlags();

      installSyncHooks();
      enableSync();

      // init-f1 should be local-only
      const hooks = getHooks('notes', 'creating');
      hooks[0]('n1', { id: 'n1', folderId: 'init-f1' });
      vi.advanceTimersByTime(10);
      expect(mockEnqueue).not.toHaveBeenCalled();

      // init-f2 should sync normally
      hooks[0]('n2', { id: 'n2', folderId: 'init-f2' });
      vi.advanceTimersByTime(10);
      expect(mockEnqueue).toHaveBeenCalledTimes(1);
    });

    it('handles DB errors gracefully', async () => {
      mockFoldersToArray.mockRejectedValueOnce(new Error('DB not ready'));

      // Should not throw
      await expect(initLocalOnlyFlags()).resolves.toBeUndefined();
    });
  });

  // ── Error handling in hooks ───────────────────────────────────────

  describe('error handling in hooks', () => {
    beforeEach(() => {
      installSyncHooks();
      enableSync();
    });

    it('logs a warning but does not throw when enqueue fails', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockEnqueue.mockRejectedValueOnce(new Error('Queue write failed'));

      const hooks = getHooks('notes', 'creating');
      hooks[0]('n1', { id: 'n1', title: 'Test' });

      vi.advanceTimersByTime(10);

      // Give the rejected promise time to settle
      await vi.advanceTimersByTimeAsync(10);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ── Rapid successive changes ──────────────────────────────────────

  describe('rapid successive changes', () => {
    beforeEach(() => {
      installSyncHooks();
      enableSync();
    });

    it('enqueues each rapid change independently', () => {
      const hooks = getHooks('notes', 'creating');

      hooks[0]('n1', { id: 'n1', title: 'First' });
      hooks[0]('n2', { id: 'n2', title: 'Second' });
      hooks[0]('n3', { id: 'n3', title: 'Third' });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).toHaveBeenCalledTimes(3);
      expect(mockEnqueue).toHaveBeenCalledWith('notes', 'n1', 'put', { id: 'n1', title: 'First' });
      expect(mockEnqueue).toHaveBeenCalledWith('notes', 'n2', 'put', { id: 'n2', title: 'Second' });
      expect(mockEnqueue).toHaveBeenCalledWith('notes', 'n3', 'put', { id: 'n3', title: 'Third' });
    });

    it('handles mixed create/update/delete sequences', () => {
      const createHooks = getHooks('notes', 'creating');
      const updateHooks = getHooks('notes', 'updating');
      const deleteHooks = getHooks('notes', 'deleting');

      createHooks[0]('n1', { id: 'n1', title: 'New' });
      updateHooks[0]({ title: 'Updated' }, 'n1', { id: 'n1', title: 'New' });
      deleteHooks[0]('n1', { id: 'n1', title: 'Updated' });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).toHaveBeenCalledTimes(3);
      expect(mockEnqueue).toHaveBeenNthCalledWith(1, 'notes', 'n1', 'put', { id: 'n1', title: 'New' });
      expect(mockEnqueue).toHaveBeenNthCalledWith(2, 'notes', 'n1', 'put', { id: 'n1', title: 'Updated' });
      expect(mockEnqueue).toHaveBeenNthCalledWith(3, 'notes', 'n1', 'delete');
    });
  });

  // ── Non-folder-scoped entities ────────────────────────────────────

  describe('entities without folderId', () => {
    beforeEach(() => {
      installSyncHooks();
      enableSync();
    });

    it('syncs tags without folderId normally', () => {
      const hooks = getHooks('tags', 'creating');
      hooks[0]('tg1', { id: 'tg1', name: 'urgent', color: '#ff0000' });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).toHaveBeenCalledWith(
        'tags', 'tg1', 'put',
        { id: 'tg1', name: 'urgent', color: '#ff0000' },
      );
    });

    it('syncs timelines without folderId normally', () => {
      const hooks = getHooks('timelines', 'creating');
      hooks[0]('tl1', { id: 'tl1', name: 'Main Timeline' });

      vi.advanceTimersByTime(10);

      expect(mockEnqueue).toHaveBeenCalledWith(
        'timelines', 'tl1', 'put',
        { id: 'tl1', name: 'Main Timeline' },
      );
    });
  });
});
