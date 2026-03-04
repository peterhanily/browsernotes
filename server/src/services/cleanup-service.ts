import { eq, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { serverSettings, notifications, activityLog } from '../db/schema.js';
import { logger } from '../lib/logger.js';

const NOTIF_RETENTION_KEY = 'notification_retention_days';
const AUDIT_RETENTION_KEY = 'audit_log_retention_days';

const DEFAULT_NOTIF_DAYS = 90;
const DEFAULT_AUDIT_DAYS = 365;

export async function getRetentionSettings(): Promise<{ notificationRetentionDays: number; auditLogRetentionDays: number }> {
  const notifRow = await db.select().from(serverSettings).where(eq(serverSettings.key, NOTIF_RETENTION_KEY)).limit(1);
  const auditRow = await db.select().from(serverSettings).where(eq(serverSettings.key, AUDIT_RETENTION_KEY)).limit(1);
  return {
    notificationRetentionDays: notifRow.length > 0 ? parseInt(notifRow[0].value, 10) : DEFAULT_NOTIF_DAYS,
    auditLogRetentionDays: auditRow.length > 0 ? parseInt(auditRow[0].value, 10) : DEFAULT_AUDIT_DAYS,
  };
}

export async function setRetentionSettings(notifDays: number, auditDays: number): Promise<void> {
  for (const [key, value] of [[NOTIF_RETENTION_KEY, String(notifDays)], [AUDIT_RETENTION_KEY, String(auditDays)]] as const) {
    const existing = await db.select().from(serverSettings).where(eq(serverSettings.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(serverSettings).set({ value, updatedAt: new Date() }).where(eq(serverSettings.key, key));
    } else {
      await db.insert(serverSettings).values({ key, value });
    }
  }
}

export async function pruneOldData(): Promise<void> {
  try {
    const settings = await getRetentionSettings();

    const notifCutoff = new Date(Date.now() - settings.notificationRetentionDays * 86400000);
    const deletedNotifs = await db
      .delete(notifications)
      .where(lt(notifications.createdAt, notifCutoff))
      .returning({ id: notifications.id });

    const auditCutoff = new Date(Date.now() - settings.auditLogRetentionDays * 86400000);
    const deletedAudit = await db
      .delete(activityLog)
      .where(lt(activityLog.timestamp, auditCutoff))
      .returning({ id: activityLog.id });

    if (deletedNotifs.length > 0 || deletedAudit.length > 0) {
      logger.info(`Data pruning: deleted ${deletedNotifs.length} notification(s), ${deletedAudit.length} audit log entry(ies)`);
    }
  } catch (err) {
    logger.error('Data pruning failed', { error: String(err) });
  }
}
