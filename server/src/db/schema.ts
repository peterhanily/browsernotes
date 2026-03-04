import { pgTable, text, integer, boolean, timestamp, jsonb, unique, index } from 'drizzle-orm/pg-core';

// ─── Users & Sessions ───────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'analyst', 'viewer'] }).notNull().default('analyst'),
  active: boolean('active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxSessionsUserId: index('idx_sessions_user_id').on(t.userId),
  idxSessionsExpiresAt: index('idx_sessions_expires_at').on(t.expiresAt),
}));

// ─── Investigation Membership ───────────────────────────────────

export const investigationMembers = pgTable('investigation_members', {
  id: text('id').primaryKey(),
  folderId: text('folder_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'editor', 'viewer'] }).notNull().default('editor'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uqFolderUser: unique('uq_folder_user').on(t.folderId, t.userId),
  idxMembersFolderId: index('idx_members_folder_id').on(t.folderId),
  idxMembersUserId: index('idx_members_user_id').on(t.userId),
}));

// ─── Entity Tables ──────────────────────────────────────────────

export const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  folderId: text('folder_id'),
  tags: jsonb('tags').notNull().default([]),
  pinned: boolean('pinned').notNull().default(false),
  archived: boolean('archived').notNull().default(false),
  trashed: boolean('trashed').notNull().default(false),
  trashedAt: timestamp('trashed_at', { withTimezone: true }),
  sourceUrl: text('source_url'),
  sourceTitle: text('source_title'),
  color: text('color'),
  clsLevel: text('cls_level'),
  iocAnalysis: jsonb('ioc_analysis'),
  iocTypes: jsonb('ioc_types').default([]),
  linkedNoteIds: jsonb('linked_note_ids').default([]),
  linkedTaskIds: jsonb('linked_task_ids').default([]),
  linkedTimelineEventIds: jsonb('linked_timeline_event_ids').default([]),
  annotations: jsonb('annotations').default([]),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by').notNull().references(() => users.id),
  updatedBy: text('updated_by').notNull().references(() => users.id),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (t) => ({
  idxNotesFolderId: index('idx_notes_folder_id').on(t.folderId),
  idxNotesUpdatedAt: index('idx_notes_updated_at').on(t.updatedAt),
}));

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  completed: boolean('completed').notNull().default(false),
  priority: text('priority', { enum: ['none', 'low', 'medium', 'high'] }).notNull().default('none'),
  dueDate: text('due_date'),
  folderId: text('folder_id'),
  tags: jsonb('tags').notNull().default([]),
  status: text('status', { enum: ['todo', 'in-progress', 'done'] }).notNull().default('todo'),
  order: integer('order').notNull().default(0),
  clsLevel: text('cls_level'),
  iocAnalysis: jsonb('ioc_analysis'),
  iocTypes: jsonb('ioc_types').default([]),
  comments: jsonb('comments').default([]),
  linkedNoteIds: jsonb('linked_note_ids').default([]),
  linkedTaskIds: jsonb('linked_task_ids').default([]),
  linkedTimelineEventIds: jsonb('linked_timeline_event_ids').default([]),
  trashed: boolean('trashed').notNull().default(false),
  trashedAt: timestamp('trashed_at', { withTimezone: true }),
  archived: boolean('archived').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by').notNull().references(() => users.id),
  updatedBy: text('updated_by').notNull().references(() => users.id),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (t) => ({
  idxTasksFolderId: index('idx_tasks_folder_id').on(t.folderId),
  idxTasksUpdatedAt: index('idx_tasks_updated_at').on(t.updatedAt),
}));

export const folders = pgTable('folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  order: integer('order').notNull().default(0),
  description: text('description'),
  status: text('status', { enum: ['active', 'closed', 'archived'] }).default('active'),
  clsLevel: text('cls_level'),
  papLevel: text('pap_level'),
  tags: jsonb('tags').default([]),
  timelineId: text('timeline_id'),
  closureResolution: text('closure_resolution'),
  closedReason: text('closed_reason'),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by').notNull().references(() => users.id),
  updatedBy: text('updated_by').notNull().references(() => users.id),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (t) => ({
  idxFoldersUpdatedAt: index('idx_folders_updated_at').on(t.updatedAt),
}));

