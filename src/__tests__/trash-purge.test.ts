import { describe, it, expect, vi, beforeEach } from 'vitest';
import { purgeOldTrash } from '../lib/trash-purge';

// ── Helpers ──────────────────────────────────────────────────────────

interface TestItem {
  id: string;
  trashed: boolean;
  trashedAt?: number;
  title?: string;
}

const DAY_MS = 86_400_000;
const NOW = Date.now();

function makeItem(overrides: Partial<TestItem> = {}): TestItem {
  return {
    id: 'item-1',
    trashed: false,
    title: 'Test item',
    ...overrides,
  };
}

function makeMockTable() {
  return {
    bulkDelete: vi.fn(async () => {}),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('purgeOldTrash', () => {
  let mockTable: ReturnType<typeof makeMockTable>;

  beforeEach(() => {
    mockTable = makeMockTable();
    vi.clearAllMocks();
  });

  it('does not purge items trashed less than 30 days ago', async () => {
    const item = makeItem({
      id: 'recent',
      trashed: true,
      trashedAt: NOW - 15 * DAY_MS, // 15 days ago
    });
    const result = await purgeOldTrash([item], mockTable);
    expect(mockTable.bulkDelete).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('recent');
  });

  it('purges items trashed 30 or more days ago', async () => {
    const item = makeItem({
      id: 'old',
      trashed: true,
      trashedAt: NOW - 31 * DAY_MS, // 31 days ago
    });
    const result = await purgeOldTrash([item], mockTable);
    expect(mockTable.bulkDelete).toHaveBeenCalledWith(['old']);
    expect(result).toHaveLength(0);
  });

  it('purges items trashed exactly 30 days ago', async () => {
    const item = makeItem({
      id: 'boundary',
      trashed: true,
      trashedAt: NOW - 30 * DAY_MS - 1, // just over 30 days
    });
    const result = await purgeOldTrash([item], mockTable);
    expect(mockTable.bulkDelete).toHaveBeenCalledWith(['boundary']);
    expect(result).toHaveLength(0);
  });

  it('skips trashed items with no trashedAt', async () => {
    const item = makeItem({
      id: 'no-date',
      trashed: true,
      // trashedAt is undefined
    });
    const result = await purgeOldTrash([item], mockTable);
    expect(mockTable.bulkDelete).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('no-date');
  });

  it('never touches non-trashed items', async () => {
    const items = [
      makeItem({ id: 'active-1', trashed: false }),
      makeItem({ id: 'active-2', trashed: false, trashedAt: NOW - 60 * DAY_MS }),
    ];
    const result = await purgeOldTrash(items, mockTable);
    expect(mockTable.bulkDelete).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it('handles a mix of purge-eligible and non-eligible items', async () => {
    const items = [
      makeItem({ id: 'old-trashed', trashed: true, trashedAt: NOW - 40 * DAY_MS }),
      makeItem({ id: 'recent-trashed', trashed: true, trashedAt: NOW - 5 * DAY_MS }),
      makeItem({ id: 'active', trashed: false }),
      makeItem({ id: 'no-date-trashed', trashed: true }),
    ];
    const result = await purgeOldTrash(items, mockTable);
    expect(mockTable.bulkDelete).toHaveBeenCalledWith(['old-trashed']);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id).sort()).toEqual(['active', 'no-date-trashed', 'recent-trashed']);
  });

  it('handles empty item list', async () => {
    const result = await purgeOldTrash([], mockTable);
    expect(mockTable.bulkDelete).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('bulk deletes multiple old items in one call', async () => {
    const items = [
      makeItem({ id: 'old-1', trashed: true, trashedAt: NOW - 35 * DAY_MS }),
      makeItem({ id: 'old-2', trashed: true, trashedAt: NOW - 45 * DAY_MS }),
      makeItem({ id: 'old-3', trashed: true, trashedAt: NOW - 90 * DAY_MS }),
    ];
    const result = await purgeOldTrash(items, mockTable);
    expect(mockTable.bulkDelete).toHaveBeenCalledOnce();
    expect(mockTable.bulkDelete).toHaveBeenCalledWith(['old-1', 'old-2', 'old-3']);
    expect(result).toHaveLength(0);
  });

  // Test across different entity "types" (all use the same Trashable interface)
  it('works for note-like entities', async () => {
    const notes = [
      { id: 'note-1', trashed: true, trashedAt: NOW - 31 * DAY_MS, title: 'Old note', content: 'foo' },
      { id: 'note-2', trashed: false, title: 'Active note', content: 'bar' },
    ];
    const result = await purgeOldTrash(notes, mockTable);
    expect(mockTable.bulkDelete).toHaveBeenCalledWith(['note-1']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('note-2');
  });

  it('works for task-like entities', async () => {
    const tasks = [
      { id: 'task-1', trashed: true, trashedAt: NOW - 60 * DAY_MS, title: 'Done task' },
      { id: 'task-2', trashed: true, trashedAt: NOW - 2 * DAY_MS, title: 'Recent task' },
    ];
    const result = await purgeOldTrash(tasks, mockTable);
    expect(mockTable.bulkDelete).toHaveBeenCalledWith(['task-1']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('task-2');
  });
});
