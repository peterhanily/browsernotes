import React, { useState } from 'react';
import {
  FileText, ListChecks, Clock, Trash2, Briefcase,
  Archive, ChevronDown, Plus, X, Settings as SettingsIcon,
  PanelLeftClose, PanelLeft, Github, Download, Chrome, PenTool, Activity, Network, Info, Dices, RotateCcw, Search,
  LayoutDashboard, MessageSquare,
} from 'lucide-react';
import type { Folder, Tag as TagType, Timeline, Whiteboard, ViewMode, InvestigationStatus } from '../../types';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import { Modal } from '../Common/Modal';
import { OperationNameGenerator } from '../Common/OperationNameGenerator';
import { InvestigationCard } from './InvestigationCard';
import { cn, formatDate } from '../../lib/utils';

interface SidebarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  folders: Folder[];
  tags: TagType[];
  selectedFolderId?: string;
  onFolderSelect: (id?: string) => void;
  selectedTag?: string;
  onTagSelect: (name?: string) => void;
  showTrash: boolean;
  onShowTrash: (show: boolean) => void;
  showArchive: boolean;
  onShowArchive: (show: boolean) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onTrashFolderContents: (id: string) => void;
  onArchiveFolder: (id: string) => void;
  onUnarchiveFolder: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onOpenSettings: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  noteCounts: { total: number; trashed: number; archived: number };
  taskCounts: { todo: number; 'in-progress': number; done: number; total: number };
  timelineCounts?: { total: number; starred: number };
  timelines?: Timeline[];
  selectedTimelineId?: string;
  onTimelineSelect?: (id?: string) => void;
  onCreateTimeline?: (name: string) => void;
  onDeleteTimeline?: (id: string) => void;
  onRenameTimeline?: (id: string, name: string) => void;
  timelineEventCounts?: Record<string, number>;
  whiteboards?: Whiteboard[];
  selectedWhiteboardId?: string;
  onWhiteboardSelect?: (id: string) => void;
  onCreateWhiteboard?: (name?: string) => Promise<Whiteboard>;
  onDeleteWhiteboard?: (id: string) => void;
  onRenameWhiteboard?: (id: string, name: string) => void;
  whiteboardCount?: number;
  onNavigate?: () => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string) => void;
  onRenameTag?: (id: string, name: string) => void;
  onDeleteTag?: (id: string) => void;
  onEditFolder?: (id: string) => void;
  folderStatusFilter?: InvestigationStatus[];
  onFolderStatusFilterChange?: (filter: InvestigationStatus[]) => void;
  investigationScopedCounts?: { notes: number; tasks: number; events: number; whiteboards: number; iocs: number } | null;
  chatCount?: number;
}

type SegmentedFilter = 'all' | InvestigationStatus;

