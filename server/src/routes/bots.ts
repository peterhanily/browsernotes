import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { eq, desc } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { timingSafeEqual } from 'node:crypto';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { logActivity } from '../services/audit-service.js';
import { botManager, validateCronExpression } from '../bots/bot-manager.js';
import { encryptConfigSecrets, redactConfigSecrets, decryptConfigSecrets } from '../bots/secret-store.js';
import type { BotCapability, BotTriggerConfig, BotType } from '../bots/types.js';

const VALID_BOT_TYPES: BotType[] = ['enrichment', 'feed', 'monitor', 'triage', 'report', 'correlation', 'ai-agent', 'custom'];

const VALID_CAPABILITIES: BotCapability[] = [
  'read_entities', 'create_entities', 'update_entities', 'delete_entities',
  'link_entities', 'post_to_feed', 'notify_users', 'call_external_apis',
  'use_llm', 'manage_investigations', 'cross_investigation',
];

const app = new Hono();

// All bot admin routes require auth, except webhook endpoint (uses its own secret)
app.use('*', async (c, next) => {
  // Webhook endpoint uses its own auth (webhook secret), not JWT
  if (c.req.path.match(/\/[^/]+\/webhook$/) && c.req.method === 'POST') {
    return next();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (requireAuth as any)(c, next);
});

// ─── List all bot configs ───────────────────────────────────────

app.get('/', requireRole('admin', 'analyst'), async (c) => {
  const rows = await db.select().from(schema.botConfigs).orderBy(desc(schema.botConfigs.createdAt));

  // Redact secrets in config
  const bots = rows.map((row) => ({
    ...row,
    config: redactConfigSecrets(row.config as Record<string, unknown>),
  }));

  return c.json({ bots });
});

// ─── Get a single bot config ────────────────────────────────────

app.get('/:id', requireRole('admin', 'analyst'), async (c) => {
  const id = c.req.param('id');
  const rows = await db.select().from(schema.botConfigs).where(eq(schema.botConfigs.id, id)).limit(1);
  if (rows.length === 0) return c.json({ error: 'Bot not found' }, 404);

  const bot = {
    ...rows[0],
    config: redactConfigSecrets(rows[0].config as Record<string, unknown>),
  };

  return c.json({ bot });
});

// ─── Create a new bot ───────────────────────────────────────────

app.post('/', requireRole('admin'), async (c) => {
  const user = c.get('user' as never) as { id: string; displayName: string };
  const body = await c.req.json();

  const { name, description, type, triggers, config, capabilities, allowedDomains,
    scopeType, scopeFolderIds, rateLimitPerHour, rateLimitPerDay } = body;

  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
    return c.json({ error: 'Name is required (1-100 chars)' }, 400);
  }

  if (!type || !VALID_BOT_TYPES.includes(type)) {
    return c.json({ error: `Invalid type. Must be one of: ${VALID_BOT_TYPES.join(', ')}` }, 400);
  }

  // Validate capabilities
  const caps = Array.isArray(capabilities) ? capabilities : [];
  for (const cap of caps) {
    if (!VALID_CAPABILITIES.includes(cap)) {
      return c.json({ error: `Invalid capability: ${cap}` }, 400);
    }
  }

  // Validate domain format (bare hostnames only, no protocol or path)
  if (Array.isArray(allowedDomains)) {
    for (const domain of allowedDomains) {
      if (typeof domain !== 'string' || !domain.match(/^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/)) {
        return c.json({ error: `Invalid domain: ${domain}. Use bare hostnames (e.g., api.virustotal.com)` }, 400);
      }
    }
  }

  if (triggers?.schedule) {
    const cronError = validateCronExpression(triggers.schedule);
    if (cronError) return c.json({ error: cronError }, 400);
  }

  // Create a bot user account
  const botUserId = nanoid();
  const botEmail = `bot-${botUserId}@threatcaddy.internal`;
  const randomPassword = nanoid(32);

  await db.insert(schema.users).values({
    id: botUserId,
    email: botEmail,
    displayName: `[Bot] ${name}`,
    passwordHash: await argon2.hash(randomPassword),
    role: 'analyst',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create bot config
  const botId = nanoid();
  const encryptedConfig = encryptConfigSecrets(config || {});

  await db.insert(schema.botConfigs).values({
    id: botId,
    userId: botUserId,
    type,
    name: name.trim(),
    description: (description || '').trim(),
    enabled: false, // Always start disabled
    triggers: (triggers || {}) as BotTriggerConfig,
    config: encryptedConfig,
    capabilities: caps,
    allowedDomains: Array.isArray(allowedDomains) ? allowedDomains : [],
    scopeType: scopeType || 'investigation',
    scopeFolderIds: Array.isArray(scopeFolderIds) ? scopeFolderIds : [],
    rateLimitPerHour: rateLimitPerHour || 100,
    rateLimitPerDay: rateLimitPerDay || 1000,
    createdBy: user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Grant investigation access if scoped
  if (scopeType === 'investigation' && Array.isArray(scopeFolderIds)) {
    for (const folderId of scopeFolderIds) {
      await db.insert(schema.investigationMembers).values({
        id: nanoid(),
        folderId,
        userId: botUserId,
        role: caps.includes('create_entities') || caps.includes('update_entities') ? 'editor' : 'viewer',
        joinedAt: new Date(),
      }).onConflictDoNothing();
    }
  }

  await logActivity({
    userId: user.id,
    category: 'bot',
    action: 'create',
    detail: `Created bot "${name}" (${type})`,
    itemId: botId,
    itemTitle: name,
  });

  return c.json({
    bot: {
      id: botId,
      userId: botUserId,
      name: name.trim(),
      type,
      enabled: false,
    },
  }, 201);
});

// ─── Update a bot config ────────────────────────────────────────

app.patch('/:id', requireRole('admin'), async (c) => {
  const user = c.get('user' as never) as { id: string };
  const id = c.req.param('id');
  const body = await c.req.json();

  const rows = await db.select().from(schema.botConfigs).where(eq(schema.botConfigs.id, id)).limit(1);
  if (rows.length === 0) return c.json({ error: 'Bot not found' }, 404);

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description.trim();
  if (body.triggers !== undefined) {
    if (body.triggers?.schedule) {
      const cronError = validateCronExpression(body.triggers.schedule);
      if (cronError) return c.json({ error: cronError }, 400);
    }
    updates.triggers = body.triggers;
  }
  if (body.allowedDomains !== undefined) updates.allowedDomains = body.allowedDomains;
  if (body.scopeType !== undefined) updates.scopeType = body.scopeType;
  if (body.scopeFolderIds !== undefined) updates.scopeFolderIds = body.scopeFolderIds;
  if (body.rateLimitPerHour !== undefined) updates.rateLimitPerHour = body.rateLimitPerHour;
  if (body.rateLimitPerDay !== undefined) updates.rateLimitPerDay = body.rateLimitPerDay;

  if (body.capabilities !== undefined) {
    for (const cap of body.capabilities) {
      if (!VALID_CAPABILITIES.includes(cap)) {
        return c.json({ error: `Invalid capability: ${cap}` }, 400);
      }
    }
    updates.capabilities = body.capabilities;
  }

  if (body.config !== undefined) {
    updates.config = encryptConfigSecrets(body.config);
  }

  await db.update(schema.botConfigs).set(updates).where(eq(schema.botConfigs.id, id));

  // Reload bot if it's running
  await botManager.reloadBot(id);

  await logActivity({
    userId: user.id,
    category: 'bot',
    action: 'update',
    detail: `Updated bot "${rows[0].name}"`,
    itemId: id,
    itemTitle: rows[0].name,
  });

  return c.json({ ok: true });
});

// ─── Enable/disable a bot ───────────────────────────────────────

app.post('/:id/enable', requireRole('admin'), async (c) => {
  const user = c.get('user' as never) as { id: string };
  const id = c.req.param('id');

  const rows = await db.select().from(schema.botConfigs).where(eq(schema.botConfigs.id, id)).limit(1);
  if (rows.length === 0) return c.json({ error: 'Bot not found' }, 404);

  await db.update(schema.botConfigs).set({ enabled: true, updatedAt: new Date() }).where(eq(schema.botConfigs.id, id));
  await botManager.reloadBot(id);

  await logActivity({
    userId: user.id,
    category: 'bot',
    action: 'enable',
    detail: `Enabled bot "${rows[0].name}"`,
    itemId: id,
    itemTitle: rows[0].name,
  });

  return c.json({ ok: true, enabled: true });
});

app.post('/:id/disable', requireRole('admin'), async (c) => {
  const user = c.get('user' as never) as { id: string };
  const id = c.req.param('id');

  const rows = await db.select().from(schema.botConfigs).where(eq(schema.botConfigs.id, id)).limit(1);
  if (rows.length === 0) return c.json({ error: 'Bot not found' }, 404);

  await db.update(schema.botConfigs).set({ enabled: false, updatedAt: new Date() }).where(eq(schema.botConfigs.id, id));
  await botManager.unloadBot(id);

  await logActivity({
    userId: user.id,
    category: 'bot',
    action: 'disable',
    detail: `Disabled bot "${rows[0].name}"`,
    itemId: id,
    itemTitle: rows[0].name,
  });

  return c.json({ ok: true, enabled: false });
});

// ─── Manual trigger ─────────────────────────────────────────────

app.post('/:id/trigger', requireRole('admin'), async (c) => {
  const user = c.get('user' as never) as { id: string };
  const id = c.req.param('id');

  const rows = await db.select().from(schema.botConfigs).where(eq(schema.botConfigs.id, id)).limit(1);
  if (rows.length === 0) return c.json({ error: 'Bot not found' }, 404);
  if (!rows[0].enabled) return c.json({ error: 'Bot is disabled' }, 400);

  void botManager.executeBot(id, 'manual');

  await logActivity({
    userId: user.id,
    category: 'bot',
    action: 'trigger.manual',
    detail: `Manually triggered bot "${rows[0].name}"`,
    itemId: id,
    itemTitle: rows[0].name,
  });

  return c.json({ ok: true, message: 'Bot triggered' });
});

// ─── Webhook endpoint (public, authenticated via bot ID + secret) ──

app.post('/:id/webhook', async (c) => {
  const id = c.req.param('id');
  const rows = await db.select().from(schema.botConfigs).where(eq(schema.botConfigs.id, id)).limit(1);
  if (rows.length === 0) return c.json({ error: 'Not found' }, 404);
  if (!rows[0].enabled) return c.json({ error: 'Bot is disabled' }, 400);

  const config = rows[0];
  const triggers = config.triggers as Record<string, unknown>;
  if (!triggers?.webhook) return c.json({ error: 'Webhooks not enabled for this bot' }, 400);

  // Decrypt config to get plaintext webhook secret
  const decryptedConfig = decryptConfigSecrets(config.config as Record<string, unknown>);
  const webhookSecret = decryptedConfig.webhookSecret as string | undefined;

  if (webhookSecret) {
    const authHeader = c.req.header('X-Webhook-Secret') || '';
    // Timing-safe comparison
    const secretBuf = Buffer.from(webhookSecret);
    const headerBuf = Buffer.from(authHeader);
    if (secretBuf.length !== headerBuf.length || !timingSafeEqual(secretBuf, headerBuf)) {
      return c.json({ error: 'Invalid webhook secret' }, 401);
    }
  }

  const payload = await c.req.json().catch(() => ({}));
  void botManager.executeBot(id, 'webhook', undefined, payload);
  return c.json({ ok: true, message: 'Webhook received' });
});

// ─── Delete a bot ───────────────────────────────────────────────

app.delete('/:id', requireRole('admin'), async (c) => {
  const user = c.get('user' as never) as { id: string };
  const id = c.req.param('id');

  const rows = await db.select().from(schema.botConfigs).where(eq(schema.botConfigs.id, id)).limit(1);
  if (rows.length === 0) return c.json({ error: 'Bot not found' }, 404);

  // Unload from runtime
  await botManager.unloadBot(id);

  // Delete bot config (cascades to bot_runs)
  await db.delete(schema.botConfigs).where(eq(schema.botConfigs.id, id));

  // Deactivate bot user account (don't delete — preserves audit trail)
  await db.update(schema.users).set({ active: false, updatedAt: new Date() })
    .where(eq(schema.users.id, rows[0].userId));

  await logActivity({
    userId: user.id,
    category: 'bot',
    action: 'delete',
    detail: `Deleted bot "${rows[0].name}"`,
    itemId: id,
    itemTitle: rows[0].name,
  });

  return c.json({ ok: true });
});

// ─── Bot run history ────────────────────────────────────────────

app.get('/:id/runs', requireRole('admin', 'analyst'), async (c) => {
  const id = c.req.param('id');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

  const runs = await db.select().from(schema.botRuns)
    .where(eq(schema.botRuns.botConfigId, id))
    .orderBy(desc(schema.botRuns.createdAt))
    .limit(limit);

  return c.json({ runs });
});

export default app;
