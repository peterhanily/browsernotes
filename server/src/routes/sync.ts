import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { processPush, pullChanges, getSnapshot } from '../services/sync-service.js';
import { logActivity } from '../services/audit-service.js';
import { broadcastToFolder } from '../ws/handler.js';
import type { AuthUser, SyncChange } from '../types.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.use('*', requireAuth);

// POST /api/sync/push
app.post('/push', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const changes: SyncChange[] = body.changes || [];

  if (changes.length === 0) {
    return c.json({ results: [] });
  }

  const results = await processPush(changes, user.id);

  // Broadcast accepted changes via WebSocket
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const result = results[i];
    if (result.status === 'accepted') {
      const folderId = (change.data?.folderId as string) || undefined;
      if (folderId) {
        broadcastToFolder(folderId, {
          type: 'entity-change',
          table: change.table,
          op: change.op,
          entityId: change.entityId,
          data: change.data,
          updatedBy: user.id,
        }, user.id);
      }

      // Log activity
      await logActivity({
        userId: user.id,
        category: change.table === 'timelineEvents' ? 'timeline' :
                  change.table === 'standaloneIOCs' ? 'ioc' :
                  change.table === 'chatThreads' ? 'chat' :
                  change.table as string,
        action: change.op === 'delete' ? 'delete' : 'update',
        detail: `Synced ${change.op} on ${change.table}`,
        itemId: change.entityId,
        itemTitle: (change.data?.title as string) || (change.data?.name as string),
        folderId,
      });
    }
  }

  return c.json({ results });
});

// GET /api/sync/pull
app.get('/pull', async (c) => {
  const since = c.req.query('since');
  if (!since) {
    return c.json({ error: 'Missing since parameter' }, 400);
  }
  const folderId = c.req.query('folderId');
  const result = await pullChanges(since, folderId || undefined);
  return c.json(result);
});

// GET /api/sync/snapshot/:folderId
app.get('/snapshot/:folderId', async (c) => {
  const folderId = c.req.param('folderId');
  const snapshot = await getSnapshot(folderId);
  return c.json(snapshot);
});

export default app;
