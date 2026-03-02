import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { activityLog } from '../db/schema.js';

export async function logActivity(opts: {
  userId: string;
  category: string;
  action: string;
  detail: string;
  itemId?: string;
  itemTitle?: string;
  folderId?: string;
}) {
  await db.insert(activityLog).values({
    id: nanoid(),
    userId: opts.userId,
    category: opts.category,
    action: opts.action,
    detail: opts.detail,
    itemId: opts.itemId,
    itemTitle: opts.itemTitle,
    folderId: opts.folderId,
    timestamp: new Date(),
  });
}
