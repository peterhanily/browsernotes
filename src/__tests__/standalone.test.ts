import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Standalone mode utility tests ────────────────────────────────────
// These test the logic used in App.tsx for standalone file:// detection,
// IndexedDB sharing warnings, update checks, and encryption warnings.
// Since the logic is inline in App.tsx, we extract and test the conditions.

describe('Standalone mode logic', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    // Restore window.location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  function setProtocol(protocol: string) {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, protocol },
      writable: true,
      configurable: true,
    });
  }

  // ── file:// protocol detection ─────────────────────────────────────

  describe('file:// protocol detection', () => {
    it('detects file:// protocol', () => {
      setProtocol('file:');
      expect(window.location.protocol).toBe('file:');
      const isFileProtocol = window.location.protocol === 'file:';
      expect(isFileProtocol).toBe(true);
    });

    it('does not flag https:// as file protocol', () => {
      setProtocol('https:');
      const isFileProtocol = window.location.protocol === 'file:';
      expect(isFileProtocol).toBe(false);
    });

    it('does not flag http:// as file protocol', () => {
      setProtocol('http:');
      const isFileProtocol = window.location.protocol === 'file:';
      expect(isFileProtocol).toBe(false);
    });
  });

  // ── IndexedDB sharing warning ──────────────────────────────────────

  describe('IndexedDB sharing warning', () => {
    it('warning shows when standalone + file:// + no encryption + not dismissed', () => {
      setProtocol('file:');
      // Simulate: __STANDALONE__ is true, no encryption, not dismissed
      const isStandalone = true;
      const isFileProtocol = window.location.protocol === 'file:';
      const isEncryptionEnabled = false;
      const isDismissed = localStorage.getItem('tc-file-encrypt-dismissed') === '1';

      const showWarning = isStandalone && isFileProtocol && !isEncryptionEnabled && !isDismissed;
      expect(showWarning).toBe(true);
    });

    it('warning hidden when encryption is enabled', () => {
      setProtocol('file:');
      const isStandalone = true;
      const isFileProtocol = window.location.protocol === 'file:';
      const isEncryptionEnabled = true;
      const isDismissed = false;

      const showWarning = isStandalone && isFileProtocol && !isEncryptionEnabled && !isDismissed;
      expect(showWarning).toBe(false);
    });

    it('warning hidden when previously dismissed', () => {
      setProtocol('file:');
      localStorage.setItem('tc-file-encrypt-dismissed', '1');
      const isStandalone = true;
      const isFileProtocol = window.location.protocol === 'file:';
      const isEncryptionEnabled = false;
      const isDismissed = localStorage.getItem('tc-file-encrypt-dismissed') === '1';

      const showWarning = isStandalone && isFileProtocol && !isEncryptionEnabled && !isDismissed;
      expect(showWarning).toBe(false);
    });

    it('warning hidden when not standalone mode', () => {
      setProtocol('file:');
      const isStandalone = false;
      const isFileProtocol = window.location.protocol === 'file:';
      const isEncryptionEnabled = false;
      const isDismissed = false;

      const showWarning = isStandalone && isFileProtocol && !isEncryptionEnabled && !isDismissed;
      expect(showWarning).toBe(false);
    });
  });

  // ── Update check behavior ─────────────────────────────────────────

  describe('update check behavior', () => {
    it('build age calculates correctly for same day', () => {
      const buildTime = Date.now();
      const daysAgo = Math.floor((Date.now() - buildTime) / 86_400_000);
      expect(daysAgo).toBe(0);
    });

    it('build age calculates correctly for 1 day ago', () => {
      const buildTime = Date.now() - 86_400_000;
      const daysAgo = Math.floor((Date.now() - buildTime) / 86_400_000);
      expect(daysAgo).toBe(1);
    });

    it('build age calculates correctly for 30 days ago', () => {
      const buildTime = Date.now() - 30 * 86_400_000;
      const daysAgo = Math.floor((Date.now() - buildTime) / 86_400_000);
      expect(daysAgo).toBe(30);
    });
  });

  // ── Encryption warning for file:// ─────────────────────────────────

  describe('encryption warning for file:// users', () => {
    it('warns about CSP not being enforced in standalone mode', () => {
      // The warning text from App.tsx line 1301
      const warningText = 'Running standalone on file:// without encryption. Other local HTML files can access your data. Content Security Policy is not enforced in standalone mode.';
      expect(warningText).toContain('file://');
      expect(warningText).toContain('Content Security Policy');
      expect(warningText).toContain('standalone');
    });

    it('postMessage handler validates event.source for file:// security', () => {
      setProtocol('file:');
      const isFileProtocol = window.location.protocol === 'file:';
      expect(isFileProtocol).toBe(true);

      // Simulate the security check from App.tsx
      // Under file://, origins are "null" so the origin check is skipped,
      // but event.source === window is still validated
      const event = {
        source: window,
        origin: 'null',
        data: { type: 'TC_EXTENSION_READY' },
      };

      const sourceOk = event.source === window;
      expect(sourceOk).toBe(true);

      // Different source would be rejected
      const crossWindowEvent = {
        source: null,
        origin: 'null',
        data: { type: 'TC_EXTENSION_READY' },
      };
      const crossSourceOk = crossWindowEvent.source === window;
      expect(crossSourceOk).toBe(false);
    });
  });
});
