import { Hono } from 'hono';
import { eq, count } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { users, folders } from '../db/schema.js';
import { verifyAdminSecret } from '../services/admin-secret.js';
import { signAdminToken, requireAdminAuth } from '../middleware/admin-auth.js';
import { ADMIN_HTML } from './admin-html.js';

const app = new Hono();

// GET /admin — serve HTML admin panel
app.get('/', (c) => {
  return c.html(ADMIN_HTML);
});

// POST /admin/api/login
app.post('/api/login', async (c) => {
  const body = await c.req.json();
  const secret = body?.secret;
  if (!secret || typeof secret !== 'string') {
    return c.json({ error: 'Missing secret' }, 400);
  }

  const valid = await verifyAdminSecret(secret);
  if (!valid) {
    return c.json({ error: 'Invalid admin secret' }, 401);
  }

  const token = await signAdminToken();
  return c.json({ token });
});

// GET /admin/api/users
app.get('/api/users', requireAdminAuth, async (c) => {
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    role: users.role,
    active: users.active,
    lastLoginAt: users.lastLoginAt,
    createdAt: users.createdAt,
  }).from(users).orderBy(users.createdAt);

  return c.json({ users: allUsers });
});

// PATCH /admin/api/users/:id
app.patch('/api/users/:id', requireAdminAuth, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body.role !== undefined) {
    const validRoles = ['admin', 'analyst', 'viewer'];
    if (!validRoles.includes(body.role)) {
      return c.json({ error: 'Invalid role' }, 400);
    }
    updates.role = body.role;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') {
      return c.json({ error: 'Invalid active value' }, 400);
    }
    updates.active = body.active;
  }

  const result = await db.update(users).set(updates).where(eq(users.id, id)).returning({ id: users.id });
  if (result.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ ok: true });
});

// POST /admin/api/users/:id/reset-password
app.post('/api/users/:id/reset-password', requireAdminAuth, async (c) => {
  const id = c.req.param('id');

  const user = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (user.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }

  const temporaryPassword = nanoid(16);
  const hash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });
  await db.update(users).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(users.id, id));

  return c.json({ temporaryPassword });
});

// GET /admin/api/stats
app.get('/api/stats', requireAdminAuth, async (c) => {
  const [totalResult] = await db.select({ count: count() }).from(users);
  const [activeResult] = await db.select({ count: count() }).from(users).where(eq(users.active, true));
  const [invResult] = await db.select({ count: count() }).from(folders);

  return c.json({
    totalUsers: totalResult.count,
    activeUsers: activeResult.count,
    investigations: invResult.count,
  });
});

export default app;
