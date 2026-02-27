/**
 * Persisted encryption metadata in localStorage.
 */

const STORAGE_KEY = 'browsernotes-encryption';

export interface EncryptionMetadata {
  version: 1;
  salt: string;               // base64, PBKDF2 salt for passphrase
  wrappedKey: string;          // base64, master key wrapped by passphrase-derived key
  recoverySalt: string;        // base64, PBKDF2 salt for recovery phrase
  recoveryWrappedKey: string;  // base64, master key wrapped by recovery-derived key
  enabledAt: number;
}

export function getEncryptionMeta(): EncryptionMetadata | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EncryptionMetadata;
  } catch {
    return null;
  }
}

export function setEncryptionMeta(meta: EncryptionMetadata): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
}

export function clearEncryptionMeta(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isEncryptionEnabled(): boolean {
  return getEncryptionMeta() !== null;
}
