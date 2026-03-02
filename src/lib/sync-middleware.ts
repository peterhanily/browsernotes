import { syncEngine } from './sync-engine';

// Tables that should be synced to server
const SYNCED_TABLES = new Set([
  'notes', 'tasks', 'folders', 'tags',
  'timelineEvents', 'timelines', 'whiteboards',
  'standaloneIOCs', 'chatThreads',
]);

let syncEnabled = false;

export function enableSync() {
  syncEnabled = true;
}

export function disableSync() {
  syncEnabled = false;
}

/**
 * Call this after any Dexie write operation to enqueue the change for sync.
 * This is a simple approach — instead of a Dexie middleware, we call it explicitly
 * from the hooks after each mutation.
 */
export async function enqueueSyncChange(
  table: string,
  entityId: string,
  op: 'put' | 'delete',
  data?: Record<string, unknown>
) {
  if (!syncEnabled || !SYNCED_TABLES.has(table)) return;

  try {
    await syncEngine.enqueue(table, entityId, op, data);
  } catch (err) {
    console.error('Failed to enqueue sync change:', err);
  }
}
