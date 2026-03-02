import { Hono } from 'hono';
import { eq, and, gt, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { activityLog, users } from '../db/schema.js';
import type { AuthUser } from '../types.js';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.use('*', requireAuth);

// GET /api/audit
app.get('/', async (c) => {
  const folderId = c.req.query('folderId');
  const userId = c.req.query('userId');
  const since = c.req.query('since');
  const category = c.req.query('category');
  const limit = parseInt(c.req.query('limit') || '100', 10);

  const conditions = [];
  if (folderId) conditions.push(eq(activityLog.folderId, folderId));
  if (userId) conditions.push(eq(activityLog.userId, userId));
  if (since) conditions.push(gt(activityLog.timestamp, new Date(since)));
  if (category) conditions.push(eq(activityLog.category, category));

  const result = await db
    .select({
      id: activityLog.id,
      userId: activityLog.userId,
      category: activityLog.category,
      action: activityLog.action,
      detail: activityLog.detail,
      itemId: activityLog.itemId,
      itemTitle: activityLog.itemTitle,
      folderId: activityLog.folderId,
      timestamp: activityLog.timestamp,
      userDisplayName: users.displayName,
      userAvatarUrl: users.avatarUrl,
    })
    .from(activityLog)
    .innerJoin(users, eq(users.id, activityLog.userId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(activityLog.timestamp))
    .limit(limit);

  return c.json(result);
});

export default app;
