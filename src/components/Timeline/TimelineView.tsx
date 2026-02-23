import { useState, useMemo } from 'react';
import { Plus, Search, ArrowUpDown, Star } from 'lucide-react';
import type { TimelineEvent, TimelineEventType, Tag, Folder } from '../../types';
import { TimelineFeed } from './TimelineFeed';
import { EventTypeFilterBar } from './EventTypeFilterBar';
import { TimelineEventForm } from './TimelineEventForm';
import { Modal } from '../Common/Modal';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import { cn } from '../../lib/utils';

interface TimelineViewProps {
  events: TimelineEvent[];
  allTags: Tag[];
  folders: Folder[];
  onCreateTag: (name: string) => Promise<Tag>;
  onCreateEvent: (data: Partial<TimelineEvent>) => void;
  onUpdateEvent: (id: string, updates: Partial<TimelineEvent>) => void;
  onDeleteEvent: (id: string) => void;
  onToggleStar: (id: string) => void;
  getFilteredEvents: (opts: {
    eventTypes?: TimelineEventType[];
    starred?: boolean;
    search?: string;
    sortDir?: 'asc' | 'desc';
  }) => TimelineEvent[];
}

export function TimelineView({
  events,
  allTags,
  folders,
  onCreateTag,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onToggleStar,
  getFilteredEvents,
}: TimelineViewProps) {
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [selectedEventTypes, setSelectedEventTypes] = useState<TimelineEventType[]>([]);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(
    () => getFilteredEvents({
      eventTypes: selectedEventTypes.length > 0 ? selectedEventTypes : undefined,
      starred: showStarredOnly || undefined,
      search: searchQuery || undefined,
      sortDir,
    }),
    [getFilteredEvents, selectedEventTypes, showStarredOnly, searchQuery, sortDir]
  );

  const handleSelect = (id: string) => {
    const event = events.find((e) => e.id === id);
    if (event) setEditingEvent(event);
  };

  const handleSaveEdit = (data: Partial<TimelineEvent>) => {
    if (editingEvent) {
      onUpdateEvent(editingEvent.id, data);
      setEditingEvent(null);
    }
  };

  const handleSaveNew = (data: Partial<TimelineEvent>) => {
    onCreateEvent(data);
    setShowNewEvent(false);
  };

  const handleConfirmDelete = () => {
    if (deletingEventId) {
      onDeleteEvent(deletingEventId);
      setDeletingEventId(null);
      if (editingEvent?.id === deletingEventId) setEditingEvent(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="text-sm font-medium text-gray-300 hidden sm:inline">Timeline ({events.length})</span>
        <span className="text-sm font-medium text-gray-300 sm:hidden">{events.length}</span>

        <div className="flex items-center gap-1 ml-2 flex-1 min-w-0 max-w-xs">
          <Search size={14} className="text-gray-500 shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events..."
            className="bg-transparent border-none text-xs text-gray-300 placeholder-gray-600 focus:outline-none w-full min-w-0"
          />
        </div>

        <button
          onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
          className={cn('p-1 rounded text-gray-500 hover:text-gray-300', sortDir === 'asc' && 'bg-gray-700 text-gray-200')}
          title={sortDir === 'asc' ? 'Oldest first' : 'Newest first'}
          aria-label="Toggle sort direction"
        >
          <ArrowUpDown size={16} />
        </button>

        <button
          onClick={() => setShowStarredOnly(!showStarredOnly)}
          className={cn('p-1 rounded', showStarredOnly ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-500 hover:text-gray-300')}
          title="Toggle starred filter"
          aria-label="Filter starred"
        >
          <Star size={16} fill={showStarredOnly ? 'currentColor' : 'none'} />
        </button>

        <button
          onClick={() => setShowNewEvent(true)}
          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
          aria-label="New event"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Event</span>
        </button>
      </div>

      {/* Event Type Filter Bar */}
      <EventTypeFilterBar
        selectedTypes={selectedEventTypes}
        onChange={setSelectedEventTypes}
      />

      {/* Scrollable feed area */}
      <div className="flex-1 overflow-y-auto p-4">
        <TimelineFeed
          events={filteredEvents}
          onSelect={handleSelect}
          onToggleStar={onToggleStar}
        />
      </div>

      {/* Edit Event Modal */}
      <Modal open={editingEvent !== null} onClose={() => setEditingEvent(null)} title="Edit Event" wide>
        {editingEvent && (
          <div>
            <TimelineEventForm
              event={editingEvent}
              folders={folders}
              allTags={allTags}
              onCreateTag={onCreateTag}
              onSave={handleSaveEdit}
              onCancel={() => setEditingEvent(null)}
            />
            <div className="mt-3 pt-3 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setDeletingEventId(editingEvent.id)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Delete this event
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* New Event Modal */}
      <Modal open={showNewEvent} onClose={() => setShowNewEvent(false)} title="New Event" wide>
        <TimelineEventForm
          folders={folders}
          allTags={allTags}
          onCreateTag={onCreateTag}
          onSave={handleSaveNew}
          onCancel={() => setShowNewEvent(false)}
        />
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deletingEventId !== null}
        onClose={() => setDeletingEventId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Event"
        message="This timeline event will be permanently deleted. This cannot be undone."
        confirmLabel="Delete Event"
        danger
      />
    </div>
  );
}
