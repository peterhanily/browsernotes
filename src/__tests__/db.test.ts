/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';

beforeEach(async () => {
  await db.notes.clear();
  await db.tasks.clear();
  await db.folders.clear();
  await db.tags.clear();
});

describe('Database schema', () => {
  it('can CRUD notes', async () => {
    await db.notes.add({
      id: 'n1', title: 'Test', content: 'Hello', tags: ['a'],
      pinned: false, archived: false, trashed: false,
      createdAt: Date.now(), updatedAt: Date.now(),
    });

    const note = await db.notes.get('n1');
    expect(note).toBeDefined();
    expect(note!.title).toBe('Test');

    await db.notes.update('n1', { title: 'Updated' });
    const updated = await db.notes.get('n1');
    expect(updated!.title).toBe('Updated');

    await db.notes.delete('n1');
    const deleted = await db.notes.get('n1');
    expect(deleted).toBeUndefined();
  });

  it('can CRUD tasks', async () => {
    await db.tasks.add({
      id: 't1', title: 'Task', completed: false, priority: 'high',
      tags: [], status: 'todo', order: 1,
      createdAt: Date.now(), updatedAt: Date.now(),
    });

    const task = await db.tasks.get('t1');
    expect(task).toBeDefined();
    expect(task!.priority).toBe('high');

    await db.tasks.update('t1', { status: 'done', completed: true });
    const done = await db.tasks.get('t1');
    expect(done!.completed).toBe(true);
    expect(done!.status).toBe('done');
  });

  it('can CRUD folders', async () => {
    await db.folders.add({ id: 'f1', name: 'Work', order: 1, createdAt: Date.now() });

    const folders = await db.folders.toArray();
    expect(folders).toHaveLength(1);
    expect(folders[0].name).toBe('Work');
  });

  it('can CRUD tags', async () => {
    await db.tags.add({ id: 'tg1', name: 'urgent', color: '#ff0000' });

    const tags = await db.tags.toArray();
    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe('urgent');
  });

  it('supports querying notes by folderId', async () => {
    await db.notes.bulkAdd([
      { id: 'n1', title: 'A', content: '', tags: [], pinned: false, archived: false, trashed: false, folderId: 'f1', createdAt: 1, updatedAt: 1 },
      { id: 'n2', title: 'B', content: '', tags: [], pinned: false, archived: false, trashed: false, folderId: 'f2', createdAt: 1, updatedAt: 1 },
      { id: 'n3', title: 'C', content: '', tags: [], pinned: false, archived: false, trashed: false, createdAt: 1, updatedAt: 1 },
    ]);

    const inF1 = await db.notes.where('folderId').equals('f1').toArray();
    expect(inF1).toHaveLength(1);
    expect(inF1[0].id).toBe('n1');
  });

  it('supports querying tasks by status', async () => {
    await db.tasks.bulkAdd([
      { id: 't1', title: 'A', completed: false, priority: 'none', tags: [], status: 'todo', order: 1, createdAt: 1, updatedAt: 1 },
      { id: 't2', title: 'B', completed: false, priority: 'none', tags: [], status: 'in-progress', order: 2, createdAt: 1, updatedAt: 1 },
      { id: 't3', title: 'C', completed: true, priority: 'none', tags: [], status: 'done', order: 3, createdAt: 1, updatedAt: 1 },
    ]);

    const todos = await db.tasks.where('status').equals('todo').toArray();
    expect(todos).toHaveLength(1);

    const done = await db.tasks.where('status').equals('done').toArray();
    expect(done).toHaveLength(1);
  });
});