export const tags = pgTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by').notNull().references(() => users.id),
  updatedBy: text('updated_by').notNull().references(() => users.id),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (t) => ({
  idxTagsUpdatedAt: index('idx_tags_updated_at').on(t.updatedAt),
}));

export const timelineEvents = pgTable('timeline_events', {
  id: text('id').primaryKey(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  timestampEnd: timestamp('timestamp_end', { withTimezone: true }),
  title: text('title').notNull(),
  description: text('description'),
  eventType: text('event_type').notNull(),
  source: text('source').notNull().default(''),
  confidence: text('confidence', { enum: ['low', 'medium', 'high', 'confirmed'] }).notNull().default('medium'),
  linkedIOCIds: jsonb('linked_ioc_ids').notNull().default([]),
  linkedNoteIds: jsonb('linked_note_ids').notNull().default([]),
  linkedTaskIds: jsonb('linked_task_ids').notNull().default([]),
  mitreAttackIds: jsonb('mitre_attack_ids').notNull().default([]),
  actor: text('actor'),
  assets: jsonb('assets').notNull().default([]),
  tags: jsonb('tags').notNull().default([]),
  rawData: text('raw_data'),
  starred: boolean('starred').notNull().default(false),
  folderId: text('folder_id'),
  timelineId: text('timeline_id').notNull(),
  clsLevel: text('cls_level'),
  iocAnalysis: jsonb('ioc_analysis'),
  iocTypes: jsonb('ioc_types').default([]),
  latitude: text('latitude'),
  longitude: text('longitude'),
  trashed: boolean('trashed').notNull().default(false),
  trashedAt: timestamp('trashed_at', { withTimezone: true }),
  archived: boolean('archived').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by').notNull().references(() => users.id),
  updatedBy: text('updated_by').notNull().references(() => users.id),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (t) => ({
  idxTimelineEventsFolderId: index('idx_timeline_events_folder_id').on(t.folderId),
  idxTimelineEventsUpdatedAt: index('idx_timeline_events_updated_at').on(t.updatedAt),
  idxTimelineEventsTimelineId: index('idx_timeline_events_timeline_id').on(t.timelineId),
}));

export const timelines = pgTable('timelines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  order: integer('order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by').notNull().references(() => users.id),
  updatedBy: text('updated_by').notNull().references(() => users.id),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (t) => ({
  idxTimelinesUpdatedAt: index('idx_timelines_updated_at').on(t.updatedAt),
}));

export const whiteboards = pgTable('whiteboards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  elements: text('elements').notNull().default('[]'),
  appState: text('app_state'),
  folderId: text('folder_id'),
  tags: jsonb('tags').notNull().default([]),
  order: integer('order').notNull().default(0),
  trashed: boolean('trashed').notNull().default(false),
  trashedAt: timestamp('trashed_at', { withTimezone: true }),
  archived: boolean('archived').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by').notNull().references(() => users.id),
  updatedBy: text('updated_by').notNull().references(() => users.id),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (t) => ({
  idxWhiteboardsFolderId: index('idx_whiteboards_folder_id').on(t.folderId),
  idxWhiteboardsUpdatedAt: index('idx_whiteboards_updated_at').on(t.updatedAt),
}));

export const standaloneIOCs = pgTable('standalone_iocs', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  value: text('value').notNull(),
  confidence: text('confidence', { enum: ['low', 'medium', 'high', 'confirmed'] }).notNull().default('medium'),
  analystNotes: text('analyst_notes'),
  attribution: text('attribution'),
  iocSubtype: text('ioc_subtype'),
  iocStatus: text('ioc_status'),
  clsLevel: text('cls_level'),
  folderId: text('folder_id'),
  tags: jsonb('tags').notNull().default([]),
  relationships: jsonb('relationships').default([]),
  linkedNoteIds: jsonb('linked_note_ids').default([]),
  linkedTaskIds: jsonb('linked_task_ids').default([]),
  linkedTimelineEventIds: jsonb('linked_timeline_event_ids').default([]),
  trashed: boolean('trashed').notNull().default(false),
  trashedAt: timestamp('trashed_at', { withTimezone: true }),
  archived: boolean('archived').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by').notNull().references(() => users.id),
  updatedBy: text('updated_by').notNull().references(() => users.id),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (t) => ({
  idxStandaloneIOCsFolderId: index('idx_standalone_iocs_folder_id').on(t.folderId),
  idxStandaloneIOCsUpdatedAt: index('idx_standalone_iocs_updated_at').on(t.updatedAt),
}));

export const chatThreads = pgTable('chat_threads', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  messages: jsonb('messages').notNull().default([]),
  model: text('model').notNull(),
  provider: text('provider').notNull(),
  folderId: text('folder_id'),
  tags: jsonb('tags').notNull().default([]),
  trashed: boolean('trashed').notNull().default(false),
  trashedAt: timestamp('trashed_at', { withTimezone: true }),
  archived: boolean('archived').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by').notNull().references(() => users.id),
  updatedBy: text('updated_by').notNull().references(() => users.id),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (t) => ({
  idxChatThreadsFolderId: index('idx_chat_threads_folder_id').on(t.folderId),
  idxChatThreadsUpdatedAt: index('idx_chat_threads_updated_at').on(t.updatedAt),
}));

// ─── Server Settings ────────────────────────────────────────────

export const serverSettings = pgTable('server_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const allowedEmails = pgTable('allowed_emails', {
  email: text('email').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Activity Log ───────────────────────────────────────────────

export const activityLog = pgTable('activity_log', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  category: text('category').notNull(),
  action: text('action').notNull(),
  detail: text('detail').notNull(),
  itemId: text('item_id'),
  itemTitle: text('item_title'),
  folderId: text('folder_id'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxActivityLogUserId: index('idx_activity_log_user_id').on(t.userId),
  idxActivityLogTimestamp: index('idx_activity_log_timestamp').on(t.timestamp),
  idxActivityLogFolderId: index('idx_activity_log_folder_id').on(t.folderId),
}));

// ─── Social Feed ────────────────────────────────────────────────

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  authorId: text('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  images: jsonb('images').notNull().default([]),
  folderId: text('folder_id'),
  parentId: text('parent_id'),
  mentions: jsonb('mentions').notNull().default([]),
  pinned: boolean('pinned').notNull().default(false),
  deleted: boolean('deleted').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxPostsAuthorId: index('idx_posts_author_id').on(t.authorId),
  idxPostsFolderId: index('idx_posts_folder_id').on(t.folderId),
  idxPostsCreatedAt: index('idx_posts_created_at').on(t.createdAt),
  idxPostsParentId: index('idx_posts_parent_id').on(t.parentId),
}));

export const reactions = pgTable('reactions', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uqPostUserEmoji: unique('uq_post_user_emoji').on(t.postId, t.userId, t.emoji),
  idxReactionsPostId: index('idx_reactions_post_id').on(t.postId),
}));

// ─── Notifications ──────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  sourceUserId: text('source_user_id').references(() => users.id),
  postId: text('post_id').references(() => posts.id),
  folderId: text('folder_id'),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxNotificationsUserId: index('idx_notifications_user_id').on(t.userId),
  idxNotificationsCreatedAt: index('idx_notifications_created_at').on(t.createdAt),
}));

// ─── File Storage ───────────────────────────────────────────────

export const files = pgTable('files', {
  id: text('id').primaryKey(),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  storagePath: text('storage_path').notNull(),
  thumbnailPath: text('thumbnail_path'),
  folderId: text('folder_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxFilesFolderId: index('idx_files_folder_id').on(t.folderId),
}));
