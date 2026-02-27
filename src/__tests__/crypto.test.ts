import { describe, it, expect } from 'vitest';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  isEncryptedEnvelope,
  isSecureContext,
  generateMasterKey,
  deriveWrappingKey,
  wrapMasterKey,
  unwrapMasterKey,
  exportKeyRaw,
  importSessionKey,
  encryptField,
  decryptField,
  generateSalt,
  generateRecoveryPhrase,
} from '../lib/crypto';

// ── Base64 helpers ──────────────────────────────────────────────────

describe('arrayBufferToBase64 / base64ToArrayBuffer', () => {
  it('round-trips arbitrary data', () => {
    const original = new Uint8Array([0, 1, 127, 128, 255]).buffer;
    const b64 = arrayBufferToBase64(original);
    const restored = base64ToArrayBuffer(b64);
    expect(new Uint8Array(restored)).toEqual(new Uint8Array(original));
  });

  it('handles empty buffer', () => {
    const empty = new ArrayBuffer(0);
    const b64 = arrayBufferToBase64(empty);
    const restored = base64ToArrayBuffer(b64);
    expect(restored.byteLength).toBe(0);
  });

  it('produces expected base64 for known input', () => {
    const buf = new TextEncoder().encode('Hello').buffer;
    expect(arrayBufferToBase64(buf)).toBe('SGVsbG8=');
  });
});

// ── Type guard ──────────────────────────────────────────────────────

