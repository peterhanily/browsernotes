import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { fetchPost } from '../../lib/server-api';
import { PostCard } from './PostCard';
import { PostComposer } from './PostComposer';
import type { Post } from '../../types';

interface ReplyThreadProps {
  postId: string;
  currentUserId?: string;
  onBack: () => void;
  onReact?: (postId: string, emoji: string) => void;
  onRemoveReaction?: (postId: string, emoji: string) => void;
}

export function ReplyThread({ postId, currentUserId, onBack, onReact, onRemoveReaction }: ReplyThreadProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPost = async () => {
    setLoading(true);
    try {
      const data = await fetchPost(postId);
      setPost(data);
    } catch (err) {
      console.error('Failed to load post:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
        Loading thread...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
        Post not found.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4 gap-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] w-fit"
      >
        <ArrowLeft size={16} /> Back to feed
      </button>

      {/* Original post */}
      <PostCard
        post={post}
        currentUserId={currentUserId}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
      />

      {/* Reply composer */}
      <PostComposer
        parentId={postId}
        folderId={post.folderId}
        placeholder="Write a reply..."
        onPostCreated={loadPost}
      />

      {/* Replies */}
      {post.replies && post.replies.length > 0 && (
        <div className="flex flex-col gap-2 pl-4 border-l-2 border-[var(--border)]">
          {post.replies.map((reply) => (
            <PostCard
              key={reply.id}
              post={reply}
              currentUserId={currentUserId}
              onReact={onReact}
              onRemoveReaction={onRemoveReaction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
