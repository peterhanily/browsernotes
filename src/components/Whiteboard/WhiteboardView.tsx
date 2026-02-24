import React, { useState, Suspense } from 'react';
import type { Whiteboard, Folder, Tag } from '../../types';
import { WhiteboardList } from './WhiteboardList';
import { Loader2 } from 'lucide-react';

const WhiteboardEditor = React.lazy(() => import('./WhiteboardEditor'));

interface WhiteboardViewProps {
  whiteboards: Whiteboard[];
  folders: Folder[];
  allTags: Tag[];
  onCreateWhiteboard: (name?: string) => Promise<Whiteboard>;
  onUpdateWhiteboard: (id: string, updates: Partial<Whiteboard>) => void;
  onDeleteWhiteboard: (id: string) => void;
  onCreateTag: (name: string) => Promise<Tag>;
}

export function WhiteboardView({
  whiteboards,
  folders,
  allTags,
  onCreateWhiteboard,
  onUpdateWhiteboard,
  onDeleteWhiteboard,
  onCreateTag,
}: WhiteboardViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedWhiteboard = selectedId ? whiteboards.find((w) => w.id === selectedId) : null;

  // Auto-deselect if whiteboard was deleted
  if (selectedId && !selectedWhiteboard) {
    // Use setTimeout to avoid setState during render
    setTimeout(() => setSelectedId(null), 0);
  }

  const handleCreate = async () => {
    const wb = await onCreateWhiteboard();
    setSelectedId(wb.id);
  };

  const handleDelete = (id: string) => {
    onDeleteWhiteboard(id);
    if (selectedId === id) setSelectedId(null);
  };

  if (selectedWhiteboard) {
    return (
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm">Loading whiteboard...</p>
          </div>
        }
      >
        <WhiteboardEditor
          whiteboard={selectedWhiteboard}
          allTags={allTags}
          folders={folders}
          onUpdate={onUpdateWhiteboard}
          onCreateTag={onCreateTag}
          onBack={() => setSelectedId(null)}
        />
      </Suspense>
    );
  }

  return (
    <WhiteboardList
      whiteboards={whiteboards}
      folders={folders}
      onSelect={setSelectedId}
      onCreate={handleCreate}
      onDelete={handleDelete}
      onRename={(id, name) => onUpdateWhiteboard(id, { name })}
    />
  );
}
