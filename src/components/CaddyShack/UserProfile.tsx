import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Shield } from 'lucide-react';
import { fetchUserProfile, fetchUserFeed } from '../../lib/server-api';
import { PostCard } from './PostCard';
import type { Post, TeamUser } from '../../types';

interface UserProfileProps {
  userId: string;
  currentUserId?: string;
  onBack: () => void;
}

export function UserProfile({ userId, currentUserId, onBack }: UserProfileProps) {
  const [user, setUser] = useState<TeamUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [profile, feed] = await Promise.all([
          fetchUserProfile(userId),
          fetchUserFeed(userId),
        ]);
        setUser(profile);
        setPosts(feed);
      } catch (err) {
        console.error('Failed to load user profile:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
        User not found.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4 gap-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] w-fit"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Profile card */}
      <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-medium">
            {user.displayName[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{user.displayName}</h2>
            <div className="flex items-center gap-3 text-sm text-[var(--text-tertiary)] mt-1">
              <span className="flex items-center gap-1"><Mail size={14} /> {user.email}</span>
              <span className="flex items-center gap-1"><Shield size={14} /> {user.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User's posts */}
      <h3 className="text-sm font-medium text-[var(--text-tertiary)]">Posts ({posts.length})</h3>
      {posts.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">No posts yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
