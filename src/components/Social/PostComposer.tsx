import { useState, useRef } from 'react';
import { Send, Image, AtSign, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createPost, uploadFile, searchUsers } from '../../lib/server-api';
import type { TeamUser } from '../../types';

interface PostComposerProps {
  folderId?: string | null;
  parentId?: string | null;
  placeholder?: string;
  onPostCreated?: () => void;
}

export function PostComposer({ folderId, parentId, placeholder, onPostCreated }: PostComposerProps) {
  const { user, serverUrl } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<Array<{ id: string; url: string; alt?: string }>>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionResults, setMentionResults] = useState<TeamUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!user || !serverUrl) return null;

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createPost({
        content,
        images: images.length > 0 ? images : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
        folderId: folderId || null,
        parentId: parentId || null,
      });
      setContent('');
      setImages([]);
      setMentions([]);
      onPostCreated?.();
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const result = await uploadFile(file, folderId || undefined);
        setImages((prev) => [...prev, { id: result.id, url: result.url }]);
      } catch (err) {
        console.error('Failed to upload image:', err);
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

          {/* Image previews */}
          {images.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img.url} alt="" className="h-16 rounded border border-[var(--border)] object-cover" />
                  <button
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
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
              title="Attach image"
            >
              <Image size={16} />
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
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>
      </div>
    </div>
  );
}
