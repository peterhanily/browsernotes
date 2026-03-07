import { useState, useCallback } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Check, ArrowDownToLine, X } from 'lucide-react';
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
  const [expanded, setExpanded] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const handleResolve = useCallback((entityId: string, choice: 'mine' | 'theirs') => {
    onResolve(entityId, choice);
    setResolvedIds(prev => new Set(prev).add(entityId));
  }, [onResolve]);

  const unresolvedConflicts = conflicts.filter(c => !resolvedIds.has(c.entityId));

  if (conflicts.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      <div className="max-w-3xl mx-auto px-4 pt-2 pointer-events-auto">
        <div className="bg-amber-950/90 backdrop-blur-sm border border-amber-700/50 rounded-lg shadow-lg overflow-hidden">
          {/* Summary bar -- always visible */}
          <div className="flex items-center gap-3 px-4 py-2.5">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <span className="text-sm text-amber-200 flex-1">
              {unresolvedConflicts.length} sync {unresolvedConflicts.length === 1 ? 'conflict' : 'conflicts'}
              {resolvedIds.size > 0 && <span className="text-amber-400/60 ml-1">({resolvedIds.size} resolved)</span>}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onResolveAll('mine')}
                className="px-2.5 py-1 text-xs font-medium rounded bg-amber-600/30 text-amber-200 hover:bg-amber-600/50 transition-colors"
              >
                Keep All Mine
              </button>
              <button
                onClick={() => onResolveAll('theirs')}
                className="px-2.5 py-1 text-xs font-medium rounded bg-amber-600/30 text-amber-200 hover:bg-amber-600/50 transition-colors"
              >
                Accept All Theirs
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 rounded hover:bg-amber-600/30 text-amber-300 transition-colors"
                title={expanded ? 'Collapse' : 'Expand details'}
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-amber-600/30 text-amber-400/60 hover:text-amber-300 transition-colors"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Expanded conflict list */}
          {expanded && (
            <div className="border-t border-amber-700/30 max-h-[40vh] overflow-y-auto">
              {conflicts.map((conflict) => {
                const resolved = resolvedIds.has(conflict.entityId);
                return (
                  <div
                    key={conflict.entityId}
                    className={`flex items-center gap-3 px-4 py-2 border-b border-amber-900/50 last:border-b-0 transition-all ${
                      resolved ? 'opacity-40' : ''
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${resolved ? 'bg-green-400' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-amber-100 truncate block">{getEntityLabel(conflict)}</span>
                      {conflict.serverVersion && (
                        <span className="text-[10px] text-amber-400/50">v{conflict.serverVersion}</span>
                      )}
                    </div>
                    {!resolved && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleResolve(conflict.entityId, 'mine')}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-blue-600/30 text-blue-200 hover:bg-blue-600/50 transition-colors"
                        >
                          <Check size={10} /> Mine
                        </button>
                        <button
                          onClick={() => handleResolve(conflict.entityId, 'theirs')}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-gray-600/30 text-gray-300 hover:bg-gray-600/50 transition-colors"
                        >
                          <ArrowDownToLine size={10} /> Theirs
                        </button>
                      </div>
                    )}
                    {resolved && (
                      <span className="text-[10px] text-green-400 shrink-0">Resolved</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
