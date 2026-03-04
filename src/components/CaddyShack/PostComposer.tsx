import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, AtSign, X, FileText, Film, Music } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createPost, uploadFile, searchUsers } from '../../lib/server-api';
import type { TeamUser, PostAttachment } from '../../types';

const ACCEPTED_FILE_TYPES = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json,.xml,.yaml,.yml,.log';

function getAttachmentType(mimeType: string): PostAttachment['type'] {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

interface PostComposerProps {
  folderId?: string | null;
  parentId?: string | null;
  replyToId?: string | null;
  placeholder?: string;
  initialContent?: string;
  onPostCreated?: () => void;
}

export function PostComposer({ folderId, parentId, replyToId, placeholder, initialContent, onPostCreated }: PostComposerProps) {
  const { user, serverUrl } = useAuth();
  const [content, setContent] = useState(initialContent || '');
  const [attachments, setAttachments] = useState<PostAttachment[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionResults, setMentionResults] = useState<TeamUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialContent !== undefined) {
      setContent(initialContent);
    }
  }, [initialContent]);

  if (!user || !serverUrl) return null;

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createPost({
        content,
        attachments: attachments.length > 0 ? attachments : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
        folderId: folderId || null,
        parentId: parentId || null,
        replyToId: replyToId || null,
      });
      setContent('');
      setAttachments([]);
      setMentions([]);
      onPostCreated?.();
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const result = await uploadFile(file, folderId || undefined);
        const att: PostAttachment = {
          id: result.id,
          url: result.url,
          type: getAttachmentType(result.mimeType),
          mimeType: result.mimeType,
          filename: result.filename,
          size: result.size,
          thumbnailUrl: result.thumbnailUrl || undefined,
        };
        setAttachments((prev) => [...prev, att]);
      } catch (err) {
        console.error('Failed to upload file:', err);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMentionSearch = async (query: string) => {
    setMentionSearch(query);
    if (query.length < 2) {
      setMentionResults([]);
      return;
    }
    try {
      const users = await searchUsers(query);
      setMentionResults(users);
    } catch { /* ignore */ }
  };

  const insertMention = (mentionUser: TeamUser) => {
    setContent((prev) => prev + `@${mentionUser.displayName} `);
    setMentions((prev) => [...prev, mentionUser.id]);
    setShowMentions(false);
    setMentionSearch('');
    textareaRef.current?.focus();
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const AttachmentIcon = ({ type }: { type: PostAttachment['type'] }) => {
    switch (type) {
      case 'video': return <Film size={14} className="text-purple-400" />;
      case 'audio': return <Music size={14} className="text-green-400" />;
      case 'document': return <FileText size={14} className="text-blue-400" />;
      default: return null;
    }
  };

  return (
    <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] p-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium shrink-0 mt-1">
          {user.displayName[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder || "Share an update with your team..."}
            className="w-full bg-transparent border-0 resize-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none min-h-[60px]"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {attachments.map((att, i) => (
                <div key={i} className="relative group">
                  {att.type === 'image' ? (
                    <img src={att.thumbnailUrl || att.url} alt={att.alt || ''} className="h-16 rounded border border-[var(--border)] object-cover" />
                  ) : (
                    <div className="h-16 w-20 rounded border border-[var(--border)] bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-1 px-1">
                      <AttachmentIcon type={att.type} />
                      <span className="text-[9px] text-[var(--text-tertiary)] truncate w-full text-center">{att.filename}</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Mention dropdown */}
          {showMentions && (
            <div className="mb-2">
              <input
                type="text"
                value={mentionSearch}
                onChange={(e) => handleMentionSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1 text-sm"
                autoFocus
              />
              {mentionResults.length > 0 && (
                <div className="mt-1 border border-[var(--border)] rounded bg-[var(--bg-primary)] max-h-32 overflow-y-auto">
                  {mentionResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => insertMention(u)}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                        {u.displayName[0]?.toUpperCase()}
                      </div>
                      {u.displayName}
                      <span className="text-[var(--text-tertiary)] text-xs ml-auto">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              title="Attach file"
            >
              <Paperclip size={16} />
            </button>
            <button
              onClick={() => setShowMentions(!showMentions)}
              className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              title="Mention user"
            >
              <AtSign size={16} />
            </button>
            <div className="flex-1" />
            <span className="text-xs text-[var(--text-tertiary)]">Ctrl+Enter to post</span>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send size={14} /> Post
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    </div>
  );
}
