/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BackupPayload, EncryptedBackupBlob } from '../lib/backup-crypto';

// ── Mock ../db so backup-restore doesn't touch a real Dexie instance ──
// vi.hoisted ensures these are available when the vi.mock factory runs
// (vi.mock factories are hoisted above imports by vitest)

const {
  mockClear,
  mockBulkAdd,
  mockBulkDelete,
  mockGet,
  mockAdd,
  mockPut,
  mockTransaction,
} = vi.hoisted(() => {
  const mockClear = vi.fn().mockResolvedValue(undefined);
  const mockBulkAdd = vi.fn().mockResolvedValue(undefined);
  const mockBulkDelete = vi.fn().mockResolvedValue(undefined);
  const mockGet = vi.fn().mockResolvedValue(undefined);
  const mockAdd = vi.fn().mockResolvedValue(undefined);
  const mockPut = vi.fn().mockResolvedValue(undefined);
  const mockTransaction = vi.fn(async (_mode: string, _tables: any[], fn: () => Promise<void>) => {
    await fn();
  });
  return { mockClear, mockBulkAdd, mockBulkDelete, mockGet, mockAdd, mockPut, mockTransaction };
});

vi.mock('../db', () => {
  const table = () => ({
    clear: mockClear,
    bulkAdd: mockBulkAdd,
    bulkDelete: mockBulkDelete,
    get: mockGet,
    add: mockAdd,
    put: mockPut,
  });
  return {
    db: {
      transaction: mockTransaction,
      notes: table(),
      tasks: table(),
      folders: table(),
      tags: table(),
      timelineEvents: table(),
      timelines: table(),
      whiteboards: table(),
      standaloneIOCs: table(),
      chatThreads: table(),
    },
  };
});

import { restoreFullReplace, restoreMerge } from '../lib/backup-restore';

// ── Helpers ────────────────────────────────────────────────────────

function makePayload(overrides: Partial<BackupPayload> = {}): BackupPayload {
  return {
    version: 1,
    type: 'full',
    scope: 'all',
    createdAt: Date.now(),
    data: {},
    ...overrides,
  };
}

function makeNote(id: string, updatedAt: number) {
  return {
    id,
    title: `Note ${id}`,
    content: '',
    tags: [],
    pinned: false,
    archived: false,
    trashed: false,
    createdAt: updatedAt - 1000,
    updatedAt,
  };
}

function makeTask(id: string, updatedAt: number) {
  return {
    id,
    title: `Task ${id}`,
    completed: false,
    priority: 'none',
    tags: [],
    status: 'todo',
    order: 0,
    trashed: false,
    archived: false,
    createdAt: updatedAt - 1000,
    updatedAt,
  };
}

// ── restoreFullReplace ─────────────────────────────────────────────

