import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { logger } from '../lib/logger.js';

/**
 * Encrypts/decrypts bot API keys and secrets at rest.
 * Uses AES-256-GCM with a server master key derived via scrypt.
 *
 * Master key source: BOT_MASTER_KEY env var, or falls back to JWT_PRIVATE_KEY.
 * In production, set BOT_MASTER_KEY to a dedicated 32+ char secret.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT = Buffer.from('threatcaddy-bot-secrets-v1');

let derivedKey: Buffer | null = null;

function getDerivedKey(): Buffer {
  if (derivedKey) return derivedKey;
  const masterKey = process.env.BOT_MASTER_KEY || process.env.JWT_PRIVATE_KEY;
  if (!masterKey) {
    throw new Error('No BOT_MASTER_KEY or JWT_PRIVATE_KEY configured — cannot encrypt bot secrets');
  }
  derivedKey = scryptSync(masterKey, SALT, 32);
  return derivedKey;
}

/** Encrypt a plaintext secret. Returns 'enc:' prefixed base64 string. */
export function encryptSecret(plaintext: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: enc:<iv>:<authTag>:<ciphertext> (all base64)
  return `enc:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/** Decrypt an 'enc:' prefixed secret. Returns plaintext. */
export function decryptSecret(encrypted: string): string {
  if (!encrypted.startsWith('enc:')) {
    // Not encrypted — return as-is (for backwards compat during migration)
    return encrypted;
  }

  const parts = encrypted.slice(4).split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted secret');
  }

  const key = getDerivedKey();
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = Buffer.from(parts[2], 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Process a bot config object, encrypting any plaintext secret fields.
 * Convention: keys ending in 'Key', 'Secret', 'Token', or 'Password' are secrets.
 */
export function encryptConfigSecrets(config: Record<string, unknown>): Record<string, unknown> {
  const result = { ...config };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' && isSecretField(key) && !value.startsWith('enc:')) {
      result[key] = encryptSecret(value);
    }
  }
  return result;
}

/**
 * Process a bot config object, decrypting any encrypted secret fields.
 * Only call this in the bot runtime — never expose decrypted config via API.
 */
export function decryptConfigSecrets(config: Record<string, unknown>): Record<string, unknown> {
  const result = { ...config };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' && value.startsWith('enc:')) {
      try {
        result[key] = decryptSecret(value);
      } catch (err) {
        logger.error('Failed to decrypt bot secret', { key, error: String(err) });
        result[key] = '';  // Don't crash — let the bot handle missing keys
      }
    }
  }
  return result;
}

/**
 * Redact secret fields for API responses.
 * Returns config with secret values replaced by '***configured***' or '***not set***'.
 */
export function redactConfigSecrets(config: Record<string, unknown>): Record<string, unknown> {
  const result = { ...config };
  for (const [key, value] of Object.entries(result)) {
    if (isSecretField(key)) {
      result[key] = typeof value === 'string' && value.length > 0 ? '***configured***' : '***not set***';
    }
  }
  return result;
}

function isSecretField(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.endsWith('key') || lower.endsWith('secret') || lower.endsWith('token') || lower.endsWith('password');
}
