import type { ViewMode } from '../../types';

export interface TourHighlight {
  target: string;              // CSS selector
  label?: string;              // Compact label shown near the spotlight
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  /** View that should be active when this step is shown. */
  view?: ViewMode;
  /** When true the tour will auto-open the Settings panel so the target element is mounted. */
  showSettings?: boolean;
  /** Additional elements to spotlight with labels. */
  highlights?: TourHighlight[];
}

export const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="header"]',
    title: 'Welcome to ThreatCaddy',
    description: 'Your private threat investigation workspace. Notes, IOCs, timelines, and graphs — all stored locally in your browser. Use the sidebar to switch between views and manage investigations.',
    placement: 'bottom',
    view: 'notes',
  },
  {
    id: 'dashboard',
    target: '[data-tour="dashboard"]',
    title: 'Dashboard',
    description: 'Your home base. Quick-link tiles for VirusTotal, Shodan, MITRE ATT&CK, and more — fully customizable. See investigation summaries and jump straight into your work.',
    placement: 'right',
    view: 'dashboard',
    highlights: [
      { target: '[data-tour="quick-links"]', label: 'Quick Links', placement: 'bottom' },
    ],
  },
  {
    id: 'search-create',
    target: '[data-tour="search"]',
    title: 'Search & Create',
    description: 'Press Ctrl+K to search across notes, tasks, timeline events, and whiteboards. Use the "+ New" dropdown to create notes, tasks, events, whiteboards, standalone IOCs, or import data from CSV/JSON.',
    placement: 'bottom',
    highlights: [
      { target: '[data-tour="new-note"]', label: '+ New', placement: 'bottom' },
    ],
  },
  {
    id: 'investigations',
    target: '[data-tour="tags-folders"]',
    title: 'Investigations & Tags',
    description: 'Organize work with investigations and color-coded tags. Investigations support status tracking, TLP/PAP classification, and JSON export. Archive or trash any entity — trashed items auto-purge after 30 days.',
    placement: 'right',
    view: 'notes',
  },
  {
    id: 'notes-editor',
    target: '[data-tour="notes-editor"]',
    title: 'Notes & Editor',
    description: 'Write in markdown with live preview, syntax highlighting, and slash commands. Use [[ThreatCaddyLinks]] to cross-reference notes. Annotate with timestamps and defang IOCs for safe sharing.',
    placement: 'bottom',
    view: 'notes',
  },
  {
    id: 'tasks',
    target: '[data-tour="tasks"]',
    title: 'Task Management',
    description: 'Track tasks with priorities, due dates, and a Kanban board. Drag and drop between columns in board view.',
    placement: 'right',
  },
  {
    id: 'timeline',
    target: '[data-tour="timeline"]',
    title: 'Timeline & Map',
    description: 'Build incident timelines with typed events, MITRE ATT&CK mappings, and IOC linking. Visualize with the Gantt chart and geo-map. Import bulk events from SIEM exports via New → Import Data.',
    placement: 'right',
  },
  {
    id: 'graph',
    target: '[data-tour="graph-canvas"]',
    title: 'Entity Graph',
    description: 'Visualize IOCs, notes, tasks, and timeline events as an interactive graph. Filter by node and edge types, search nodes, and choose layouts. Hold Alt and drag between nodes to create links.',
    placement: 'bottom',
    view: 'graph',
  },
  {
    id: 'ioc-stats',
    target: '[data-tour="ioc-stats-header"]',
    title: 'IOC Intelligence',
    description: 'Aggregate IOC statistics across your database — type and confidence distribution, top actors, IOC timeline, and frequency tables. Create and manage standalone IOCs from the "+ New" dropdown or the IOC list below the charts.',
    placement: 'bottom',
    view: 'ioc-stats',
  },
  {
    id: 'chat',
    target: '[data-tour="chat"]',
    title: 'AI Chat',
    description: 'Chat with AI models (Claude, GPT-4o, Gemini, Mistral, or local LLMs). The assistant can search your notes, create entities, extract IOCs, and fetch URLs using tool calling.',
    placement: 'right',
  },
  {
    id: 'whiteboards',
    target: '[data-tour="whiteboards"]',
    title: 'Whiteboards',
    description: 'Sketch diagrams and visualize ideas with the built-in whiteboard powered by Excalidraw. Fully offline.',
    placement: 'right',
    view: 'notes',
  },
  {
    id: 'activity',
    target: '[data-tour="activity"]',
    title: 'Activity Log',
    description: 'Track every action in your workspace — note edits, task updates, IOC pushes, and more. Filter by category and search the audit trail.',
    placement: 'right',
    view: 'notes',
  },
  {
    id: 'feed',
    target: '[data-tour="feed"]',
    title: 'Team Feed',
    description: 'Team feed for sharing updates, tagging colleagues, and reacting to posts. Requires a connected team server.',
    placement: 'right',
  },
  {
    id: 'toolbar',
    target: '[data-tour="screenshare"]',
    title: 'Toolbar & Security',
    description: 'Assign TLP/PAP classification and enable screenshare mode to hide sensitive items. Save/load JSON backups, toggle dark/light theme, use keyboard shortcuts (Ctrl+K, Ctrl+N, Ctrl+S, Ctrl+1-7), download the standalone HTML, or install the browser extension.',
    placement: 'bottom',
    highlights: [
      { target: '[data-tour="backup"]', label: 'Backup', placement: 'bottom' },
      { target: '[data-tour="extension"]', label: 'Extension', placement: 'bottom' },
      { target: '[data-tour="theme-toggle"]', label: 'Theme', placement: 'bottom' },
    ],
  },
  {
    id: 'demo-data',
    target: '[data-tour="load-sample"]',
    title: 'Sample Investigation',
    description: 'Load Operation FERMENTED PERSISTENCE, a full-scale OpenSlaw.ai compromise investigation with geolocated events, IOC relationship graphs, analysis notes, timeline events, and an attack flow whiteboard.',
    placement: 'bottom',
    showSettings: true,
  },
  {
    id: 'finish',
    target: '[data-tour="header"]',
    title: "You're All Set",
    description: 'You now know the essentials. Press Ctrl+K anytime to search, or revisit this tour from the header menu. Happy investigating!',
    placement: 'bottom',
  },
];
