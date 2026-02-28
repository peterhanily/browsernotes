import React from 'react';
import {
  FileText, ListChecks, Clock, PenTool, Activity, Network, Search,
  LayoutDashboard, Archive, Trash2, Settings as SettingsIcon, PanelLeftClose, PanelLeft,
} from 'lucide-react';
import type { ViewMode } from '../../types';
import { cn } from '../../lib/utils';

interface IconRailProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  counts: { notes: number; tasks: number; events: number; whiteboards: number; iocs: number; archived: number; trashed: number };
  showArchive: boolean;
  onShowArchive: (show: boolean) => void;
  showTrash: boolean;
  onShowTrash: (show: boolean) => void;
  onOpenSettings: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onNavigate?: () => void;
  selectedFolderId?: string;
  onClearFilters?: () => void;
}

const viewItems: { view: ViewMode; icon: typeof FileText; label: string; countKey?: keyof IconRailProps['counts']; dataTour?: string }[] = [
  { view: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { view: 'notes', icon: FileText, label: 'Notes', countKey: 'notes' },
  { view: 'tasks', icon: ListChecks, label: 'Tasks', countKey: 'tasks', dataTour: 'tasks' },
  { view: 'timeline', icon: Clock, label: 'Timeline', countKey: 'events', dataTour: 'timeline' },
  { view: 'graph', icon: Network, label: 'Graph' },
  { view: 'ioc-stats', icon: Search, label: 'IOC Stats', countKey: 'iocs' },
  { view: 'whiteboard', icon: PenTool, label: 'Whiteboards', countKey: 'whiteboards', dataTour: 'whiteboards' },
  { view: 'activity', icon: Activity, label: 'Activity', dataTour: 'activity' },
];

function formatBadge(n: number): string {
  return n > 999 ? '999+' : String(n);
}

const RailIcon = React.memo(function RailIcon({
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
          'w-10 h-10 flex items-center justify-center rounded-lg transition-colors relative',
          active
            ? 'bg-accent/15 text-accent border-l-2 border-accent -ml-px'
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        )}
        aria-label={label}
        title={label}
      >
        <Icon size={18} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-accent/80 text-[9px] font-medium text-white flex items-center justify-center px-1 leading-none">
            {formatBadge(badge)}
          </span>
        )}
      </button>
      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded bg-gray-900 border border-gray-700 text-xs text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
        {label}
      </div>
    </div>
  );
});

export function IconRail({
  activeView,
  onViewChange,
  counts,
  showArchive,
  onShowArchive,
  showTrash,
  onShowTrash,
  onOpenSettings,
  panelOpen,
  onTogglePanel,
  onNavigate,
  selectedFolderId,
  onClearFilters,
}: IconRailProps) {
  const clearFilters = () => {
    onClearFilters?.();
  };

  const navToView = (view: ViewMode) => {
    onViewChange(view);
    if (!selectedFolderId) clearFilters();
  };

  const nav = (fn: () => void) => {
    fn();
    onNavigate?.();
  };

  return (
    <div
      className="w-[52px] border-r border-gray-800 bg-gray-900/70 flex flex-col items-center py-2 gap-1 shrink-0 h-full overflow-y-auto"
      role="navigation"
      aria-label="Main navigation"
      data-tour="sidebar-nav"
    >
      {/* View icons */}
      {viewItems.map((item) => (
        <RailIcon
          key={item.view}
          icon={item.icon}
          label={item.label}
          active={activeView === item.view && !showTrash && !showArchive}
          badge={item.countKey ? counts[item.countKey] : undefined}
          onClick={() => nav(() => navToView(item.view))}
          dataTour={item.dataTour}
        />
      ))}

      {/* Spacer + divider */}
      <div className="flex-1" />
      <div className="w-6 border-t border-gray-700 my-1" />

      {/* Bottom section */}
      <RailIcon
        icon={Archive}
        label="Archive"
        active={showArchive}
        badge={counts.archived}
        onClick={() => nav(() => { onShowArchive(!showArchive); onShowTrash(false); onClearFilters?.(); })}
      />
      <RailIcon
        icon={Trash2}
        label="Trash"
        active={showTrash}
        badge={counts.trashed}
        onClick={() => nav(() => { onShowTrash(!showTrash); onShowArchive(false); onClearFilters?.(); })}
      />
      <RailIcon
        icon={SettingsIcon}
        label="Settings"
        onClick={() => nav(onOpenSettings)}
      />
      <div className="mt-1">
        <RailIcon
          icon={panelOpen ? PanelLeftClose : PanelLeft}
          label={panelOpen ? 'Close panel' : 'Open panel'}
          onClick={onTogglePanel}
        />
      </div>
    </div>
  );
}