describe('isEncryptedEnvelope', () => {
  it('returns true for valid envelope', () => {
    expect(isEncryptedEnvelope({ __enc: 1, ct: 'abc', iv: 'def' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isEncryptedEnvelope(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isEncryptedEnvelope(undefined)).toBe(false);
  });

  it('returns false for plain string', () => {
    expect(isEncryptedEnvelope('hello')).toBe(false);
  });

  it('returns false for object missing __enc', () => {
    expect(isEncryptedEnvelope({ ct: 'abc', iv: 'def' })).toBe(false);
  });

  it('returns false for object with __enc !== 1', () => {
    expect(isEncryptedEnvelope({ __enc: 2, ct: 'abc', iv: 'def' })).toBe(false);
  });
});

// ── isSecureContext ─────────────────────────────────────────────────

describe('isSecureContext', () => {
  it('returns a boolean', () => {
    expect(typeof isSecureContext()).toBe('boolean');
  });
});

// ── Key generation & derivation ─────────────────────────────────────

describe('generateMasterKey', () => {
  it('returns an extractable AES-GCM CryptoKey with encrypt/decrypt', async () => {
    const key = await generateMasterKey();
    expect(key).toBeInstanceOf(CryptoKey);
    expect(key.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 });
    expect(key.extractable).toBe(true);
    expect(key.usages).toContain('encrypt');
    expect(key.usages).toContain('decrypt');
  });
});

describe('deriveWrappingKey', () => {
  const salt = crypto.getRandomValues(new Uint8Array(16)).buffer;

  it('returns an AES-KW CryptoKey with wrapKey/unwrapKey', async () => {
    const key = await deriveWrappingKey('test-passphrase', salt);
    expect(key).toBeInstanceOf(CryptoKey);
    expect(key.algorithm).toMatchObject({ name: 'AES-KW', length: 256 });
    expect(key.usages).toContain('wrapKey');
    expect(key.usages).toContain('unwrapKey');
  });

  it('different passphrases produce different wrapped outputs', async () => {
    const masterKey = await generateMasterKey();
    const wk1 = await deriveWrappingKey('passA', salt);
    const wk2 = await deriveWrappingKey('passB', salt);
    const wrapped1 = arrayBufferToBase64(await wrapMasterKey(masterKey, wk1));
    const wrapped2 = arrayBufferToBase64(await wrapMasterKey(masterKey, wk2));
    expect(wrapped1).not.toBe(wrapped2);
  });

  it('same passphrase and salt produces consistent derivation', async () => {
    const masterKey = await generateMasterKey();
    const wk1 = await deriveWrappingKey('same-pass', salt);
    const wk2 = await deriveWrappingKey('same-pass', salt);
    const wrapped1 = arrayBufferToBase64(await wrapMasterKey(masterKey, wk1));
    const wrapped2 = arrayBufferToBase64(await wrapMasterKey(masterKey, wk2));
    expect(wrapped1).toBe(wrapped2);
  });
});

// ── Key wrapping round-trip ─────────────────────────────────────────

describe('wrapMasterKey / unwrapMasterKey', () => {
  it('recovers a key that can decrypt data encrypted by the original', async () => {
    const masterKey = await generateMasterKey();
    const salt = crypto.getRandomValues(new Uint8Array(16)).buffer;
    const wrappingKey = await deriveWrappingKey('my-passphrase', salt);

    const encrypted = await encryptField('secret-data', masterKey);
    const wrapped = await wrapMasterKey(masterKey, wrappingKey);
    const recovered = await unwrapMasterKey(wrapped, wrappingKey);

    expect(await decryptField(encrypted, recovered)).toBe('secret-data');
  });

  it('unwrap with wrong wrapping key throws', async () => {
    const masterKey = await generateMasterKey();
    const salt = crypto.getRandomValues(new Uint8Array(16)).buffer;
    const correctKey = await deriveWrappingKey('correct', salt);
    const wrongKey = await deriveWrappingKey('wrong', salt);

    const wrapped = await wrapMasterKey(masterKey, correctKey);
    await expect(unwrapMasterKey(wrapped, wrongKey)).rejects.toThrow();
  });
});

// ── Key export / import round-trip ──────────────────────────────────

describe('exportKeyRaw / importSessionKey', () => {
  it('produces a key that decrypts data encrypted by the original', async () => {
    const masterKey = await generateMasterKey();
    const encrypted = await encryptField('session-test', masterKey);

    const raw = await exportKeyRaw(masterKey);
    const sessionKey = await importSessionKey(raw);

    expect(await decryptField(encrypted, sessionKey)).toBe('session-test');
  });

  it('exported raw key is 32 bytes (256 bits)', async () => {
    const key = await generateMasterKey();
    const raw = await exportKeyRaw(key);
    expect(raw.byteLength).toBe(32);
  });
});

// ── Field encryption round-trip ─────────────────────────────────────

describe('encryptField / decryptField', () => {
  let key: CryptoKey;

  // Use a shared key across tests in this block for efficiency
  // (generateMasterKey is tested above)
  const getKey = async () => {
    if (!key) key = await generateMasterKey();
    return key;
  };

  it('string value round-trips', async () => {
    const k = await getKey();
    const encrypted = await encryptField('hello world', k);
    expect(isEncryptedEnvelope(encrypted)).toBe(true);
    expect(await decryptField(encrypted, k)).toBe('hello world');
  });

  it('object value round-trips (json flag)', async () => {
    const k = await getKey();
    const obj = { a: 1, b: [2, 3] };
    const encrypted = await encryptField(obj, k);
    expect((encrypted as { json?: true }).json).toBe(true);
    expect(await decryptField(encrypted, k)).toEqual(obj);
  });

  it('array value round-trips', async () => {
    const k = await getKey();
    const arr = [1, 'two', { three: 3 }];
    const encrypted = await encryptField(arr, k);
    expect(await decryptField(encrypted, k)).toEqual(arr);
  });

  it('number value round-trips', async () => {
    const k = await getKey();
    const encrypted = await encryptField(42, k);
    expect(await decryptField(encrypted, k)).toBe(42);
  });

  it('boolean value round-trips', async () => {
    const k = await getKey();
    const encrypted = await encryptField(true, k);
    expect(await decryptField(encrypted, k)).toBe(true);
  });

  it('null passes through unchanged', async () => {
    const k = await getKey();
    expect(await encryptField(null, k)).toBeNull();
    expect(await decryptField(null, k)).toBeNull();
  });

  it('undefined passes through unchanged', async () => {
    const k = await getKey();
    expect(await encryptField(undefined, k)).toBeUndefined();
    expect(await decryptField(undefined, k)).toBeUndefined();
  });

  it('already-encrypted envelope is not double-encrypted', async () => {
    const k = await getKey();
    const encrypted = await encryptField('test', k);
    const doubleEncrypted = await encryptField(encrypted, k);
    // Should be the same envelope object (idempotent)
    expect(doubleEncrypted).toBe(encrypted);
  });

  it('plaintext value passes through decryptField unchanged', async () => {
    const k = await getKey();
    expect(await decryptField('just a string', k)).toBe('just a string');
    expect(await decryptField(123, k)).toBe(123);
  });

  it('wrong key fails to decrypt', async () => {
    const k = await getKey();
    const otherKey = await generateMasterKey();
    const encrypted = await encryptField('secret', k);
    await expect(decryptField(encrypted, otherKey)).rejects.toThrow();
  });

  it('two encryptions of same plaintext produce different ciphertexts', async () => {
    const k = await getKey();
    const enc1 = (await encryptField('same', k)) as { ct: string };
    const enc2 = (await encryptField('same', k)) as { ct: string };
    expect(enc1.ct).not.toBe(enc2.ct);
  });
});

// ── Salt & recovery phrase ──────────────────────────────────────────

describe('generateSalt', () => {
  it('returns a non-empty base64 string', () => {
    const salt = generateSalt();
    expect(typeof salt).toBe('string');
    expect(salt.length).toBeGreaterThan(0);
    // Verify it's valid base64 by round-tripping
    expect(() => base64ToArrayBuffer(salt)).not.toThrow();
  });

  it('two calls produce different salts', () => {
    expect(generateSalt()).not.toBe(generateSalt());
  });
});

describe('generateRecoveryPhrase', () => {
  it('returns 24 space-separated words', () => {
    const phrase = generateRecoveryPhrase();
    const words = phrase.split(' ');
    expect(words).toHaveLength(24);
    words.forEach((w) => expect(w.length).toBeGreaterThan(0));
  });

  it('two calls produce different phrases', () => {
    expect(generateRecoveryPhrase()).not.toBe(generateRecoveryPhrase());
  });
});

// ── Full flow integration ───────────────────────────────────────────

describe('full encryption flow', () => {
  it('generate → derive → wrap → unwrap → encrypt → decrypt', async () => {
    // 1. Generate a master key
    const masterKey = await generateMasterKey();

    // 2. Derive a wrapping key from passphrase + salt
    const salt = base64ToArrayBuffer(generateSalt());
    const wrappingKey = await deriveWrappingKey('my-secure-passphrase', salt);

    // 3. Wrap the master key for storage
    const wrappedBlob = await wrapMasterKey(masterKey, wrappingKey);

    // 4. Unwrap (simulating a new session)
    const unwrapped = await unwrapMasterKey(wrappedBlob, wrappingKey);

    // 5. Encrypt a field with the original key
    const sensitive = { username: 'admin', role: 'threat-analyst' };
    const encrypted = await encryptField(sensitive, masterKey);
    expect(isEncryptedEnvelope(encrypted)).toBe(true);

    // 6. Decrypt with the unwrapped key
    const decrypted = await decryptField(encrypted, unwrapped);
    expect(decrypted).toEqual(sensitive);
  });
});
