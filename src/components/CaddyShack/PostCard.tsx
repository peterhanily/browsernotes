import { useState } from 'react';
import { MessageCircle, Smile, Pin, Trash2, Edit3, MoreHorizontal } from 'lucide-react';
import type { Post } from '../../types';
import { MediaGrid } from './MediaGrid';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '👀', '🎯', '✅'];

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onReply?: (postId: string) => void;
  onReact?: (postId: string, emoji: string) => void;
  onRemoveReaction?: (postId: string, emoji: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (postId: string, content: string) => void;
  onPin?: (postId: string, pinned: boolean) => void;
  onClick?: (postId: string) => void;
}

export function PostCard({
  post,
  currentUserId,
  onReply,
  onReact,
  onRemoveReaction,
  onDelete,
  onEdit,
  onPin,
  onClick,
}: PostCardProps) {
  const [showEmojis, setShowEmojis] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  const isAuthor = currentUserId === post.authorId;
  const timeAgo = formatTimeAgo(post.createdAt);

  const handleReaction = (emoji: string) => {
    const reaction = post.reactions?.[emoji];
    if (reaction?.userIds.includes(currentUserId || '')) {
      onRemoveReaction?.(post.id, emoji);
    } else {
      onReact?.(post.id, emoji);
    }
    setShowEmojis(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== post.content) {
      onEdit?.(post.id, editContent);
    }
    setEditing(false);
  };

  return (
    <div
      className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] transition-colors"
      onClick={() => !editing && onClick?.(post.id)}
    >
      {/* Reply-to label */}
      {post.replyToAuthorName && (
        <div className="text-xs text-[var(--text-tertiary)] mb-2">
          Replying to <span className="text-blue-400">@{post.replyToAuthorName}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
          {post.authorDisplayName?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-[var(--text-primary)] truncate">
            {post.authorDisplayName || 'Unknown'}
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">{timeAgo}</div>
        </div>
        {post.pinned && (
          <Pin size={14} className="text-yellow-500 shrink-0" />
        )}
        {isAuthor && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-6 z-50 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[140px]">
                {isAuthor && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(true); setShowMenu(false); }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                )}
                {isAuthor && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onPin?.(post.id, !post.pinned); setShowMenu(false); }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                  >
                    <Pin size={14} /> {post.pinned ? 'Unpin' : 'Pin'}
                  </button>
                )}
                {isAuthor && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete?.(post.id); setShowMenu(false); }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--bg-secondary)] text-red-400 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {editing ? (
        <div onClick={(e) => e.stopPropagation()}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleSaveEdit} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Save</button>
            <button onClick={() => { setEditing(false); setEditContent(post.content); }} className="px-3 py-1 bg-[var(--bg-tertiary)] rounded text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words mb-3">
          {post.content}
        </div>
      )}

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <MediaGrid attachments={post.attachments} />
      )}

      {/* Reactions */}
      {post.reactions && Object.keys(post.reactions).length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {Object.entries(post.reactions).map(([emoji, data]) => (
            <button
              key={emoji}
              onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
              className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                data.userIds.includes(currentUserId || '')
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-[var(--border)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {emoji} {data.count}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 text-[var(--text-tertiary)]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onReply?.(post.id)}
          className="flex items-center gap-1 text-xs hover:text-[var(--text-secondary)] transition-colors"
        >
          <MessageCircle size={14} />
          {post.replyCount ? post.replyCount : 'Reply'}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            className="flex items-center gap-1 text-xs hover:text-[var(--text-secondary)] transition-colors"
          >
            <Smile size={14} /> React
          </button>
          {showEmojis && (
            <div className="absolute bottom-6 left-0 z-50 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg shadow-lg p-2 flex gap-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="p-1 hover:bg-[var(--bg-secondary)] rounded text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
