/**
 * Data collection for backup payloads — follows export.ts patterns.
 */

import { db } from '../db';
import type { BackupPayload } from './backup-crypto';

export async function buildFullBackupPayload(
  scope: 'all' | 'investigation' | 'entity',
  scopeId?: string,
): Promise<BackupPayload> {
  const data: BackupPayload['data'] = {};

  if (scope === 'all') {
    const [notes, tasks, folders, tags, timelineEvents, timelines, whiteboards, standaloneIOCs, chatThreads] =
      await Promise.all([
        db.notes.toArray(),
        db.tasks.toArray(),
        db.folders.toArray(),
        db.tags.toArray(),
        db.timelineEvents.toArray(),
        db.timelines.toArray(),
        db.whiteboards.toArray(),
        db.standaloneIOCs.toArray(),
        db.chatThreads.toArray(),
      ]);
    Object.assign(data, { notes, tasks, folders, tags, timelineEvents, timelines, whiteboards, standaloneIOCs, chatThreads });
  } else if (scope === 'investigation') {
    if (!scopeId) throw new Error('scopeId required for investigation scope');
    const [folder, notes, tasks, allTags, events, allTimelines, whiteboards, iocs, chats] = await Promise.all([
      db.folders.get(scopeId),
      db.notes.where('folderId').equals(scopeId).toArray(),
      db.tasks.where('folderId').equals(scopeId).toArray(),
      db.tags.toArray(),
      db.timelineEvents.where('folderId').equals(scopeId).toArray(),
      db.timelines.toArray(),
      db.whiteboards.where('folderId').equals(scopeId).toArray(),
      db.standaloneIOCs.where('folderId').equals(scopeId).toArray(),
      db.chatThreads.where('folderId').equals(scopeId).toArray(),
    ]);
    if (!folder) throw new Error('Investigation not found');

    // Collect used tag names
    const usedTagNames = new Set<string>();
    for (const n of notes) n.tags.forEach((t: string) => usedTagNames.add(t));
    for (const t of tasks) t.tags.forEach((tg: string) => usedTagNames.add(tg));
    for (const e of events) e.tags.forEach((tg: string) => usedTagNames.add(tg));
    for (const w of whiteboards) w.tags.forEach((tg: string) => usedTagNames.add(tg));
    if (folder.tags) folder.tags.forEach((t: string) => usedTagNames.add(t));
    const tags = allTags.filter((t) => usedTagNames.has(t.name));

    // Include linked timelines
    const timelineIds = new Set(events.map((e) => e.timelineId));
    if (folder.timelineId) timelineIds.add(folder.timelineId);
    const timelines = allTimelines.filter((t) => timelineIds.has(t.id));

    Object.assign(data, {
      notes, tasks, folders: [folder], tags, timelineEvents: events, timelines, whiteboards,
      standaloneIOCs: iocs, chatThreads: chats,
    });
  } else if (scope === 'entity') {
    if (!scopeId) throw new Error('scopeId required for entity scope');
    const [tableName, entityId] = scopeId.split(':');
    if (!tableName || !entityId) throw new Error('scopeId must be "tableName:entityId"');
    const table = (db as Record<string, { get: (id: string) => Promise<unknown> }>)[tableName];
    if (!table) throw new Error(`Unknown table: ${tableName}`);
    const entity = await table.get(entityId);
    if (!entity) throw new Error(`Entity not found: ${scopeId}`);
    data[tableName as keyof BackupPayload['data']] = [entity];
  }

  return {
    version: 1,
    type: 'full',
    scope,
    scopeId,
    createdAt: Date.now(),
    data,
  };
}

export async function buildDifferentialPayload(
  scope: 'all' | 'investigation' | 'entity',
  lastBackupAt: number,
  parentBackupId: string,
  scopeId?: string,
): Promise<BackupPayload> {
  const data: BackupPayload['data'] = {};
  const deletedIds: Record<string, string[]> = {};

  const tables = ['notes', 'tasks', 'folders', 'tags', 'timelineEvents', 'timelines', 'whiteboards', 'standaloneIOCs', 'chatThreads'] as const;

  for (const tableName of tables) {
    const table = db[tableName];
    const collection = table.where('updatedAt').above(lastBackupAt);

    // For investigation scope, further filter by folderId where applicable
    if (scope === 'investigation' && scopeId) {
      const all = await collection.toArray();
      const filtered = all.filter((item: Record<string, unknown>) => {
        if ('folderId' in item) return item.folderId === scopeId;
        return true; // tags, timelines don't have folderId — include if updated
      });
      data[tableName as keyof BackupPayload['data']] = filtered;
    } else {
      data[tableName as keyof BackupPayload['data']] = await collection.toArray();
    }

    // Collect trashed entity IDs as tombstones
    const trashed = await table.filter((item: Record<string, unknown>) => {
      if (!item.trashed) return false;
      if (scope === 'investigation' && scopeId && 'folderId' in item) {
        return item.folderId === scopeId;
      }
      return scope === 'all';
    }).toArray();

    if (trashed.length > 0) {
      deletedIds[tableName] = trashed.map((item: Record<string, unknown>) => item.id as string);
    }
  }

  return {
    version: 1,
    type: 'differential',
    scope,
    scopeId,
    parentBackupId,
    createdAt: Date.now(),
    lastBackupAt,
    data,
    deletedIds: Object.keys(deletedIds).length > 0 ? deletedIds : undefined,
  };
}

export function countPayloadEntities(payload: BackupPayload): number {
  let count = 0;
  const data = payload.data;
  if (data.notes) count += data.notes.length;
  if (data.tasks) count += data.tasks.length;
  if (data.folders) count += data.folders.length;
  if (data.tags) count += data.tags.length;
  if (data.timelineEvents) count += data.timelineEvents.length;
  if (data.timelines) count += data.timelines.length;
  if (data.whiteboards) count += data.whiteboards.length;
  if (data.standaloneIOCs) count += data.standaloneIOCs.length;
  if (data.chatThreads) count += data.chatThreads.length;
  return count;
}
