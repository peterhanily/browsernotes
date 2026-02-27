/**
 * Core encryption operations using Web Crypto API.
 * AES-256-GCM for field encryption, PBKDF2 for key derivation, AES-KW for key wrapping.
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12; // 96-bit nonce for AES-GCM

export interface EncryptedEnvelope {
  __enc: 1;
  ct: string;  // base64 ciphertext
  iv: string;  // base64 IV
  json?: true; // present when original value was non-string (object/array/number/boolean)
}

export function isEncryptedEnvelope(v: unknown): v is EncryptedEnvelope {
  return (
    typeof v === 'object' &&
    v !== null &&
    '__enc' in v &&
    (v as EncryptedEnvelope).__enc === 1
  );
}

// ── Base64 helpers ───────────────────────────────────────────────────

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

// ── Key generation & derivation ──────────────────────────────────────

export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable — needed for wrapKey
    ['encrypt', 'decrypt'],
  );
}

export async function deriveWrappingKey(
  passphrase: string,
  salt: ArrayBuffer,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

// ── Key wrapping ─────────────────────────────────────────────────────

export async function wrapMasterKey(
  masterKey: CryptoKey,
  wrappingKey: CryptoKey,
): Promise<ArrayBuffer> {
  return crypto.subtle.wrapKey('raw', masterKey, wrappingKey, 'AES-KW');
}

export async function unwrapMasterKey(
  wrappedKey: ArrayBuffer,
  wrappingKey: CryptoKey,
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    wrappedKey,
    wrappingKey,
    'AES-KW',
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable in session
    ['encrypt', 'decrypt'],
  );
}

// ── Session key export / import (for caching) ───────────────────────

export async function exportKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key);
}

export async function importSessionKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable in session
    ['encrypt', 'decrypt'],
  );
}

// ── Field-level encrypt / decrypt ────────────────────────────────────

export async function encryptField(
  value: unknown,
  key: CryptoKey,
): Promise<unknown> {
  if (value === null || value === undefined) return value;
  if (isEncryptedEnvelope(value)) return value; // idempotent

  const ivBuf = new ArrayBuffer(IV_BYTES);
  crypto.getRandomValues(new Uint8Array(ivBuf));
  const isJson = typeof value !== 'string';
  const plaintext = isJson ? JSON.stringify(value) : (value as string);

  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBuf },
    key,
    new TextEncoder().encode(plaintext),
  );

  const envelope: EncryptedEnvelope = {
    __enc: 1,
    ct: arrayBufferToBase64(ct),
    iv: arrayBufferToBase64(ivBuf),
  };
  if (isJson) envelope.json = true;
  return envelope;
}

export async function decryptField(
  value: unknown,
  key: CryptoKey,
): Promise<unknown> {
  if (value === null || value === undefined) return value;
  if (!isEncryptedEnvelope(value)) return value; // plaintext passthrough

  const ctBuf = base64ToArrayBuffer(value.ct);
  const ivBuf = base64ToArrayBuffer(value.iv);

  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuf },
    key,
    ctBuf,
  );

  const plaintext = new TextDecoder().decode(plainBuf);
  return value.json ? JSON.parse(plaintext) : plaintext;
}

// ── Salt & recovery phrase ───────────────────────────────────────────

export function generateSalt(): string {
  const buf = new ArrayBuffer(SALT_BYTES);
  crypto.getRandomValues(new Uint8Array(buf));
  return arrayBufferToBase64(buf);
}

export function generateRecoveryPhrase(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => WORDLIST[b & 0xff])
    .join(' ');
}

// ── BIP39-style wordlist (256 words → 8 bits per word, 24 words → 192 bits) ─

const WORDLIST: string[] = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acquire', 'across', 'action', 'actor', 'actual', 'adapt', 'address', 'adjust',
  'admit', 'adult', 'advance', 'advice', 'afraid', 'again', 'agent', 'agree',
  'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alert',
  'alien', 'almost', 'alone', 'alpha', 'already', 'alter', 'always', 'amateur',
  'anchor', 'ancient', 'anger', 'angle', 'animal', 'ankle', 'announce', 'annual',
  'antique', 'anxiety', 'apart', 'apology', 'appear', 'apple', 'approve', 'arctic',
  'arena', 'argue', 'armor', 'army', 'arrange', 'arrest', 'arrive', 'arrow',
  'artist', 'assume', 'attack', 'attend', 'attract', 'auction', 'audit', 'august',
  'autumn', 'average', 'avocado', 'avoid', 'awake', 'aware', 'awesome', 'awful',
  'balance', 'banana', 'banner', 'barely', 'bargain', 'barrel', 'basket', 'battle',
  'beauty', 'become', 'before', 'begin', 'behave', 'believe', 'bench', 'benefit',
  'betray', 'better', 'between', 'beyond', 'bicycle', 'blanket', 'blast', 'bleak',
  'bless', 'blind', 'blood', 'blossom', 'blur', 'board', 'bomb', 'bonus',
  'border', 'bounce', 'bracket', 'brain', 'brave', 'bread', 'breeze', 'bridge',
  'bright', 'bring', 'broken', 'brother', 'brush', 'bubble', 'budget', 'buffalo',
  'burden', 'burger', 'burst', 'butter', 'cabin', 'cactus', 'camera', 'cancel',
  'candle', 'cannon', 'canyon', 'capable', 'capital', 'captain', 'carbon', 'carpet',
  'carry', 'casino', 'casual', 'catalog', 'catch', 'cattle', 'cause', 'caution',
  'cave', 'ceiling', 'celery', 'cement', 'census', 'cereal', 'certain', 'chair',
  'chalk', 'champion', 'change', 'chapter', 'charge', 'chart', 'chase', 'cheap',
  'cherry', 'chicken', 'chief', 'chimney', 'choice', 'chunk', 'churn', 'circle',
  'citizen', 'civil', 'claim', 'clap', 'clarify', 'classic', 'clean', 'clever',
  'cliff', 'climb', 'clinic', 'clip', 'clock', 'close', 'cloth', 'cloud',
  'cluster', 'coach', 'coconut', 'coffee', 'collect', 'column', 'combine', 'comfort',
  'comic', 'common', 'company', 'concert', 'conduct', 'confirm', 'connect', 'consider',
  'control', 'convert', 'copper', 'coral', 'correct', 'couch', 'country', 'couple',
  'course', 'cousin', 'cover', 'craft', 'cradle', 'crane', 'crash', 'crater',
  'credit', 'cricket', 'crisis', 'cross', 'crouch', 'crowd', 'cruel', 'cruise',
  'crystal', 'current', 'curtain', 'curve', 'cushion', 'custom', 'cycle', 'damage',
  'dance', 'danger', 'daring', 'dawn', 'debate', 'decade', 'decline', 'defend',
];