describe('restoreFullReplace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to defaults
    mockClear.mockResolvedValue(undefined);
    mockBulkAdd.mockResolvedValue(undefined);
    mockGet.mockResolvedValue(undefined);
    mockAdd.mockResolvedValue(undefined);
    mockPut.mockResolvedValue(undefined);
    mockBulkDelete.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(async (_mode: string, _tables: any[], fn: () => Promise<void>) => {
      await fn();
    });
  });

  it('returns zero counts for empty payload', async () => {
    const result = await restoreFullReplace(makePayload({ data: {} }));
    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.deleted).toBe(0);
    expect(result.tables).toEqual([]);
  });

  it('clears and bulk-adds notes', async () => {
    const notes = [makeNote('n1', 1000), makeNote('n2', 2000)];
    const result = await restoreFullReplace(makePayload({ data: { notes } }));

    expect(result.added).toBe(2);
    expect(result.tables).toContain('notes');
    expect(mockClear).toHaveBeenCalled();
    expect(mockBulkAdd).toHaveBeenCalledWith(notes);
  });

  it('clears and bulk-adds tasks', async () => {
    const tasks = [makeTask('t1', 1000)];
    const result = await restoreFullReplace(makePayload({ data: { tasks } }));

    expect(result.added).toBe(1);
    expect(result.tables).toContain('tasks');
  });

  it('processes multiple tables', async () => {
    const notes = [makeNote('n1', 1000)];
    const tasks = [makeTask('t1', 2000), makeTask('t2', 3000)];
    const folders = [{ id: 'f1', name: 'Folder', order: 0, createdAt: 1000 }];

    const result = await restoreFullReplace(makePayload({
      data: { notes, tasks, folders: folders as any },
    }));

    expect(result.added).toBe(4);
    expect(result.tables).toContain('notes');
    expect(result.tables).toContain('tasks');
    expect(result.tables).toContain('folders');
  });

  it('skips tables with empty arrays', async () => {
    const result = await restoreFullReplace(makePayload({
      data: { notes: [], tasks: [makeTask('t1', 1000)] },
    }));

    expect(result.added).toBe(1);
    expect(result.tables).not.toContain('notes');
    expect(result.tables).toContain('tasks');
  });

  it('always sets updated and deleted to 0', async () => {
    const result = await restoreFullReplace(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
    }));

    expect(result.updated).toBe(0);
    expect(result.deleted).toBe(0);
  });

  it('wraps operations in a readwrite transaction', async () => {
    await restoreFullReplace(makePayload({ data: { notes: [makeNote('n1', 1000)] } }));

    expect(mockTransaction).toHaveBeenCalledWith(
      'rw',
      expect.any(Array),
      expect.any(Function),
    );
  });

  it('throws descriptive error on storage quota exceeded (DOMException)', async () => {
    const quotaErr = new DOMException('Quota exceeded', 'QuotaExceededError');
    mockTransaction.mockRejectedValueOnce(quotaErr);

    await expect(restoreFullReplace(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
    }))).rejects.toThrow('Storage quota exceeded');
  });

  it('throws descriptive error on quota exceeded (string match)', async () => {
    // DOMException.code is a read-only getter, so we test the string-based
    // detection path instead (the source checks String(err) for "QuotaExceeded")
    const quotaErr = new Error('QuotaExceeded: disk full');
    mockTransaction.mockRejectedValueOnce(quotaErr);

    await expect(restoreFullReplace(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
    }))).rejects.toThrow('Storage quota exceeded');
  });

  it('re-throws non-quota errors as-is', async () => {
    const genericErr = new Error('Some other DB error');
    mockTransaction.mockRejectedValueOnce(genericErr);

    await expect(restoreFullReplace(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
    }))).rejects.toThrow('Some other DB error');
  });

  it('handles all synced table types', async () => {
    const payload = makePayload({
      data: {
        notes: [makeNote('n1', 1000)],
        tasks: [makeTask('t1', 1000)],
        folders: [{ id: 'f1', name: 'F', order: 0, createdAt: 1000 }] as any,
        tags: [{ id: 'tg1', name: 'tag', color: '#000' }] as any,
        timelineEvents: [{ id: 'te1', timestamp: 1000 }] as any,
        timelines: [{ id: 'tl1', name: 'TL', order: 0 }] as any,
        whiteboards: [{ id: 'wb1', name: 'WB', elements: '[]' }] as any,
        standaloneIOCs: [{ id: 'ioc1', type: 'ipv4', value: '1.2.3.4' }] as any,
        chatThreads: [{ id: 'ct1', title: 'Chat' }] as any,
      },
    });

    const result = await restoreFullReplace(payload);
    expect(result.added).toBe(9);
    expect(result.tables).toHaveLength(9);
  });
});

// ── restoreMerge ───────────────────────────────────────────────────

