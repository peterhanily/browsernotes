import type { ViewMode } from '../../types';

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
    id: 'search-create',
    target: '[data-tour="search"]',
    title: 'Search & Create',
    description: 'Press Ctrl+K to search across notes, tasks, timeline events, and whiteboards. Use the "+ New" dropdown to create notes, tasks, events, whiteboards, or standalone IOCs.',
    placement: 'bottom',
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
    id: 'tasks',
    target: '[data-tour="tasks"]',
    title: 'Task Management',
    description: 'Track tasks with priorities, due dates, and a Kanban board. Drag and drop between columns in board view.',
    placement: 'right',
  },
  {
    id: 'timeline',
    target: '[data-tour="timeline"]',
    title: 'Timeline',
    description: 'Build incident timelines with typed events, MITRE ATT&CK mappings, and IOC linking. Visualize with the Gantt chart.',
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
    id: 'toolbar',
    target: '[data-tour="screenshare"]',
    title: 'Toolbar & Extras',
    description: 'Assign TLP/PAP classification and enable screenshare mode to hide sensitive items. Save/load JSON backups, toggle dark/light theme, use keyboard shortcuts (Ctrl+K, Ctrl+N, Ctrl+S, Ctrl+1-7), download the standalone HTML, or install the browser extension.',
    placement: 'bottom',
  },
  {
    id: 'demo-data',
    target: '[data-tour="load-sample"]',
    title: 'Sample Investigation',
    description: 'Load Operation DARK GLACIER, a full-scale breach investigation with geolocated events, IOC relationship graphs, 12 analysis notes, and 20 timeline events. Explore every ThreatCaddy feature. Delete it when done.',
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
