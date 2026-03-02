import { X } from 'lucide-react';
import type { SyncResult } from '../../lib/server-api';

interface ConflictDialogProps {
  conflicts: SyncResult[];
  onResolve: (entityId: string, choice: 'mine' | 'theirs') => void;
  onClose: () => void;
}

export function ConflictDialog({ conflicts, onResolve, onClose }: ConflictDialogProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Sync Conflicts</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-secondary)]">
            <X size={18} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            {conflicts.length} item(s) were modified by another user while you were working offline.
            Choose which version to keep for each item.
          </p>

          {conflicts.map((conflict) => (
            <div
              key={conflict.entityId}
              className="border border-[var(--border)] rounded-lg p-3 mb-3 bg-[var(--bg-secondary)]"
            >
              <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
                Entity: {conflict.entityId.slice(0, 12)}...
              </div>
              {conflict.serverData && (
                <div className="text-xs text-[var(--text-tertiary)] mb-2 font-mono bg-[var(--bg-primary)] p-2 rounded max-h-20 overflow-auto">
                  Server version: {(conflict.serverData.title as string) || (conflict.serverData.name as string) || 'Untitled'}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => onResolve(conflict.entityId, 'mine')}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded font-medium"
                >
                  Keep Mine
                </button>
                <button
                  onClick={() => onResolve(conflict.entityId, 'theirs')}
                  className="flex-1 px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded font-medium"
                >
                  Use Theirs
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