describe('restoreMerge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClear.mockResolvedValue(undefined);
    mockBulkAdd.mockResolvedValue(undefined);
    mockGet.mockResolvedValue(undefined);
    mockAdd.mockResolvedValue(undefined);
    mockPut.mockResolvedValue(undefined);
    mockBulkDelete.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(async (_mode: string, _tables: any[], fn: () => Promise<void>) => {
      await fn();
    });
  });

  it('returns zero counts for empty payload', async () => {
    const result = await restoreMerge(makePayload({ data: {} }));
    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.deleted).toBe(0);
    expect(result.tables).toEqual([]);
  });

  it('adds items that do not exist in the database', async () => {
    mockGet.mockResolvedValue(undefined); // not found
    const notes = [makeNote('n1', 1000), makeNote('n2', 2000)];

    const result = await restoreMerge(makePayload({ data: { notes } }));

    expect(result.added).toBe(2);
    expect(result.updated).toBe(0);
    expect(mockAdd).toHaveBeenCalledTimes(2);
  });

  it('updates items when backup is newer (higher updatedAt)', async () => {
    mockGet.mockResolvedValue({ id: 'n1', updatedAt: 500 }); // older
    const notes = [makeNote('n1', 1000)]; // newer

    const result = await restoreMerge(makePayload({ data: { notes } }));

    expect(result.updated).toBe(1);
    expect(result.added).toBe(0);
    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledWith(notes[0]);
  });

  it('skips items when local is newer (higher updatedAt)', async () => {
    mockGet.mockResolvedValue({ id: 'n1', updatedAt: 2000 }); // newer
    const notes = [makeNote('n1', 1000)]; // older

    const result = await restoreMerge(makePayload({ data: { notes } }));

    expect(result.updated).toBe(0);
    expect(result.added).toBe(0);
    expect(mockPut).not.toHaveBeenCalled();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('skips items when timestamps are equal', async () => {
    mockGet.mockResolvedValue({ id: 'n1', updatedAt: 1000 }); // same
    const notes = [makeNote('n1', 1000)]; // same

    const result = await restoreMerge(makePayload({ data: { notes } }));

    expect(result.updated).toBe(0);
    expect(result.added).toBe(0);
  });

  it('handles mix of adds and updates', async () => {
    mockGet
      .mockResolvedValueOnce(undefined)       // n1: not found -> add
      .mockResolvedValueOnce({ id: 'n2', updatedAt: 500 }); // n2: older -> update

    const notes = [makeNote('n1', 1000), makeNote('n2', 1000)];
    const result = await restoreMerge(makePayload({ data: { notes } }));

    expect(result.added).toBe(1);
    expect(result.updated).toBe(1);
  });

  it('skips items without an id', async () => {
    const notes = [{ title: 'No ID', updatedAt: 1000 }] as any; // missing id

    const result = await restoreMerge(makePayload({ data: { notes } }));

    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('applies tombstone deletions via deletedIds', async () => {
    mockGet.mockResolvedValue(undefined);
    const result = await restoreMerge(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
      deletedIds: { notes: ['n-deleted-1', 'n-deleted-2'] },
    }));

    expect(result.deleted).toBe(2);
    expect(mockBulkDelete).toHaveBeenCalledWith(['n-deleted-1', 'n-deleted-2']);
  });

  it('applies tombstone deletions for tables with no data items', async () => {
    const result = await restoreMerge(makePayload({
      data: {},
      deletedIds: { tasks: ['t-del-1'] },
    }));

    expect(result.deleted).toBe(1);
    expect(result.tables).toContain('tasks');
    expect(mockBulkDelete).toHaveBeenCalledWith(['t-del-1']);
  });

  it('applies tombstone deletions alongside data items', async () => {
    mockGet.mockResolvedValue(undefined); // not found -> add

    const result = await restoreMerge(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
      deletedIds: { notes: ['n-old'] },
    }));

    expect(result.added).toBe(1);
    expect(result.deleted).toBe(1);
    expect(result.tables).toContain('notes');
  });

  it('tracks affected tables correctly', async () => {
    mockGet.mockResolvedValue(undefined);
    const result = await restoreMerge(makePayload({
      data: {
        notes: [makeNote('n1', 1000)],
        tasks: [makeTask('t1', 1000)],
      },
    }));

    expect(result.tables).toContain('notes');
    expect(result.tables).toContain('tasks');
    expect(result.tables).toHaveLength(2);
  });

  it('does not duplicate table names when both items and deletedIds exist', async () => {
    mockGet.mockResolvedValue(undefined);
    const result = await restoreMerge(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
      deletedIds: { notes: ['n-del'] },
    }));

    const noteCount = result.tables.filter(t => t === 'notes').length;
    expect(noteCount).toBe(1);
  });

  it('wraps operations in a readwrite transaction', async () => {
    await restoreMerge(makePayload({ data: { notes: [makeNote('n1', 1000)] } }));

    expect(mockTransaction).toHaveBeenCalledWith(
      'rw',
      expect.any(Array),
      expect.any(Function),
    );
  });

  it('throws descriptive error on storage quota exceeded', async () => {
    const quotaErr = new DOMException('Quota exceeded', 'QuotaExceededError');
    mockTransaction.mockRejectedValueOnce(quotaErr);

    await expect(restoreMerge(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
    }))).rejects.toThrow('Storage quota exceeded');
  });

  it('re-throws non-quota errors as-is', async () => {
    const genericErr = new Error('Constraint error');
    mockTransaction.mockRejectedValueOnce(genericErr);

    await expect(restoreMerge(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
    }))).rejects.toThrow('Constraint error');
  });

  it('handles existing items without updatedAt (no update)', async () => {
    mockGet.mockResolvedValue({ id: 'n1' }); // no updatedAt field
    const notes = [makeNote('n1', 1000)];

    const result = await restoreMerge(makePayload({ data: { notes } }));

    // The condition requires BOTH record.updatedAt AND existing.updatedAt to be truthy
    expect(result.updated).toBe(0);
    expect(result.added).toBe(0);
  });

  it('handles backup items without updatedAt (no update)', async () => {
    mockGet.mockResolvedValue({ id: 'n1', updatedAt: 500 });
    const notes = [{ id: 'n1', title: 'No updatedAt' }] as any; // missing updatedAt

    const result = await restoreMerge(makePayload({ data: { notes } }));

    expect(result.updated).toBe(0);
  });
});

