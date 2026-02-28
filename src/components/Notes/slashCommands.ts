import type { LucideIcon } from 'lucide-react';
import {
  Heading1, Heading2, Heading3, Bold, Italic, Strikethrough, Code, Link, Link2,
  List, ListOrdered, ListChecks, Quote, FileCode, Minus, Table,
  Shield, Target, Lock, Clock, Calendar, CalendarClock, MessageSquare,
} from 'lucide-react';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  category: 'Formatting' | 'Blocks' | 'Threat Intel' | 'Insert';
  icon: LucideIcon;
  keywords: string[];
  insert: string;
  cursorOffset?: number;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // Formatting
  { id: 'h1', label: 'Heading 1', description: 'Large heading', category: 'Formatting', icon: Heading1, keywords: ['title', 'header'], insert: '# ' },
  { id: 'h2', label: 'Heading 2', description: 'Medium heading', category: 'Formatting', icon: Heading2, keywords: ['subtitle', 'header'], insert: '## ' },
  { id: 'h3', label: 'Heading 3', description: 'Small heading', category: 'Formatting', icon: Heading3, keywords: ['header'], insert: '### ' },
  { id: 'bold', label: 'Bold', description: 'Bold text', category: 'Formatting', icon: Bold, keywords: ['strong'], insert: '**text**', cursorOffset: -2 },
  { id: 'italic', label: 'Italic', description: 'Italic text', category: 'Formatting', icon: Italic, keywords: ['emphasis', 'em'], insert: '_text_', cursorOffset: -1 },
  { id: 'strikethrough', label: 'Strikethrough', description: 'Crossed out text', category: 'Formatting', icon: Strikethrough, keywords: ['strike', 'del'], insert: '~~text~~', cursorOffset: -2 },
  { id: 'code-inline', label: 'Code', description: 'Inline code', category: 'Formatting', icon: Code, keywords: ['mono', 'inline'], insert: '`code`', cursorOffset: -1 },
  { id: 'link', label: 'Link', description: 'Hyperlink', category: 'Formatting', icon: Link, keywords: ['url', 'href', 'anchor'], insert: '[text](url)', cursorOffset: -6 },
  { id: 'tclink', label: 'ThreatCaddyLink', description: 'Link to another note', category: 'Formatting', icon: Link2, keywords: ['internal', 'note', 'wikilink', 'backlink', 'threatcaddy', 'tclink'], insert: '[[]]', cursorOffset: -2 },

  // Blocks
  { id: 'bullet', label: 'Bullet list', description: 'Unordered list', category: 'Blocks', icon: List, keywords: ['ul', 'unordered'], insert: '- ' },
  { id: 'numbered', label: 'Numbered list', description: 'Ordered list', category: 'Blocks', icon: ListOrdered, keywords: ['ol', 'ordered'], insert: '1. ' },
  { id: 'task', label: 'Task list', description: 'Checkbox list', category: 'Blocks', icon: ListChecks, keywords: ['checkbox', 'todo'], insert: '- [ ] ' },
  { id: 'quote', label: 'Blockquote', description: 'Quoted text', category: 'Blocks', icon: Quote, keywords: ['blockquote', 'citation'], insert: '> ' },
  { id: 'code-block', label: 'Code block', description: 'Fenced code block', category: 'Blocks', icon: FileCode, keywords: ['fence', 'pre'], insert: '```\n\n```', cursorOffset: -4 },
  { id: 'hr', label: 'Horizontal rule', description: 'Divider line', category: 'Blocks', icon: Minus, keywords: ['divider', 'separator'], insert: '---\n' },
  { id: 'table', label: 'Table', description: '3-column table', category: 'Blocks', icon: Table, keywords: ['grid', 'columns'], insert: '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| | | |\n', cursorOffset: -7 },

  // Threat Intel
  { id: 'ioc-table', label: 'IOC Table', description: 'Type / Value / Context table', category: 'Threat Intel', icon: Shield, keywords: ['indicator', 'compromise', 'ioc'], insert: '| Type | Value | Context |\n| --- | --- | --- |\n| | | |\n', cursorOffset: -7 },
  { id: 'mitre', label: 'MITRE Reference', description: 'ATT&CK technique ID', category: 'Threat Intel', icon: Target, keywords: ['attack', 'technique', 'tactic'], insert: '**MITRE ATT&CK:** T____', cursorOffset: -4 },
  { id: 'tlp', label: 'TLP Header', description: 'Traffic Light Protocol', category: 'Threat Intel', icon: Lock, keywords: ['traffic', 'classification', 'amber', 'red', 'green'], insert: '**TLP:AMBER**' },
  { id: 'timeline-entry', label: 'Timeline Entry', description: 'Timestamped event', category: 'Threat Intel', icon: Clock, keywords: ['event', 'timestamp', 'incident'], insert: '**[YYYY-MM-DD HH:MM UTC]** — ' },

  // Insert
  { id: 'date', label: 'Current date', description: 'Insert today\'s date', category: 'Insert', icon: Calendar, keywords: ['today', 'now'], insert: '__DATE__' },
  { id: 'datetime', label: 'Current datetime', description: 'Insert date and time', category: 'Insert', icon: CalendarClock, keywords: ['now', 'timestamp'], insert: '__DATETIME__' },
  { id: 'callout', label: 'Callout', description: 'Note admonition', category: 'Insert', icon: MessageSquare, keywords: ['admonition', 'warning', 'info', 'note'], insert: '> **Note:** ' },
];

/** Compute pixel coordinates of a caret position inside a textarea using the mirror-div technique. */
export function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number): { top: number; left: number } {
  const div = document.createElement('div');
  const style = window.getComputedStyle(textarea);

  const props = [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'textTransform',
    'wordSpacing', 'textIndent', 'lineHeight', 'padding', 'paddingTop', 'paddingRight',
    'paddingBottom', 'paddingLeft', 'borderWidth', 'borderTopWidth', 'borderRightWidth',
    'borderBottomWidth', 'borderLeftWidth', 'boxSizing', 'width', 'wordWrap', 'overflowWrap',
    'whiteSpace', 'tabSize',
  ] as const;

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.overflow = 'hidden';
  div.style.height = 'auto';

  for (const prop of props) {
    (div.style as unknown as Record<string, string>)[prop] = style.getPropertyValue(
      prop.replace(/([A-Z])/g, '-$1').toLowerCase()
    );
  }

  const text = textarea.value.substring(0, position);
  div.textContent = text;

  const span = document.createElement('span');
  span.textContent = textarea.value.substring(position) || '.';
  div.appendChild(span);

  document.body.appendChild(div);

  const top = span.offsetTop - textarea.scrollTop;
  const left = span.offsetLeft;

  document.body.removeChild(div);

  return { top, left };
}
