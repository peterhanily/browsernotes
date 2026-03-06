import { nanoid } from 'nanoid';
import { eq, and, isNull, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { processPush } from '../services/sync-service.js';
import { createNotification } from '../services/notification-service.js';
import { logActivity } from '../services/audit-service.js';
import { broadcastToFolder } from '../ws/handler.js';
import type { BotContext, BotCapability } from './types.js';

/**
 * Provides safe, capability-gated operations for bot execution.
 * Every action is audited and attributed to the bot's user ID.
 */
export class BotExecutionContext {
  constructor(private ctx: BotContext) {}

  // ─── Capability Check ─────────────────────────────────────────

  private requireCapability(cap: BotCapability): void {
    if (!this.ctx.botConfig.capabilities.includes(cap)) {
      throw new Error(`Bot "${this.ctx.botConfig.name}" lacks capability: ${cap}`);
    }
  }

  // ─── Domain Check (for outbound HTTP) ─────────────────────────

  private requireDomain(url: string): void {
    this.requireCapability('call_external_apis');
    const allowed = this.ctx.botConfig.allowedDomains;
    if (allowed.length === 0) return; // Empty = no restriction (careful)

    try {
      const hostname = new URL(url).hostname;
      const match = allowed.some((d) => hostname === d || hostname.endsWith(`.${d}`));
      if (!match) {
        throw new Error(`Bot "${this.ctx.botConfig.name}" not allowed to call ${hostname}. Allowed: ${allowed.join(', ')}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('not allowed')) throw err;
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  // ─── Abort Check ──────────────────────────────────────────────

  private checkAborted(): void {
    if (this.ctx.signal.aborted) {
      throw new Error('Bot execution aborted');
    }
  }

  // ─── Read Operations ──────────────────────────────────────────

  async searchNotes(folderId: string, query: string, limit = 20): Promise<Record<string, unknown>[]> {
    this.requireCapability('read_entities');
    this.checkAborted();

    const rows = await db.select().from(schema.notes).where(
      and(
        eq(schema.notes.folderId, folderId),
        eq(schema.notes.trashed, false),
        isNull(schema.notes.deletedAt),
      )
    );

    const q = query.toLowerCase();
    return rows
      .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .slice(0, limit)
      .map((n) => ({ id: n.id, title: n.title, snippet: n.content.slice(0, 200), tags: n.tags }));
  }

  async readNote(noteId: string): Promise<Record<string, unknown> | null> {
    this.requireCapability('read_entities');
    this.checkAborted();

    const rows = await db.select().from(schema.notes).where(eq(schema.notes.id, noteId)).limit(1);
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }

  async listIOCs(folderId: string, typeFilter?: string): Promise<Record<string, unknown>[]> {
    this.requireCapability('read_entities');
    this.checkAborted();

    const rows = await db.select().from(schema.standaloneIOCs).where(
      and(
        eq(schema.standaloneIOCs.folderId, folderId),
        eq(schema.standaloneIOCs.trashed, false),
        isNull(schema.standaloneIOCs.deletedAt),
      )
    );

    return typeFilter ? rows.filter((i) => i.type === typeFilter) : rows;
  }

  async listTasks(folderId: string, statusFilter?: string): Promise<Record<string, unknown>[]> {
    this.requireCapability('read_entities');
    this.checkAborted();

    const rows = await db.select().from(schema.tasks).where(
      and(
        eq(schema.tasks.folderId, folderId),
        eq(schema.tasks.trashed, false),
        isNull(schema.tasks.deletedAt),
      )
    );

    return statusFilter ? rows.filter((t) => t.status === statusFilter) : rows;
  }

  async listTimelineEvents(folderId: string): Promise<Record<string, unknown>[]> {
    this.requireCapability('read_entities');
    this.checkAborted();

    return db.select().from(schema.timelineEvents).where(
      and(
        eq(schema.timelineEvents.folderId, folderId),
        eq(schema.timelineEvents.trashed, false),
        isNull(schema.timelineEvents.deletedAt),
      )
    );
  }

  async getInvestigation(folderId: string): Promise<Record<string, unknown> | null> {
    this.requireCapability('read_entities');
    this.checkAborted();

    const rows = await db.select().from(schema.folders).where(
      and(eq(schema.folders.id, folderId), isNull(schema.folders.deletedAt))
    ).limit(1);
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }

  async listInvestigations(): Promise<Record<string, unknown>[]> {
    this.requireCapability('read_entities');
    this.checkAborted();

    return db.select().from(schema.folders).where(isNull(schema.folders.deletedAt));
  }

  async searchAcrossInvestigations(query: string): Promise<Record<string, unknown>[]> {
    this.requireCapability('cross_investigation');
    this.checkAborted();

    const q = `%${query}%`;
    // Search IOCs across all investigations
    return db.select().from(schema.standaloneIOCs).where(
      and(
        ilike(schema.standaloneIOCs.value, q),
        eq(schema.standaloneIOCs.trashed, false),
        isNull(schema.standaloneIOCs.deletedAt),
      )
    );
  }

  // ─── Write Operations (via sync-service) ──────────────────────

  async createEntity(table: string, entityId: string, data: Record<string, unknown>): Promise<void> {
    this.requireCapability('create_entities');
    this.checkAborted();

    const results = await processPush(
      [{ table, op: 'put', entityId, data }],
      this.ctx.botUserId,
    );

    const result = results[0];
    if (result.status !== 'accepted') {
      throw new Error(`Failed to create ${table}/${entityId}: ${result.status}`);
    }

    this.ctx.entitiesCreated++;

    // Broadcast entity change for real-time sync
    const folderId = data.folderId as string | undefined;
    if (folderId) {
      broadcastToFolder(folderId, {
        type: 'entity-change',
        table,
        op: 'put',
        entityId,
        data: result.serverRecord,
        updatedBy: this.ctx.botUserId,
      }, this.ctx.botUserId);
    }
  }

  async updateEntity(table: string, entityId: string, data: Record<string, unknown>, clientVersion?: number): Promise<void> {
    this.requireCapability('update_entities');
    this.checkAborted();

    const results = await processPush(
      [{ table, op: 'put', entityId, data, clientVersion }],
      this.ctx.botUserId,
    );

    const result = results[0];
    if (result.status !== 'accepted') {
      throw new Error(`Failed to update ${table}/${entityId}: ${result.status}`);
    }

    this.ctx.entitiesUpdated++;

    const folderId = data.folderId as string | undefined;
    if (folderId) {
      broadcastToFolder(folderId, {
        type: 'entity-change',
        table,
        op: 'put',
        entityId,
        data: result.serverRecord,
        updatedBy: this.ctx.botUserId,
      }, this.ctx.botUserId);
    }
  }

  // ─── Convenience: Create Specific Entities ────────────────────

  async createNote(folderId: string, title: string, content: string, tags: string[] = []): Promise<string> {
    const id = nanoid();
    await this.createEntity('notes', id, {
      title, content, folderId, tags,
      pinned: false, archived: false, trashed: false,
    });
    return id;
  }

  async createIOC(folderId: string, type: string, value: string, confidence = 'medium', analystNotes?: string): Promise<string> {
    const id = nanoid();
    await this.createEntity('standaloneIOCs', id, {
      type, value, confidence, analystNotes: analystNotes ?? null,
      folderId, tags: [], trashed: false, archived: false,
      relationships: [], linkedNoteIds: [], linkedTaskIds: [], linkedTimelineEventIds: [],
    });
    return id;
  }

  async createTask(folderId: string, title: string, description?: string, priority = 'none'): Promise<string> {
    const id = nanoid();
    await this.createEntity('tasks', id, {
      title, description: description ?? '', priority, status: 'todo',
      folderId, tags: [], completed: false, order: 0,
      trashed: false, archived: false,
      linkedNoteIds: [], linkedTaskIds: [], linkedTimelineEventIds: [],
    });
    return id;
  }

  async createTimelineEvent(folderId: string, title: string, eventType: string, timestamp: Date, opts?: {
    description?: string; source?: string; confidence?: string;
    mitreAttackIds?: string[]; linkedIOCIds?: string[];
  }): Promise<string> {
    const id = nanoid();

    // Resolve timelineId from folder
    const folder = await this.getInvestigation(folderId);
    const timelineId = (folder?.timelineId as string) || '';

    await this.createEntity('timelineEvents', id, {
      title, eventType, timestamp, folderId, timelineId,
      description: opts?.description ?? '', source: opts?.source ?? 'bot',
      confidence: opts?.confidence ?? 'medium',
      mitreAttackIds: opts?.mitreAttackIds ?? [],
      linkedIOCIds: opts?.linkedIOCIds ?? [],
      linkedNoteIds: [], linkedTaskIds: [],
      tags: [], assets: [], trashed: false, archived: false, starred: false,
    });
    return id;
  }

  // ─── Feed (CaddyShack) ───────────────────────────────────────

  async postToFeed(content: string, folderId?: string): Promise<string> {
    this.requireCapability('post_to_feed');
    this.checkAborted();

    const id = nanoid();
    await db.insert(schema.posts).values({
      id,
      authorId: this.ctx.botUserId,
      content,
      attachments: [],
      folderId: folderId ?? null,
      mentions: [],
      deleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Broadcast new post
    if (folderId) {
      broadcastToFolder(folderId, { type: 'new-post', postId: id, folderId }, this.ctx.botUserId);
    }

    await logActivity({
      userId: this.ctx.botUserId,
      category: 'bot',
      action: 'post.create',
      detail: `Bot "${this.ctx.botConfig.name}" posted to feed`,
      itemId: id,
      folderId,
    });

    return id;
  }

  // ─── Notifications ───────────────────────────────────────────

  async notifyUser(userId: string, message: string, folderId?: string): Promise<void> {
    this.requireCapability('notify_users');
    this.checkAborted();

    await createNotification({
      userId,
      type: 'bot',
      sourceUserId: this.ctx.botUserId,
      folderId,
      message: `[${this.ctx.botConfig.name}] ${message}`,
    });
  }

  // ─── External HTTP (domain-restricted) ────────────────────────

  async fetchExternal(url: string, opts?: RequestInit): Promise<Response> {
    this.requireDomain(url);
    this.checkAborted();

    this.ctx.apiCallsMade++;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    // Link to bot abort signal
    const onAbort = () => controller.abort();
    this.ctx.signal.addEventListener('abort', onAbort, { once: true });

    try {
      const response = await fetch(url, {
        ...opts,
        signal: controller.signal,
        headers: {
          'User-Agent': 'ThreatCaddy-Bot/1.0',
          ...opts?.headers,
        },
      });
      return response;
    } finally {
      clearTimeout(timeout);
      this.ctx.signal.removeEventListener('abort', onAbort);
    }
  }

  // ─── Audit Helper ────────────────────────────────────────────

  async audit(action: string, detail: string, opts?: { itemId?: string; itemTitle?: string; folderId?: string }): Promise<void> {
    await logActivity({
      userId: this.ctx.botUserId,
      category: 'bot',
      action,
      detail: `[${this.ctx.botConfig.name}] ${detail}`,
      ...opts,
    });
  }
}
