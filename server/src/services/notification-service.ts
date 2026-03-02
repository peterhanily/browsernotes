import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { broadcastToUser } from '../ws/handler.js';

export async function createNotification(opts: {
  userId: string;
  type: string;
  sourceUserId?: string;
  postId?: string;
  folderId?: string;
  message: string;
}) {
  const id = nanoid();
  const notification = {
    id,
    userId: opts.userId,
    type: opts.type,
    sourceUserId: opts.sourceUserId ?? null,
    postId: opts.postId ?? null,
    folderId: opts.folderId ?? null,
    message: opts.message,
    read: false,
    createdAt: new Date(),
  };

  await db.insert(notifications).values(notification);

  // Push via WebSocket
  broadcastToUser(opts.userId, {
    type: 'notification',
    notification,
  });

  return notification;
}

export async function notifyMentions(
  mentions: string[],
  sourceUserId: string,
  postId: string,
  folderId: string | null,
  sourceDisplayName: string
) {
  for (const userId of mentions) {
    if (userId === sourceUserId) continue; // Don't notify self
    await createNotification({
      userId,
      type: 'mention',
      sourceUserId,
      postId,
      folderId: folderId ?? undefined,
      message: `${sourceDisplayName} mentioned you in a post`,
    });
  }
}