// ── BackupPayload structure tests ──────────────────────────────────

describe('BackupPayload structure', () => {
  it('has the expected shape for a full backup', () => {
    const payload: BackupPayload = {
      version: 1,
      type: 'full',
      scope: 'all',
      createdAt: Date.now(),
      data: {
        notes: [],
        tasks: [],
      },
    };
    expect(payload.version).toBe(1);
    expect(payload.type).toBe('full');
    expect(payload.scope).toBe('all');
  });

  it('has the expected shape for a differential backup', () => {
    const payload: BackupPayload = {
      version: 1,
      type: 'differential',
      scope: 'all',
      parentBackupId: 'parent-123',
      createdAt: Date.now(),
      lastBackupAt: Date.now() - 86400000,
      data: {
        notes: [makeNote('n1', 1000)],
      },
      deletedIds: {
        notes: ['n-deleted'],
      },
    };
    expect(payload.type).toBe('differential');
    expect(payload.parentBackupId).toBe('parent-123');
    expect(payload.deletedIds?.notes).toEqual(['n-deleted']);
  });

  it('supports investigation-scoped backup', () => {
    const payload: BackupPayload = {
      version: 1,
      type: 'full',
      scope: 'investigation',
      scopeId: 'folder-abc',
      createdAt: Date.now(),
      data: {},
    };
    expect(payload.scope).toBe('investigation');
    expect(payload.scopeId).toBe('folder-abc');
  });

  it('supports entity-scoped backup', () => {
    const payload: BackupPayload = {
      version: 1,
      type: 'full',
      scope: 'entity',
      scopeId: 'note-xyz',
      createdAt: Date.now(),
      data: {},
    };
    expect(payload.scope).toBe('entity');
    expect(payload.scopeId).toBe('note-xyz');
  });
});

// ── Encryption round-trip tests (backup-crypto) ────────────────────

