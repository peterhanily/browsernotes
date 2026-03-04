import { X, AlertTriangle, Check, ArrowDownToLine } from 'lucide-react';
import type { SyncResult } from '../../lib/server-api';

const TABLE_LABELS: Record<string, string> = {
  notes: 'Note',
  tasks: 'Task',
  folders: 'Investigation',
  tags: 'Tag',
  timelineEvents: 'Timeline Event',
  timelines: 'Timeline',
  whiteboards: 'Whiteboard',
  standaloneIOCs: 'IOC',
  chatThreads: 'Chat Thread',
};

function getEntityLabel(conflict: SyncResult): string {
  const tableLabel = conflict.table ? (TABLE_LABELS[conflict.table] || conflict.table) : 'Item';
  const name =
    (conflict.serverData?.title as string) ||
    (conflict.serverData?.name as string) ||
    (conflict.serverData?.content as string)?.slice(0, 40) ||
    conflict.entityId.slice(0, 8);
  return `${tableLabel}: ${name}`;
}

interface ConflictDialogProps {
  conflicts: SyncResult[];
  onResolve: (entityId: string, choice: 'mine' | 'theirs') => void;
  onResolveAll: (choice: 'mine' | 'theirs') => void;
  onClose: () => void;
}

export function ConflictDialog({ conflicts, onResolve, onResolveAll, onClose }: ConflictDialogProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Sync Conflicts</h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              {conflicts.length} {conflicts.length === 1 ? 'item has' : 'items have'} conflicting changes
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
            <X size={16} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Bulk actions */}
        <div className="flex gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)]">
          <button
            onClick={() => onResolveAll('mine')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <Check size={14} /> Keep All Mine
          </button>
          <button
            onClick={() => onResolveAll('theirs')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-[var(--text-primary)] transition-colors"
          >
            <ArrowDownToLine size={14} /> Accept All Theirs
          </button>
        </div>

        {/* Conflict list */}
        <div className="overflow-y-auto flex-1 divide-y divide-[var(--border)]">
          {conflicts.map((conflict) => (
            <div key={conflict.entityId} className="px-4 py-3 hover:bg-[var(--bg-secondary)]/50 transition-colors">
              <div className="text-sm font-medium text-[var(--text-primary)] mb-0.5 truncate">
                {getEntityLabel(conflict)}
              </div>
              {conflict.serverVersion && (
                <div className="text-[11px] text-[var(--text-tertiary)] mb-2">
                  Server version: v{conflict.serverVersion}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => onResolve(conflict.entityId, 'mine')}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600/15 text-blue-400 hover:bg-blue-600/25 transition-colors"
                >
                  Keep Mine
                </button>
                <button
                  onClick={() => onResolve(conflict.entityId, 'theirs')}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
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
