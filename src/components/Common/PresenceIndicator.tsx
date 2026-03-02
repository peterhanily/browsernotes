import type { PresenceUser } from '../../types';

interface PresenceIndicatorProps {
  users: PresenceUser[];
  maxDisplay?: number;
}

export function PresenceIndicator({ users, maxDisplay = 5 }: PresenceIndicatorProps) {
  if (users.length === 0) return null;

  const displayed = users.slice(0, maxDisplay);
  const remaining = users.length - maxDisplay;

  return (
    <div className="flex items-center -space-x-2">
      {displayed.map((user) => (
        <div
          key={user.id}
          className="w-7 h-7 rounded-full border-2 border-[var(--bg-primary)] flex items-center justify-center text-white text-[10px] font-medium shrink-0 relative group"
          style={{ backgroundColor: stringToColor(user.displayName) }}
          title={`${user.displayName} — ${user.view}`}
        >
          {user.displayName[0]?.toUpperCase() || '?'}
          <div className="absolute w-2 h-2 bg-green-500 rounded-full -bottom-0.5 -right-0.5 border border-[var(--bg-primary)]" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs text-[var(--text-secondary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {user.displayName}
          </div>
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-7 h-7 rounded-full border-2 border-[var(--bg-primary)] bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-tertiary)] text-[10px] font-medium">
          +{remaining}
        </div>
      )}
    </div>
  );
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];
  return colors[Math.abs(hash) % colors.length];
}