describe('backup encryption/decryption round-trip', () => {
  // These tests import the real crypto functions and exercise the
  // encrypt -> decrypt pipeline end-to-end using the Web Crypto API.

  it('encrypts and decrypts a full backup payload', async () => {
    const { encryptBackup, decryptBackup } = await import('../lib/backup-crypto');

    const payload: BackupPayload = {
      version: 1,
      type: 'full',
      scope: 'all',
      createdAt: 1700000000000,
      data: {
        notes: [makeNote('n1', 1000), makeNote('n2', 2000)],
        tasks: [makeTask('t1', 3000)],
      },
    };

    const password = 'test-password-123!';
    const blob = await encryptBackup(password, payload);

    expect(blob.v).toBe(1);
    expect(typeof blob.salt).toBe('string');
    expect(typeof blob.iv).toBe('string');
    expect(typeof blob.ct).toBe('string');

    const decrypted = await decryptBackup(password, blob);
    expect(decrypted).toEqual(payload);
  });

  it('encrypts and decrypts a differential backup with deletedIds', async () => {
    const { encryptBackup, decryptBackup } = await import('../lib/backup-crypto');

    const payload: BackupPayload = {
      version: 1,
      type: 'differential',
      scope: 'all',
      parentBackupId: 'parent-1',
      createdAt: Date.now(),
      lastBackupAt: Date.now() - 3600000,
      data: {
        notes: [makeNote('n-new', 5000)],
      },
      deletedIds: {
        notes: ['n-old-1', 'n-old-2'],
        tasks: ['t-old-1'],
      },
    };

    const password = 'differential-pass';
    const blob = await encryptBackup(password, payload);
    const decrypted = await decryptBackup(password, blob);
    expect(decrypted).toEqual(payload);
  });

  it('encrypts and decrypts an empty data payload', async () => {
    const { encryptBackup, decryptBackup } = await import('../lib/backup-crypto');

    const payload: BackupPayload = {
      version: 1,
      type: 'full',
      scope: 'all',
      createdAt: Date.now(),
      data: {},
    };

    const blob = await encryptBackup('empty-pass', payload);
    const decrypted = await decryptBackup('empty-pass', blob);
    expect(decrypted).toEqual(payload);
  });

  it('fails to decrypt with wrong password', async () => {
    const { encryptBackup, decryptBackup } = await import('../lib/backup-crypto');

    const payload = makePayload({ data: { notes: [makeNote('n1', 1000)] } });
    const blob = await encryptBackup('correct-password', payload);

    await expect(decryptBackup('wrong-password', blob)).rejects.toThrow(
      'Wrong password or corrupted backup',
    );
  });

  it('produces different ciphertext for same payload encrypted twice', async () => {
    const { encryptBackup } = await import('../lib/backup-crypto');

    const payload = makePayload({ data: { notes: [makeNote('n1', 1000)] } });
    const blob1 = await encryptBackup('same-pass', payload);
    const blob2 = await encryptBackup('same-pass', payload);

    // Different salt and IV should produce different ciphertext
    expect(blob1.ct).not.toBe(blob2.ct);
  });

  it('rejects unsupported backup format version', async () => {
    const { decryptBackup } = await import('../lib/backup-crypto');

    const fakeBlob: EncryptedBackupBlob = {
      v: 99 as any, // wrong version
      salt: 'abc',
      iv: 'def',
      ct: 'ghi',
    };

    await expect(decryptBackup('any-password', fakeBlob)).rejects.toThrow(
      'Unsupported backup format version',
    );
  });

  it('preserves all payload fields through encryption round-trip', async () => {
    const { encryptBackup, decryptBackup } = await import('../lib/backup-crypto');

    const payload: BackupPayload = {
      version: 1,
      type: 'differential',
      scope: 'investigation',
      scopeId: 'folder-abc',
      parentBackupId: 'backup-parent-xyz',
      createdAt: 1700000000000,
      lastBackupAt: 1699990000000,
      data: {
        notes: [makeNote('n1', 1000)],
        tasks: [],
        folders: [{ id: 'f1', name: 'Test', order: 0, createdAt: 1000 }] as any,
        tags: [{ id: 'tg1', name: 'urgent', color: '#ff0000' }] as any,
        timelineEvents: [],
        timelines: [],
        whiteboards: [],
        standaloneIOCs: [],
        chatThreads: [],
      },
      deletedIds: {
        notes: ['n-deleted'],
        tasks: ['t-deleted-1', 't-deleted-2'],
      },
    };

    const blob = await encryptBackup('full-field-test', payload);
    const decrypted = await decryptBackup('full-field-test', blob);

    expect(decrypted.version).toBe(1);
    expect(decrypted.type).toBe('differential');
    expect(decrypted.scope).toBe('investigation');
    expect(decrypted.scopeId).toBe('folder-abc');
    expect(decrypted.parentBackupId).toBe('backup-parent-xyz');
    expect(decrypted.createdAt).toBe(1700000000000);
    expect(decrypted.lastBackupAt).toBe(1699990000000);
    expect(decrypted.data.notes).toHaveLength(1);
    expect(decrypted.data.tasks).toHaveLength(0);
    expect(decrypted.data.folders).toHaveLength(1);
    expect(decrypted.data.tags).toHaveLength(1);
    expect(decrypted.deletedIds?.notes).toEqual(['n-deleted']);
    expect(decrypted.deletedIds?.tasks).toEqual(['t-deleted-1', 't-deleted-2']);
  });

  it('EncryptedBackupBlob has the correct shape', async () => {
    const { encryptBackup } = await import('../lib/backup-crypto');

    const payload = makePayload({ data: {} });
    const blob = await encryptBackup('shape-test', payload);

    expect(blob).toHaveProperty('v', 1);
    expect(blob).toHaveProperty('salt');
    expect(blob).toHaveProperty('iv');
    expect(blob).toHaveProperty('ct');

    // All fields should be strings (base64-encoded)
    expect(typeof blob.salt).toBe('string');
    expect(typeof blob.iv).toBe('string');
    expect(typeof blob.ct).toBe('string');
    expect(blob.salt.length).toBeGreaterThan(0);
    expect(blob.iv.length).toBeGreaterThan(0);
    expect(blob.ct.length).toBeGreaterThan(0);
  });
});

