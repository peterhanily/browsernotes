import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── vi.hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockVerifyAccessToken,
  mockCheckInvestigationAccess,
  mockGetPresence,
  mockUpdatePresence,
  mockRemovePresence,
  mockRemoveUserFromAllFolders,
  mockLogger,
} = vi.hoisted(() => ({
  mockVerifyAccessToken: vi.fn(),
  mockCheckInvestigationAccess: vi.fn(),
  mockGetPresence: vi.fn().mockReturnValue([]),
  mockUpdatePresence: vi.fn(),
  mockRemovePresence: vi.fn(),
  mockRemoveUserFromAllFolders: vi.fn(),
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../middleware/auth.js', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}));

vi.mock('../middleware/access.js', () => ({
  checkInvestigationAccess: mockCheckInvestigationAccess,
}));

vi.mock('../ws/presence.js', () => ({
  getPresence: mockGetPresence,
  updatePresence: mockUpdatePresence,
  removePresence: mockRemovePresence,
  removeUserFromAllFolders: mockRemoveUserFromAllFolders,
}));

vi.mock('../lib/logger.js', () => ({
  logger: mockLogger,
}));

import {
  handleWSConnection,
  handleWSMessage,
  handleWSClose,
} from '../ws/handler.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createMockWS() {
  return {
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1,
  } as unknown as import('hono/ws').WSContext;
}

const TEST_USER = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'analyst',
  displayName: 'Test User',
  avatarUrl: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WebSocket Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth timeout enforcement (5s)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('closes connection after 5s if no auth message received', () => {
      const ws = createMockWS();
      handleWSConnection(ws);
      vi.advanceTimersByTime(5001);
      expect(ws.close).toHaveBeenCalledWith(4001, 'Authentication timeout');
    });

    it('does not close connection if auth arrives within 5s', async () => {
      const ws = createMockWS();
      mockVerifyAccessToken.mockResolvedValue(TEST_USER);
      handleWSConnection(ws);
      await handleWSMessage(ws, JSON.stringify({ type: 'auth', token: 'valid-token' }));
      vi.advanceTimersByTime(6000);
      expect(ws.close).not.toHaveBeenCalledWith(4001, 'Authentication timeout');
      handleWSClose(ws);
    });

    it('closes connection if first message is not auth', async () => {
      const ws = createMockWS();
      handleWSConnection(ws);
      await handleWSMessage(ws, JSON.stringify({ type: 'subscribe', folderId: 'f1' }));
      expect(ws.close).toHaveBeenCalledWith(4001, 'First message must be auth');
    });
  });

  describe('Per-user connection limits', () => {
    it('rejects connection when user exceeds MAX_CONNECTIONS_PER_USER (10)', async () => {
      mockVerifyAccessToken.mockResolvedValue(TEST_USER);

      const connections: import('hono/ws').WSContext[] = [];
      for (let i = 0; i < 10; i++) {
        const ws = createMockWS();
        handleWSConnection(ws);
        await handleWSMessage(ws, JSON.stringify({ type: 'auth', token: 'token' }));
        connections.push(ws);
      }

      const ws11 = createMockWS();
      handleWSConnection(ws11);
      await handleWSMessage(ws11, JSON.stringify({ type: 'auth', token: 'token' }));
      expect(ws11.close).toHaveBeenCalledWith(4003, 'Too many connections');

      for (const ws of connections) {
        handleWSClose(ws);
      }
    });
  });

  describe('Message rate limiting', () => {
    it('allows messages under the per-connection rate limit', async () => {
      const ws = createMockWS();
      mockVerifyAccessToken.mockResolvedValue(TEST_USER);
      handleWSConnection(ws);
      await handleWSMessage(ws, JSON.stringify({ type: 'auth', token: 'token' }));

      for (let i = 0; i < 5; i++) {
        await handleWSMessage(ws, JSON.stringify({ type: 'pong' }));
      }

      const sendCalls = (ws.send as ReturnType<typeof vi.fn>).mock.calls;
      const errorMsgs = sendCalls.filter(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('RATE_LIMIT'),
      );
      expect(errorMsgs.length).toBe(0);
      handleWSClose(ws);
    });

    it('blocks messages over the per-connection rate limit (30/s)', async () => {
      const ws = createMockWS();
      mockVerifyAccessToken.mockResolvedValue(TEST_USER);
      handleWSConnection(ws);
      await handleWSMessage(ws, JSON.stringify({ type: 'auth', token: 'token' }));

      for (let i = 0; i < 35; i++) {
        await handleWSMessage(ws, JSON.stringify({ type: 'pong' }));
      }

      const sendCalls = (ws.send as ReturnType<typeof vi.fn>).mock.calls;
      const errorMsgs = sendCalls.filter(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('RATE_LIMIT'),
      );
      expect(errorMsgs.length).toBeGreaterThan(0);
      handleWSClose(ws);
    });
  });

  describe('Folder subscription ACL checks', () => {
    it('allows subscribing to a folder the user has access to', async () => {
      const ws = createMockWS();
      mockVerifyAccessToken.mockResolvedValue(TEST_USER);
      mockCheckInvestigationAccess.mockResolvedValue(true);

      handleWSConnection(ws);
      await handleWSMessage(ws, JSON.stringify({ type: 'auth', token: 'token' }));
      await handleWSMessage(ws, JSON.stringify({ type: 'subscribe', folderId: 'folder-1' }));

      expect(mockCheckInvestigationAccess).toHaveBeenCalledWith('user-1', 'folder-1', 'viewer');
      const sendCalls = (ws.send as ReturnType<typeof vi.fn>).mock.calls;
      const presenceMsgs = sendCalls.filter(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('"presence"'),
      );
      expect(presenceMsgs.length).toBeGreaterThan(0);
      handleWSClose(ws);
    });

    it('rejects subscribing to a folder the user has no access to', async () => {
      const ws = createMockWS();
      mockVerifyAccessToken.mockResolvedValue(TEST_USER);
      mockCheckInvestigationAccess.mockResolvedValue(false);

      handleWSConnection(ws);
      await handleWSMessage(ws, JSON.stringify({ type: 'auth', token: 'token' }));
      await handleWSMessage(ws, JSON.stringify({ type: 'subscribe', folderId: 'secret-folder' }));

      const sendCalls = (ws.send as ReturnType<typeof vi.fn>).mock.calls;
      const errorMsgs = sendCalls.filter(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('No access'),
      );
      expect(errorMsgs.length).toBe(1);
      handleWSClose(ws);
    });
  });

  describe('Entity-change broadcast to correct folders', () => {
    it('relays entity-change-preview to folder subscribers', async () => {
      mockVerifyAccessToken.mockResolvedValue(TEST_USER);
      mockCheckInvestigationAccess.mockResolvedValue(true);

      const wsSender = createMockWS();
      handleWSConnection(wsSender);
      await handleWSMessage(wsSender, JSON.stringify({ type: 'auth', token: 'token' }));
      await handleWSMessage(wsSender, JSON.stringify({ type: 'subscribe', folderId: 'folder-1' }));

      const user2 = { ...TEST_USER, id: 'user-2' };
      mockVerifyAccessToken.mockResolvedValue(user2);
      const wsReceiver = createMockWS();
      handleWSConnection(wsReceiver);
      await handleWSMessage(wsReceiver, JSON.stringify({ type: 'auth', token: 'token2' }));
      await handleWSMessage(wsReceiver, JSON.stringify({ type: 'subscribe', folderId: 'folder-1' }));

      mockVerifyAccessToken.mockResolvedValue(TEST_USER);
      await handleWSMessage(wsSender, JSON.stringify({
        type: 'entity-change-preview',
        table: 'notes',
        entityId: 'note-1',
        op: 'put',
        data: { folderId: 'folder-1', title: 'Test' },
      }));

      const receiverCalls = (wsReceiver.send as ReturnType<typeof vi.fn>).mock.calls;
      const entityChanges = receiverCalls.filter(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('entity-change'),
      );
      expect(entityChanges.length).toBeGreaterThan(0);

      handleWSClose(wsSender);
      handleWSClose(wsReceiver);
    });
  });

  describe('Invalid message handling', () => {
    it('handles invalid JSON gracefully', async () => {
      const ws = createMockWS();
      mockVerifyAccessToken.mockResolvedValue(TEST_USER);
      handleWSConnection(ws);
      await handleWSMessage(ws, JSON.stringify({ type: 'auth', token: 'token' }));
      await handleWSMessage(ws, 'not-valid-json{{{');
      expect(mockLogger.error).toHaveBeenCalled();
      handleWSClose(ws);
    });

    it('ignores oversized messages (>64KB)', async () => {
      const ws = createMockWS();
      mockVerifyAccessToken.mockResolvedValue(TEST_USER);
      handleWSConnection(ws);
      await handleWSMessage(ws, JSON.stringify({ type: 'auth', token: 'token' }));
      const oversized = 'x'.repeat(65 * 1024);
      await handleWSMessage(ws, oversized);
      // Should silently drop — no crash
      handleWSClose(ws);
    });

    it('handles unknown message types without error', async () => {
      const ws = createMockWS();
      mockVerifyAccessToken.mockResolvedValue(TEST_USER);
      handleWSConnection(ws);
      await handleWSMessage(ws, JSON.stringify({ type: 'auth', token: 'token' }));
      await handleWSMessage(ws, JSON.stringify({ type: 'unknown-type-xyz' }));
      // Should not throw or crash
      handleWSClose(ws);
    });
  });
});
