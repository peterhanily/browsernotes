import type { IOCEntry } from '../types';

export interface IOCExportEntry {
  clipTitle: string;
  sourceUrl?: string;
  iocs: IOCEntry[];
}

interface ExportedIOC {
  type: string;
  value: string;
  confidence: string;
  analystNotes?: string;
  attribution?: string;
  firstSeen: number;
  dismissed: boolean;
}

function toExportedIOC(ioc: IOCEntry): ExportedIOC {
  return {
    type: ioc.type,
    value: ioc.value,
    confidence: ioc.confidence,
    analystNotes: ioc.analystNotes,
    attribution: ioc.attribution,
    firstSeen: ioc.firstSeen,
    dismissed: ioc.dismissed,
  };
}

function filterActive(entries: IOCExportEntry[]): IOCExportEntry[] {
  return entries.map((e) => ({
    ...e,
    iocs: e.iocs.filter((ioc) => !ioc.dismissed),
  }));
}

export function formatIOCsJSON(entries: IOCExportEntry[]): string {
  const active = filterActive(entries);
  const totalIOCs = active.reduce((sum, e) => sum + e.iocs.length, 0);

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      totalIOCs,
      clips: active.map((e) => ({
        clipTitle: e.clipTitle,
        sourceUrl: e.sourceUrl,
        iocs: e.iocs.map(toExportedIOC),
      })),
    },
    null,
    2,
  );
}

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

const CSV_HEADERS = ['type', 'value', 'confidence', 'analystNotes', 'attribution', 'firstSeen', 'dismissed', 'clipTitle', 'sourceUrl'];

export function formatIOCsCSV(entries: IOCExportEntry[]): string {
  const active = filterActive(entries);
  const rows: string[] = [CSV_HEADERS.join(',')];

  for (const entry of active) {
    for (const ioc of entry.iocs) {
      const row = [
        escapeCSVField(ioc.type),
        escapeCSVField(ioc.value),
        escapeCSVField(ioc.confidence),
        escapeCSVField(ioc.analystNotes || ''),
        escapeCSVField(ioc.attribution || ''),
        escapeCSVField(new Date(ioc.firstSeen).toISOString()),
        escapeCSVField(String(ioc.dismissed)),
        escapeCSVField(entry.clipTitle),
        escapeCSVField(entry.sourceUrl || ''),
      ];
      rows.push(row.join(','));
    }
  }

  return rows.join('\n');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}