export function Sidebar({
  activeView,
  onViewChange,
  folders,
  tags,
  selectedFolderId,
  onFolderSelect,
  selectedTag,
  onTagSelect,
  showTrash,
  onShowTrash,
  showArchive,
  onShowArchive,
  onCreateFolder,
  onDeleteFolder,
  onTrashFolderContents,
  onArchiveFolder,
  onUnarchiveFolder,
  onRenameFolder,
  onOpenSettings,
  collapsed,
  onToggleCollapsed,
  noteCounts,
  taskCounts,
  timelineCounts,
  timelines = [],
  selectedTimelineId,
  onTimelineSelect,
  onCreateTimeline,
  onDeleteTimeline,
  onRenameTimeline,
  timelineEventCounts = {},
  whiteboards = [],
  selectedWhiteboardId,
  onWhiteboardSelect,
  onCreateWhiteboard,
  onDeleteWhiteboard,
  onRenameWhiteboard,
  whiteboardCount,
  onNavigate,
  onMoveNoteToFolder,
  onRenameTag,
  onDeleteTag,
  onEditFolder,
  // folderStatusFilter — managed internally via segmentedFilter state
  onFolderStatusFilterChange,
  investigationScopedCounts,
  chatCount,
}: SidebarProps) {
  const [investigationsListOpen, setInvestigationsListOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showNameGenerator, setShowNameGenerator] = useState(false);

  const [timelinesOpen, setTimelinesOpen] = useState(true);
  const [newTimelineName, setNewTimelineName] = useState('');
  const [showNewTimeline, setShowNewTimeline] = useState(false);
  const [editingTimeline, setEditingTimeline] = useState<string | null>(null);
  const [editTimelineName, setEditTimelineName] = useState('');
  const [deletingTimelineId, setDeletingTimelineId] = useState<string | null>(null);

  const [whiteboardsOpen, setWhiteboardsOpen] = useState(true);
  const [newWhiteboardName, setNewWhiteboardName] = useState('');
  const [showNewWhiteboard, setShowNewWhiteboard] = useState(false);
  const [editingWhiteboard, setEditingWhiteboard] = useState<string | null>(null);
  const [editWhiteboardName, setEditWhiteboardName] = useState('');
  const [deletingWhiteboardId, setDeletingWhiteboardId] = useState<string | null>(null);

  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  const [segmentedFilter, setSegmentedFilter] = useState<SegmentedFilter>('all');

  // Derived state
  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  const handleRenameFolder = (id: string) => {
    if (editFolderName.trim()) {
      onRenameFolder(id, editFolderName.trim());
      setEditingFolder(null);
    }
  };

  const handleCreateTimeline = () => {
    if (newTimelineName.trim() && onCreateTimeline) {
      onCreateTimeline(newTimelineName.trim());
      setNewTimelineName('');
      setShowNewTimeline(false);
    }
  };

  const handleRenameTimeline = (id: string) => {
    if (editTimelineName.trim() && onRenameTimeline) {
      onRenameTimeline(id, editTimelineName.trim());
      setEditingTimeline(null);
    }
  };

  const handleCreateWhiteboard = () => {
    if (newWhiteboardName.trim() && onCreateWhiteboard) {
      onCreateWhiteboard(newWhiteboardName.trim());
      setNewWhiteboardName('');
      setShowNewWhiteboard(false);
    }
  };

  const handleRenameWhiteboard = (id: string) => {
    if (editWhiteboardName.trim() && onRenameWhiteboard) {
      onRenameWhiteboard(id, editWhiteboardName.trim());
      setEditingWhiteboard(null);
    }
  };

  const handleRenameTag = (id: string) => {
    if (editTagName.trim() && onRenameTag) {
      onRenameTag(id, editTagName.trim());
      setEditingTag(null);
    }
  };

  const clearFilters = () => {
    onFolderSelect(undefined);
    onTagSelect(undefined);
    onShowTrash(false);
    onShowArchive(false);
  };

  const navToView = (view: ViewMode) => {
    onViewChange(view);
    if (!selectedFolderId) clearFilters();
  };

  const nav = (fn: () => void) => {
    fn();
    onNavigate?.();
  };

  const handleSegmentedFilterChange = (filter: SegmentedFilter) => {
    setSegmentedFilter(filter);
    if (onFolderStatusFilterChange) {
      if (filter === 'all') {
        onFolderStatusFilterChange(['active', 'closed', 'archived']);
      } else {
        onFolderStatusFilterChange([filter]);
      }
    }
  };

  // Filtered folders for the investigation list
  const filteredFolders = folders.filter((f) => {
    if (segmentedFilter === 'all') return true;
    return (f.status || 'active') === segmentedFilter;
  });

  // View items for collapsed icon rail
  const collapsedViewItems: { view: ViewMode; icon: typeof FileText; label: string; badge?: number; badgeColor?: string; dataTour?: string }[] = [
    { view: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { view: 'notes', icon: FileText, label: 'Notes', badge: investigationScopedCounts ? investigationScopedCounts.notes : noteCounts.total, badgeColor: 'bg-accent-blue' },
    { view: 'tasks', icon: ListChecks, label: 'Tasks', badge: investigationScopedCounts ? investigationScopedCounts.tasks : taskCounts.total, badgeColor: 'bg-accent-amber', dataTour: 'tasks' },
    { view: 'timeline', icon: Clock, label: 'Timeline', badge: investigationScopedCounts ? investigationScopedCounts.events : timelineCounts?.total, badgeColor: 'bg-accent-green', dataTour: 'timeline' },
    { view: 'whiteboard', icon: PenTool, label: 'Whiteboards', badge: investigationScopedCounts ? investigationScopedCounts.whiteboards : whiteboardCount, dataTour: 'whiteboards' },
    { view: 'ioc-stats', icon: Search, label: 'IOC Stats', badge: investigationScopedCounts ? investigationScopedCounts.iocs : undefined, badgeColor: 'bg-accent-green' },
    { view: 'chat', icon: MessageSquare, label: 'AI Chat', badge: chatCount },
    { view: 'graph', icon: Network, label: 'Graph' },
    { view: 'activity', icon: Activity, label: 'Activity', dataTour: 'activity' },
  ];

  // --- Collapsed: icon-only rail ---
  if (collapsed) {
    return (
      <aside
        className="w-12 border-r border-border-subtle sidebar-glass flex flex-col items-center py-2 gap-0.5 h-full shrink-0 overflow-y-auto overflow-x-hidden"
        role="navigation"
        aria-label="Main navigation"
        data-tour="sidebar-nav"
      >
        {collapsedViewItems.map((item) => (
          <CollapsedIcon
            key={item.view}
            icon={item.icon}
            label={item.label}
            active={activeView === item.view && !showTrash && !showArchive}
            badge={item.badge}
            onClick={() => nav(() => navToView(item.view))}
            dataTour={item.dataTour}
          />
        ))}

        <div className="flex-1" />
        <div className="w-6 border-t border-border-subtle my-1" />

        <CollapsedIcon
          icon={SettingsIcon}
          label="Settings"
          onClick={() => nav(onOpenSettings)}
        />

        <CollapsedIcon
          icon={Archive}
          label="Archive"
          active={showArchive}
          badge={noteCounts.archived}
          onClick={() => nav(() => { onShowArchive(!showArchive); onShowTrash(false); onFolderSelect(undefined); onTagSelect(undefined); })}
        />
        <CollapsedIcon
          icon={Trash2}
          label="Trash"
          active={showTrash}
          badge={noteCounts.trashed}
          onClick={() => nav(() => { onShowTrash(!showTrash); onShowArchive(false); onFolderSelect(undefined); onTagSelect(undefined); })}
        />
        <CollapsedIcon
          icon={PanelLeft}
          label="Expand sidebar"
          onClick={onToggleCollapsed}
        />
      </aside>
    );
  }

  // --- Expanded: full sidebar ---
  return (
    <aside className="w-[260px] border-r border-border-subtle sidebar-glass flex flex-col h-full shrink-0 overflow-hidden" role="navigation" aria-label="Main navigation">
      {/* 1. HEADER */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Investigations</span>
        <button onClick={onToggleCollapsed} className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors" aria-label="Collapse sidebar" title="Collapse sidebar">
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* 2. ALL INVESTIGATIONS TOGGLE */}
      <div className="px-2 pt-1.5">
        <button
          onClick={() => setInvestigationsListOpen(!investigationsListOpen)}
          className="flex items-center justify-center gap-1 w-full py-1 font-mono text-[10px] text-text-muted hover:text-text-secondary transition-colors"
          aria-expanded={investigationsListOpen}
        >
          All Investigations
          <ChevronDown
            size={12}
            className="transition-transform duration-200"
            style={{ transform: investigationsListOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        <div
          className="overflow-hidden transition-all duration-250 ease-in-out"
          style={{
            maxHeight: investigationsListOpen ? '400px' : '0px',
            opacity: investigationsListOpen ? 1 : 0,
          }}
        >
          {/* Segmented filter */}
          {onFolderStatusFilterChange && (
            <div className="flex gap-0.5 p-0.5 bg-bg-deep rounded-lg mb-1.5 mt-1">
              {(['all', 'active', 'closed', 'archived'] as SegmentedFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSegmentedFilterChange(s)}
                  className={cn(
                    'flex-1 px-1 py-0.5 rounded text-[10px] font-medium transition-colors',
                    segmentedFilter === s
                      ? 'bg-bg-active text-text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  )}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Investigation list */}
          <div className="space-y-0.5 max-h-[300px] overflow-y-auto" data-tour="tags-folders">
            {/* "All Items" — click to deselect investigation */}
            <NavItem
              compact
              icon={<Briefcase size={14} />}
              label="View All"
              active={!selectedFolderId}
              onClick={() => nav(() => { onFolderSelect(undefined); onTagSelect(undefined); onShowTrash(false); onShowArchive(false); })}
            />
            {filteredFolders.map((folder) => (
              <div
                key={folder.id}
                className={cn(
                  'group relative rounded-lg transition-colors',
                  dragOverFolderId === folder.id && 'bg-purple/15',
                  (folder.status === 'closed' || folder.status === 'archived') && 'opacity-60'
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverFolderId(null);
                  const noteId = e.dataTransfer.getData('text/plain');
                  if (noteId && onMoveNoteToFolder) onMoveNoteToFolder(noteId, folder.id);
                }}
              >
                {editingFolder === folder.id ? (
                  <div className="flex items-center gap-1 px-2">
                    <input
                      autoFocus
                      value={editFolderName}
                      onChange={(e) => setEditFolderName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRenameFolder(folder.id); if (e.key === 'Escape') setEditingFolder(null); }}
                      aria-label="Rename investigation"
                      className="flex-1 bg-bg-deep border border-border-medium rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-purple"
                    />
                  </div>
                ) : (
                  <InvestigationListItem
                    folder={folder}
                    active={selectedFolderId === folder.id}
                    onClick={() => nav(() => {
                      if (selectedFolderId === folder.id) {
                        onFolderSelect(undefined);
                      } else {
                        onFolderSelect(folder.id);
                      }
                      onTagSelect(undefined); onShowTrash(false); onShowArchive(false);
                    })}
                    onDoubleClick={() => { setEditingFolder(folder.id); setEditFolderName(folder.name); }}
                    onInfo={onEditFolder ? () => onEditFolder(folder.id) : undefined}
                    onArchive={(folder.status || 'active') !== 'archived' ? () => onArchiveFolder(folder.id) : undefined}
                    onUnarchive={(folder.status || 'active') === 'archived' ? () => onUnarchiveFolder(folder.id) : undefined}
                    onDelete={() => setDeletingFolderId(folder.id)}
                  />
                )}
              </div>
            ))}
            {filteredFolders.length === 0 && (
              <p className="px-2 py-1 text-[10px] text-text-muted font-mono">No investigations</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. NEW INVESTIGATION ROW */}
      <div className="px-2 pt-1.5">
        {showNewFolder ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); } }}
              placeholder="Investigation name"
              aria-label="New investigation name"
              className="flex-1 bg-bg-deep border border-border-medium rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-purple"
            />
            <button onClick={handleCreateFolder} className="text-purple hover:text-accent-hover" aria-label="Create investigation" title="Create">
              <Plus size={14} />
            </button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="text-text-muted hover:text-text-primary" aria-label="Cancel" title="Cancel">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-purple text-white text-xs font-medium hover:brightness-110 transition-all"
            >
              <Plus size={14} />
              New
            </button>
            <button
              onClick={() => setShowNameGenerator(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors"
              title="Generate investigation name"
              aria-label="Generate investigation name"
            >
              <Dices size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 4. ACTIVE INVESTIGATION CARD */}
      <div className="px-2 pt-2">
        {selectedFolder && onEditFolder ? (
          <InvestigationCard
            folder={selectedFolder}
            counts={{
              notes: investigationScopedCounts?.notes ?? 0,
              tasks: investigationScopedCounts?.tasks ?? 0,
              events: investigationScopedCounts?.events ?? 0,
              whiteboards: investigationScopedCounts?.whiteboards ?? 0,
              iocs: investigationScopedCounts?.iocs ?? 0,
            }}
            onEditFolder={onEditFolder}
          />
        ) : (
          <div className="font-mono text-[11px] text-text-muted px-1">
            Viewing all
          </div>
        )}
      </div>

      {/* 5. NAVIGATION */}
      <nav data-tour="sidebar-nav" className="flex-1 overflow-y-auto px-2 pt-2 space-y-0.5" aria-label="Views">
        <NavItem
          icon={<LayoutDashboard size={16} />}
          label="Dashboard"
          active={activeView === 'dashboard' && !showTrash && !showArchive}
          onClick={() => nav(() => navToView('dashboard'))}
        />
        <NavItem
          icon={<FileText size={16} />}
          label="Notes"
          badge={investigationScopedCounts ? investigationScopedCounts.notes : noteCounts.total}
          badgeColor="bg-accent-blue/15 text-accent-blue"
          active={activeView === 'notes' && !showTrash && !showArchive}
          onClick={() => nav(() => navToView('notes'))}
        />
        <div data-tour="tasks">
          <NavItem
            icon={<ListChecks size={16} />}
            label="Tasks"
            badge={investigationScopedCounts ? investigationScopedCounts.tasks : taskCounts.total}
            badgeColor="bg-accent-amber/15 text-accent-amber"
            active={activeView === 'tasks'}
            onClick={() => nav(() => navToView('tasks'))}
          />
        </div>
        <div data-tour="timeline">
          <NavItem
            icon={<Clock size={16} />}
            label="Timeline"
            badge={investigationScopedCounts ? investigationScopedCounts.events : timelineCounts?.total}
            badgeColor="bg-accent-green/15 text-accent-green"
            active={activeView === 'timeline'}
            onClick={() => nav(() => navToView('timeline'))}
          />
        </div>
        <div data-tour="whiteboards">
          <NavItem
            icon={<PenTool size={16} />}
            label="Whiteboards"
            badge={investigationScopedCounts ? investigationScopedCounts.whiteboards : whiteboardCount}
            active={activeView === 'whiteboard'}
            onClick={() => nav(() => navToView('whiteboard'))}
          />
        </div>

        {/* 6px gap between Whiteboards and IOC Stats */}
        <div className="h-1.5" />

        <NavItem
          icon={<Search size={16} />}
          label="IOC Stats"
          badge={investigationScopedCounts ? investigationScopedCounts.iocs : undefined}
          badgeColor="bg-accent-green/15 text-accent-green"
          active={activeView === 'ioc-stats'}
          onClick={() => nav(() => navToView('ioc-stats'))}
        />
        <NavItem
          icon={<MessageSquare size={16} />}
          label="AI Chat"
          badge={chatCount}
          badgeColor="bg-purple/15 text-purple"
          active={activeView === 'chat'}
          onClick={() => nav(() => navToView('chat'))}
        />
        <NavItem
          icon={<Network size={16} />}
          label="Graph"
          active={activeView === 'graph'}
          onClick={() => nav(() => navToView('graph'))}
        />
        <div data-tour="activity">
          <NavItem
            icon={<Activity size={16} />}
            label="Activity"
            active={activeView === 'activity'}
            onClick={() => nav(() => navToView('activity'))}
          />
        </div>

        {/* 6. CONTEXTUAL SUB-LISTS */}

        {/* Whiteboards — only in whiteboard view */}
        {activeView === 'whiteboard' && (
          <div className="pt-1">
            <div className="mx-0 mb-1.5 border-t border-border-subtle" />
            <div
              role="button"
              tabIndex={0}
              onClick={() => setWhiteboardsOpen(!whiteboardsOpen)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setWhiteboardsOpen(!whiteboardsOpen); } }}
              className="flex items-center gap-1 w-full px-2 py-1 font-mono text-[10px] text-text-muted hover:text-text-secondary cursor-pointer transition-colors"
              aria-expanded={whiteboardsOpen}
            >
              <ChevronDown
                size={12}
                className="transition-transform duration-200"
                style={{ transform: whiteboardsOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
              />
              Whiteboards
              <button
                onClick={(e) => { e.stopPropagation(); setShowNewWhiteboard(true); }}
                className="ml-auto p-0.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                aria-label="Create whiteboard"
                title="Create whiteboard"
              >
                <Plus size={12} />
              </button>
            </div>

            {whiteboardsOpen && (
              <div className="mt-1 space-y-0.5">
                {showNewWhiteboard && (
                  <div className="flex items-center gap-1 px-2">
                    <input
                      autoFocus
                      value={newWhiteboardName}
                      onChange={(e) => setNewWhiteboardName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateWhiteboard(); if (e.key === 'Escape') setShowNewWhiteboard(false); }}
                      placeholder="Whiteboard name"
                      aria-label="New whiteboard name"
                      className="flex-1 bg-bg-deep border border-border-medium rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-purple"
                    />
                    <button onClick={handleCreateWhiteboard} className="text-purple hover:text-accent-hover" aria-label="Confirm create whiteboard" title="Create whiteboard">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => setShowNewWhiteboard(false)} className="text-text-muted hover:text-text-primary" aria-label="Cancel" title="Cancel">
                      <X size={14} />
                    </button>
                  </div>
                )}
                {whiteboards.map((wb) => (
                  <div key={wb.id} className="group relative">
                    {editingWhiteboard === wb.id ? (
                      <div className="flex items-center gap-1 px-2">
                        <input
                          autoFocus
                          value={editWhiteboardName}
                          onChange={(e) => setEditWhiteboardName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameWhiteboard(wb.id); if (e.key === 'Escape') setEditingWhiteboard(null); }}
                          aria-label="Rename whiteboard"
                          className="flex-1 bg-bg-deep border border-border-medium rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-purple"
                        />
                      </div>
                    ) : (
                      <NavItem
                        compact
                        icon={<PenTool size={14} />}
                        label={wb.name}
                        active={selectedWhiteboardId === wb.id}
                        onClick={() => nav(() => { onWhiteboardSelect?.(wb.id); })}
                        onDoubleClick={() => { setEditingWhiteboard(wb.id); setEditWhiteboardName(wb.name); }}
                        actions={
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingWhiteboardId(wb.id); }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-bg-hover text-text-muted hover:text-red-400 transition-all"
                            aria-label={`Delete whiteboard ${wb.name}`}
                            title="Delete whiteboard"
                          >
                            <X size={12} />
                          </button>
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timelines — only in timeline view */}
        {activeView === 'timeline' && (
          <div className="pt-1">
            <div className="mx-0 mb-1.5 border-t border-border-subtle" />
            <div
              role="button"
              tabIndex={0}
              onClick={() => setTimelinesOpen(!timelinesOpen)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTimelinesOpen(!timelinesOpen); } }}
              className="flex items-center gap-1 w-full px-2 py-1 font-mono text-[10px] text-text-muted hover:text-text-secondary cursor-pointer transition-colors"
              aria-expanded={timelinesOpen}
            >
              <ChevronDown
                size={12}
                className="transition-transform duration-200"
                style={{ transform: timelinesOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
              />
              Timelines
              <button
                onClick={(e) => { e.stopPropagation(); setShowNewTimeline(true); }}
                className="ml-auto p-0.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                aria-label="Create timeline"
                title="Create timeline"
              >
                <Plus size={12} />
              </button>
            </div>

            {timelinesOpen && (
              <div className="mt-1 space-y-0.5">
                {showNewTimeline && (
                  <div className="flex items-center gap-1 px-2">
                    <input
                      autoFocus
                      value={newTimelineName}
                      onChange={(e) => setNewTimelineName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTimeline(); if (e.key === 'Escape') setShowNewTimeline(false); }}
                      placeholder="Timeline name"
                      aria-label="New timeline name"
                      className="flex-1 bg-bg-deep border border-border-medium rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-purple"
                    />
                    <button onClick={handleCreateTimeline} className="text-purple hover:text-accent-hover" aria-label="Confirm create timeline" title="Create timeline">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => setShowNewTimeline(false)} className="text-text-muted hover:text-text-primary" aria-label="Cancel" title="Cancel">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <NavItem
                  compact
                  icon={<Clock size={14} />}
                  label="All Events"
                  badge={timelineCounts?.total}
                  active={!selectedTimelineId}
                  onClick={() => nav(() => { onTimelineSelect?.(undefined); })}
                />
                {timelines.map((tl) => (
                  <div key={tl.id} className="group relative">
                    {editingTimeline === tl.id ? (
                      <div className="flex items-center gap-1 px-2">
                        <input
                          autoFocus
                          value={editTimelineName}
                          onChange={(e) => setEditTimelineName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameTimeline(tl.id); if (e.key === 'Escape') setEditingTimeline(null); }}
                          aria-label="Rename timeline"
                          className="flex-1 bg-bg-deep border border-border-medium rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-purple"
                        />
                      </div>
                    ) : (
                      <NavItem
                        compact
                        icon={<Clock size={14} style={{ color: tl.color }} />}
                        label={tl.name}
                        badge={timelineEventCounts[tl.id] || 0}
                        active={selectedTimelineId === tl.id}
                        onClick={() => nav(() => { onTimelineSelect?.(tl.id); })}
                        onDoubleClick={() => { setEditingTimeline(tl.id); setEditTimelineName(tl.name); }}
                        actions={
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingTimelineId(tl.id); }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-bg-hover text-text-muted hover:text-red-400 transition-all"
                            aria-label={`Delete timeline ${tl.name}`}
                            title="Delete timeline"
                          >
                            <X size={12} />
                          </button>
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. TAGS */}
        <div className="pt-1">
          <div className="mx-0 mb-1 border-t border-border-subtle" />
          <div
            role="button"
            tabIndex={0}
            onClick={() => setTagsOpen(!tagsOpen)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTagsOpen(!tagsOpen); } }}
            className="flex items-center gap-1 w-full px-2 py-1 font-mono text-[10px] text-text-muted hover:text-text-secondary cursor-pointer transition-colors"
            aria-expanded={tagsOpen}
          >
            <ChevronDown
              size={12}
              className="transition-transform duration-200"
              style={{ transform: tagsOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            />
            Tags
          </div>

          {tagsOpen && (
            <div className="mt-1 flex flex-wrap gap-1 px-2" data-tour="tags-folders">
              {tags.map((tag) => (
                <div key={tag.id} className="group relative">
                  {editingTag === tag.id ? (
                    <input
                      autoFocus
                      value={editTagName}
                      onChange={(e) => setEditTagName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRenameTag(tag.id); if (e.key === 'Escape') setEditingTag(null); }}
                      aria-label="Rename tag"
                      className="bg-bg-deep border border-border-medium rounded px-2 py-0.5 text-xs text-text-primary focus:outline-none focus:border-purple w-24"
                    />
                  ) : (
                    <button
                      onClick={() => nav(() => { onTagSelect(tag.name); onFolderSelect(undefined); onShowTrash(false); onShowArchive(false); })}
                      onDoubleClick={() => { setEditingTag(tag.id); setEditTagName(tag.name); }}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-colors',
                        selectedTag === tag.name
                          ? 'bg-purple/20 text-purple'
                          : 'bg-bg-raised text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      )}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeletingTagId(tag.id); }}
                        className="opacity-0 group-hover:opacity-100 p-0 hover:text-red-400 transition-all"
                        aria-label={`Delete tag ${tag.name}`}
                        title="Delete tag"
                      >
                        <X size={10} />
                      </button>
                    </button>
                  )}
                </div>
              ))}
              {tags.length === 0 && (
                <p className="text-[10px] text-text-muted font-mono">No tags yet</p>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* 8. FOOTER */}
      <div className="border-t border-border-subtle px-2 py-2 flex items-center gap-1">
        <button
          onClick={() => nav(onOpenSettings)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          <SettingsIcon size={14} />
          <span>Settings</span>
        </button>
        <div className="flex-1" />
        <button
          onClick={() => nav(() => { onShowArchive(!showArchive); onShowTrash(false); onFolderSelect(undefined); onTagSelect(undefined); })}
          className={cn(
            'flex items-center gap-1 px-1.5 py-1 rounded-lg text-xs transition-colors',
            showArchive ? 'bg-bg-active text-purple' : 'text-text-muted hover:bg-bg-hover hover:text-text-primary'
          )}
          title="Archive"
          aria-label="Archive"
        >
          <Archive size={14} />
          {noteCounts.archived > 0 && (
            <span className="font-mono text-[10px]">{noteCounts.archived}</span>
          )}
        </button>
        <button
          onClick={() => nav(() => { onShowTrash(!showTrash); onShowArchive(false); onFolderSelect(undefined); onTagSelect(undefined); })}
          className={cn(
            'flex items-center gap-1 px-1.5 py-1 rounded-lg text-xs transition-colors',
            showTrash ? 'bg-bg-active text-purple' : 'text-text-muted hover:bg-bg-hover hover:text-text-primary'
          )}
          title="Trash"
          aria-label="Trash"
        >
          <Trash2 size={14} />
          {noteCounts.trashed > 0 && (
            <span className="font-mono text-[10px]">{noteCounts.trashed}</span>
          )}
        </button>
      </div>

      {/* Mobile-only links */}
      <div className="md:hidden border-t border-border-subtle px-2 py-2 space-y-0.5">
        <a
          href="https://github.com/peterhanily/threatcaddy"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          <Github size={16} />
          <span>GitHub</span>
        </a>
        <a
          href="./threatcaddy-standalone.html"
          download
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          <Download size={16} />
          <span>Download Standalone</span>
        </a>
        <a
          href="https://github.com/peterhanily/threatcaddy/tree/main/extension#readme"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          <Chrome size={16} />
          <span>Extension</span>
        </a>
      </div>

      {/* Dialogs */}
      <Modal
        open={deletingFolderId !== null}
        onClose={() => setDeletingFolderId(null)}
        title="Delete Investigation"
      >
        <p className="text-sm text-text-secondary mb-4">What should happen to the items inside this investigation?</p>
        <div className="space-y-2">
          <button
            className="w-full text-left px-4 py-3 rounded-lg bg-bg-raised hover:bg-bg-hover transition-colors"
            onClick={() => { if (deletingFolderId) { onDeleteFolder(deletingFolderId); setDeletingFolderId(null); } }}
          >
            <div className="text-sm font-medium text-text-primary">Remove folder only</div>
            <div className="text-xs text-text-secondary mt-0.5">Items move back to All Items</div>
          </button>
          <button
            className="w-full text-left px-4 py-3 rounded-lg bg-red-600/15 hover:bg-red-600/25 transition-colors"
            onClick={() => { if (deletingFolderId) { onTrashFolderContents(deletingFolderId); setDeletingFolderId(null); } }}
          >
            <div className="text-sm font-medium text-red-400">Trash all items</div>
            <div className="text-xs text-red-400/70 mt-0.5">Items go to trash (auto-deleted after 30 days)</div>
          </button>
        </div>
        <div className="flex justify-end mt-4">
          <button
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
            onClick={() => setDeletingFolderId(null)}
          >
            Cancel
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deletingTimelineId !== null}
        onClose={() => setDeletingTimelineId(null)}
        onConfirm={() => { if (deletingTimelineId) { onDeleteTimeline?.(deletingTimelineId); setDeletingTimelineId(null); } }}
        title="Delete Timeline"
        message="This timeline and all its events will be permanently deleted. This cannot be undone."
        confirmLabel="Delete Timeline"
        danger
      />

      <ConfirmDialog
        open={deletingWhiteboardId !== null}
        onClose={() => setDeletingWhiteboardId(null)}
        onConfirm={() => { if (deletingWhiteboardId) { onDeleteWhiteboard?.(deletingWhiteboardId); setDeletingWhiteboardId(null); } }}
        title="Delete Whiteboard"
        message="This whiteboard will be permanently deleted. This cannot be undone."
        confirmLabel="Delete Whiteboard"
        danger
      />

      <ConfirmDialog
        open={deletingTagId !== null}
        onClose={() => setDeletingTagId(null)}
        onConfirm={() => { if (deletingTagId) { onDeleteTag?.(deletingTagId); setDeletingTagId(null); } }}
        title="Delete Tag"
        message="This tag will be removed from all notes, tasks, timeline events, and whiteboards."
        confirmLabel="Delete Tag"
        danger
      />

      <OperationNameGenerator
        open={showNameGenerator}
        onClose={() => setShowNameGenerator(false)}
        onCreateInvestigation={(name) => { onCreateFolder(name); setShowNameGenerator(false); }}
      />
    </aside>
  );
}

/* ─── NavItem: flat nav item with accent glow bar ─── */
const NavItem = React.memo(function NavItem({
  icon,
  label,
  badge,
  badgeColor,
  active,
  onClick,
  onDoubleClick,
  actions,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  badgeColor?: string;
  active?: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={cn(
        'flex items-center w-full rounded-lg transition-colors group cursor-pointer relative',
        compact ? 'gap-1.5 px-2 py-0.5 text-xs' : 'gap-2 px-3 py-1.5 text-[13px] font-medium',
        active
          ? 'bg-bg-active text-text-primary'
          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
      )}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-purple"
          style={{ boxShadow: '0 0 8px 1px var(--color-purple)' }}
        />
      )}
      {icon}
      <span className="truncate flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'font-mono text-[10px] px-1.5 py-0 rounded-full',
          badgeColor || 'bg-bg-raised text-text-muted'
        )}>
          {badge > 999 ? '999+' : badge}
        </span>
      )}
      {actions}
    </div>
  );
});

/* ─── InvestigationListItem: compact item for the investigations dropdown ─── */
const InvestigationListItem = React.memo(function InvestigationListItem({
  folder,
  active,
  onClick,
  onDoubleClick,
  onInfo,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  folder: Folder;
  active?: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  onInfo?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete: () => void;
}) {
  const status = folder.status || 'active';
  const statusColor = status === 'active'
    ? 'bg-accent-green'
    : status === 'archived'
      ? 'bg-accent-amber'
      : 'bg-text-muted';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={cn(
        'flex items-center gap-2 w-full rounded-lg px-2 py-1 cursor-pointer transition-colors group',
        active
          ? 'bg-bg-active text-text-primary'
          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusColor)} />
      <span className="truncate flex-1 text-left text-[12px]">{folder.name}</span>
      <span className="font-mono text-[10px] text-text-muted shrink-0">
        {formatDate(folder.createdAt)}
      </span>
      <span className="flex items-center gap-px shrink-0">
        {onInfo && (
          <button
            onClick={(e) => { e.stopPropagation(); onInfo(); }}
            className="opacity-0 group-hover:opacity-100 p-px rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-all"
            aria-label={`Edit investigation ${folder.name}`}
            title="Edit investigation"
          >
            <Info size={10} />
          </button>
        )}
        {onArchive && (
          <button
            onClick={(e) => { e.stopPropagation(); onArchive(); }}
            className="opacity-0 group-hover:opacity-100 p-px rounded hover:bg-bg-hover text-text-muted hover:text-amber-400 transition-all"
            aria-label={`Archive investigation ${folder.name}`}
            title="Archive investigation"
          >
            <Archive size={10} />
          </button>
        )}
        {onUnarchive && (
          <button
            onClick={(e) => { e.stopPropagation(); onUnarchive(); }}
            className="opacity-0 group-hover:opacity-100 p-px rounded hover:bg-bg-hover text-text-muted hover:text-green-400 transition-all"
            aria-label={`Unarchive investigation ${folder.name}`}
            title="Unarchive investigation"
          >
            <RotateCcw size={10} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-px rounded hover:bg-bg-hover text-text-muted hover:text-red-400 transition-all"
          aria-label={`Delete investigation ${folder.name}`}
          title="Delete investigation"
        >
          <X size={10} />
        </button>
      </span>
    </div>
  );
});

/* ─── CollapsedIcon: icon button for collapsed sidebar rail ─── */
const CollapsedIcon = React.memo(function CollapsedIcon({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
  dataTour,
}: {
  icon: typeof FileText;
  label: string;
  active?: boolean;
  badge?: number;
  onClick: () => void;
  dataTour?: string;
}) {
  return (
    <div className="group relative" {...(dataTour ? { 'data-tour': dataTour } : {})}>
      <button
        onClick={onClick}
        className={cn(
          'w-9 h-9 flex items-center justify-center rounded-lg transition-colors relative',
          active
            ? 'bg-bg-active text-purple'
            : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
        )}
        aria-label={label}
      >
        {active && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-purple"
            style={{ boxShadow: '0 0 8px 1px var(--color-purple)' }}
          />
        )}
        <Icon size={18} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-purple/80 text-[9px] font-medium text-white flex items-center justify-center px-1 leading-none">
            {badge > 999 ? '999+' : badge}
          </span>
        )}
      </button>
      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded bg-bg-raised border border-border-medium text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
        {label}
      </div>
    </div>
  );
});