// ── RestoreResult structure ────────────────────────────────────────

describe('RestoreResult type', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (_mode: string, _tables: any[], fn: () => Promise<void>) => {
      await fn();
    });
  });

  it('full replace returns correct structure', async () => {
    const result = await restoreFullReplace(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
    }));

    expect(result).toHaveProperty('added');
    expect(result).toHaveProperty('updated');
    expect(result).toHaveProperty('deleted');
    expect(result).toHaveProperty('tables');
    expect(typeof result.added).toBe('number');
    expect(typeof result.updated).toBe('number');
    expect(typeof result.deleted).toBe('number');
    expect(Array.isArray(result.tables)).toBe(true);
  });

  it('merge returns correct structure', async () => {
    mockGet.mockResolvedValue(undefined);
    const result = await restoreMerge(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
    }));

    expect(result).toHaveProperty('added');
    expect(result).toHaveProperty('updated');
    expect(result).toHaveProperty('deleted');
    expect(result).toHaveProperty('tables');
  });
});

// ── isQuotaError edge cases ────────────────────────────────────────

describe('quota error detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects QuotaExceededError by name', async () => {
    const err = new DOMException('Storage full', 'QuotaExceededError');
    mockTransaction.mockRejectedValueOnce(err);

    await expect(restoreFullReplace(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
    }))).rejects.toThrow('Storage quota exceeded');
  });

  it('detects quota error by string containing "QuotaExceeded" (non-DOMException)', async () => {
    // DOMException.code is read-only, so we test the String(err) fallback path
    const err = { toString: () => 'QuotaExceeded: disk quota reached' };
    mockTransaction.mockRejectedValueOnce(err);

    await expect(restoreFullReplace(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
    }))).rejects.toThrow('Storage quota exceeded');
  });

  it('detects quota error by message substring "QuotaExceeded"', async () => {
    const err = new Error('Something QuotaExceeded happened');
    mockTransaction.mockRejectedValueOnce(err);

    await expect(restoreFullReplace(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
    }))).rejects.toThrow('Storage quota exceeded');
  });

  it('detects quota error by message substring "storage quota"', async () => {
    const err = new Error('storage quota reached');
    mockTransaction.mockRejectedValueOnce(err);

    await expect(restoreFullReplace(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
    }))).rejects.toThrow('Storage quota exceeded');
  });

  it('passes through non-quota errors for merge too', async () => {
    const err = new TypeError('Cannot read property');
    mockTransaction.mockRejectedValueOnce(err);

    await expect(restoreMerge(makePayload({
      data: { notes: [makeNote('n1', 1000)] },
    }))).rejects.toThrow('Cannot read property');
  });
});
