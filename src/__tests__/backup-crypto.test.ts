import { describe, it, expect } from 'vitest';
import {
  encryptBackup,
  decryptBackup,
  type BackupPayload,
  type EncryptedBackupBlob,
} from '../lib/backup-crypto';

// ── Helpers ──────────────────────────────────────────────────────────

function makePayload(overrides: Partial<BackupPayload> = {}): BackupPayload {
  return {
    version: 1,
    type: 'full',
    scope: 'all',
    createdAt: Date.now(),
    data: {
      notes: [{ id: '1', title: 'Test note' }],
      tasks: [{ id: '2', title: 'Test task' }],
    },
    ...overrides,
  };
}

const PASSWORD = 'correct-horse-battery-staple';

// ── encryptBackup ────────────────────────────────────────────────────

describe('encryptBackup', () => {
  it('produces a valid EncryptedBackupBlob with version 1', async () => {
    const blob = await encryptBackup(PASSWORD, makePayload());
    expect(blob.v).toBe(1);
    expect(typeof blob.salt).toBe('string');
    expect(typeof blob.iv).toBe('string');
    expect(typeof blob.ct).toBe('string');
    expect(blob.salt.length).toBeGreaterThan(0);
    expect(blob.iv.length).toBeGreaterThan(0);
    expect(blob.ct.length).toBeGreaterThan(0);
  });

  it('produces different ciphertext for the same payload (random IV/salt)', async () => {
    const payload = makePayload();
    const blob1 = await encryptBackup(PASSWORD, payload);
    const blob2 = await encryptBackup(PASSWORD, payload);
    // Salt and IV should differ between runs
    expect(blob1.salt).not.toBe(blob2.salt);
    expect(blob1.iv).not.toBe(blob2.iv);
    expect(blob1.ct).not.toBe(blob2.ct);
  });
});

// ── decryptBackup ────────────────────────────────────────────────────

describe('decryptBackup', () => {
  it('correctly decrypts an encrypted payload', async () => {
    const payload = makePayload();
    const blob = await encryptBackup(PASSWORD, payload);
    const result = await decryptBackup(PASSWORD, blob);
    expect(result.version).toBe(payload.version);
    expect(result.type).toBe(payload.type);
    expect(result.scope).toBe(payload.scope);
    expect(result.data.notes).toEqual(payload.data.notes);
    expect(result.data.tasks).toEqual(payload.data.tasks);
  });

  it('throws on wrong password', async () => {
    const blob = await encryptBackup(PASSWORD, makePayload());
    await expect(decryptBackup('wrong-password', blob)).rejects.toThrow(
      'Wrong password or corrupted backup',
    );
  });

  it('throws on unsupported version', async () => {
    const blob = await encryptBackup(PASSWORD, makePayload());
    const tampered = { ...blob, v: 99 as 1 };
    await expect(decryptBackup(PASSWORD, tampered)).rejects.toThrow(
      'Unsupported backup format version',
    );
  });

  it('throws on corrupted ciphertext', async () => {
    const blob = await encryptBackup(PASSWORD, makePayload());
    // Corrupt the base64 ciphertext
    const tampered: EncryptedBackupBlob = {
      ...blob,
      ct: blob.ct.slice(0, -10) + 'AAAAAAAAAA',
    };
    await expect(decryptBackup(PASSWORD, tampered)).rejects.toThrow(
      'Wrong password or corrupted backup',
    );
  });
});

// ── Round-trip ───────────────────────────────────────────────────────

describe('encrypt → decrypt round-trip', () => {
  it('preserves all payload fields', async () => {
    const payload = makePayload({
      type: 'differential',
      scope: 'investigation',
      scopeId: 'inv-123',
      parentBackupId: 'parent-456',
      lastBackupAt: 1700000000000,
      data: {
        notes: [{ id: 'n1' }],
        tasks: [{ id: 't1' }],
        folders: [{ id: 'f1' }],
        tags: [{ id: 'tg1' }],
        timelineEvents: [{ id: 'e1' }],
        timelines: [{ id: 'tl1' }],
        whiteboards: [{ id: 'w1' }],
        standaloneIOCs: [{ id: 'i1' }],
        chatThreads: [{ id: 'c1' }],
      },
      deletedIds: { notes: ['del-1'], tasks: ['del-2'] },
    });
    const blob = await encryptBackup(PASSWORD, payload);
    const decrypted = await decryptBackup(PASSWORD, blob);
    expect(decrypted).toEqual(payload);
  });

  it('handles payload with empty data object', async () => {
    const payload = makePayload({ data: {} });
    const blob = await encryptBackup(PASSWORD, payload);
    const decrypted = await decryptBackup(PASSWORD, blob);
    expect(decrypted.data).toEqual({});
  });

  it('handles payload with empty arrays', async () => {
    const payload = makePayload({
      data: {
        notes: [],
        tasks: [],
        folders: [],
        tags: [],
      },
    });
    const blob = await encryptBackup(PASSWORD, payload);
    const decrypted = await decryptBackup(PASSWORD, blob);
    expect(decrypted.data.notes).toEqual([]);
    expect(decrypted.data.tasks).toEqual([]);
  });

  it('works with different passwords for different backups', async () => {
    const payload1 = makePayload({ data: { notes: [{ id: 'a' }] } });
    const payload2 = makePayload({ data: { notes: [{ id: 'b' }] } });

    const blob1 = await encryptBackup('password-one', payload1);
    const blob2 = await encryptBackup('password-two', payload2);

    const dec1 = await decryptBackup('password-one', blob1);
    const dec2 = await decryptBackup('password-two', blob2);
    expect(dec1.data.notes).toEqual([{ id: 'a' }]);
    expect(dec2.data.notes).toEqual([{ id: 'b' }]);

    // Cross-decryption should fail
    await expect(decryptBackup('password-two', blob1)).rejects.toThrow();
    await expect(decryptBackup('password-one', blob2)).rejects.toThrow();
  });
});
