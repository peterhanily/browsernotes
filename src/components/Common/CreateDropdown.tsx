import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, FileText, ListChecks, Clock, PenTool, Shield } from 'lucide-react';

interface CreateDropdownProps {
  onNewNote: () => void;
  onNewTask: () => void;
  onNewTimelineEvent: () => void;
  onNewWhiteboard: () => void;
  onNewIOC?: () => void;
}

export function CreateDropdown({ onNewNote, onNewTask, onNewTimelineEvent, onNewWhiteboard, onNewIOC }: CreateDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items = [
    { icon: FileText, label: 'Note', action: onNewNote },
    { icon: ListChecks, label: 'Task', action: onNewTask },
    { icon: Clock, label: 'Timeline Event', action: onNewTimelineEvent },
    { icon: PenTool, label: 'Whiteboard', action: onNewWhiteboard },
    ...(onNewIOC ? [{ icon: Shield, label: 'IOC', action: onNewIOC }] : []),
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        data-tour="new-note"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-700 hover:bg-gray-600 text-gray-200"
        title="Create new..."
        aria-label="Create new"
      >
        <Plus size={16} />
        <span className="hidden sm:inline">New</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          {items.map((item, i) => (
            <button
              key={item.label}
              onClick={() => { item.action(); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 ${i === 0 ? 'rounded-t-lg' : ''} ${i === items.length - 1 ? 'rounded-b-lg' : ''}`}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
