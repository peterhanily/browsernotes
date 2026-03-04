/**
 * Restore logic for encrypted backups — full replace or merge mode.
 */

import { db } from '../db';
import type { BackupPayload } from './backup-crypto';

export interface RestoreResult {
  added: number;
  updated: number;
  deleted: number;
  tables: string[];
}

const SYNCED_TABLES = ['notes', 'tasks', 'folders', 'tags', 'timelineEvents', 'timelines', 'whiteboards', 'standaloneIOCs', 'chatThreads'] as const;

export async function restoreFullReplace(payload: BackupPayload): Promise<RestoreResult> {
  let added = 0;
  const tables: string[] = [];

  const dexieTables = SYNCED_TABLES.map((t) => db[t]);

  await db.transaction('rw', dexieTables, async () => {
    for (const tableName of SYNCED_TABLES) {
      const items = payload.data[tableName as keyof BackupPayload['data']];
      if (!items || items.length === 0) continue;

      const table = db[tableName];
      await table.clear();
      await table.bulkAdd(items as never[]);
      added += items.length;
      tables.push(tableName);
    }
  });

  return { added, updated: 0, deleted: 0, tables };
}

export async function restoreMerge(payload: BackupPayload): Promise<RestoreResult> {
  let added = 0;
  let updated = 0;
  let deleted = 0;
  const tables: string[] = [];

  const dexieTables = SYNCED_TABLES.map((t) => db[t]);

  await db.transaction('rw', dexieTables, async () => {
    for (const tableName of SYNCED_TABLES) {
      const items = payload.data[tableName as keyof BackupPayload['data']];
      if (!items || items.length === 0) {
        // Still check for deletedIds
        if (payload.deletedIds?.[tableName]?.length) {
          const table = db[tableName];
          await table.bulkDelete(payload.deletedIds[tableName]);
          deleted += payload.deletedIds[tableName].length;
          if (!tables.includes(tableName)) tables.push(tableName);
        }
        continue;
      }

      const table = db[tableName];
      if (!tables.includes(tableName)) tables.push(tableName);

      for (const item of items) {
        const record = item as Record<string, unknown>;
        const id = record.id as string;
        if (!id) continue;

        const existing = await table.get(id);
        if (!existing) {
          await table.add(item as never);
          added++;
        } else {
          const existingUpdatedAt = (existing as Record<string, unknown>).updatedAt as number | undefined;
          const incomingUpdatedAt = record.updatedAt as number | undefined;
          if (incomingUpdatedAt && existingUpdatedAt && incomingUpdatedAt > existingUpdatedAt) {
            await table.put(item as never);
            updated++;
          }
        }
      }

      // Apply tombstone deletes
      if (payload.deletedIds?.[tableName]?.length) {
        await table.bulkDelete(payload.deletedIds[tableName]);
        deleted += payload.deletedIds[tableName].length;
      }
    }
  });

  return { added, updated, deleted, tables };
}
