import { describe, it, expect } from 'vitest';
import { formatIOCsJSON, formatIOCsCSV, slugify } from '../lib/ioc-export';
import type { IOCExportEntry } from '../lib/ioc-export';
import type { IOCEntry } from '../types';

function makeIOC(overrides: Partial<IOCEntry> = {}): IOCEntry {
  return {
    id: 'ioc-1',
    type: 'ipv4',
    value: '192.168.1.1',
    confidence: 'high',
    firstSeen: new Date('2024-06-01T00:00:00Z').getTime(),
    dismissed: false,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<IOCExportEntry> & { iocs?: IOCEntry[] } = {}): IOCExportEntry {
  return {
    clipTitle: 'Test Clip',
    sourceUrl: 'https://example.com',
    iocs: [makeIOC()],
    ...overrides,
  };
}

describe('formatIOCsJSON', () => {
  it('produces correct structure with metadata', () => {
    const result = JSON.parse(formatIOCsJSON([makeEntry()]));
    expect(result).toHaveProperty('exportedAt');
    expect(result.totalIOCs).toBe(1);
    expect(result.clips).toHaveLength(1);
    expect(result.clips[0].clipTitle).toBe('Test Clip');
    expect(result.clips[0].sourceUrl).toBe('https://example.com');
  });

  it('aggregates multiple clips', () => {
    const entries = [
      makeEntry({ clipTitle: 'Clip A', iocs: [makeIOC(), makeIOC({ id: 'ioc-2', value: '10.0.0.1' })] }),
      makeEntry({ clipTitle: 'Clip B', iocs: [makeIOC({ id: 'ioc-3', type: 'domain', value: 'evil.com' })] }),
    ];
    const result = JSON.parse(formatIOCsJSON(entries));
    expect(result.totalIOCs).toBe(3);
    expect(result.clips).toHaveLength(2);
  });

  it('skips dismissed IOCs', () => {
    const entries = [
      makeEntry({
        iocs: [
          makeIOC({ dismissed: false }),
          makeIOC({ id: 'ioc-2', value: '10.0.0.2', dismissed: true }),
        ],
      }),
    ];
    const result = JSON.parse(formatIOCsJSON(entries));
    expect(result.totalIOCs).toBe(1);
    expect(result.clips[0].iocs).toHaveLength(1);
  });

  it('omits the internal id field', () => {
    const result = JSON.parse(formatIOCsJSON([makeEntry()]));
    expect(result.clips[0].iocs[0]).not.toHaveProperty('id');
  });

  it('handles empty IOC arrays', () => {
    const result = JSON.parse(formatIOCsJSON([makeEntry({ iocs: [] })]));
    expect(result.totalIOCs).toBe(0);
    expect(result.clips[0].iocs).toEqual([]);
  });

  it('handles empty entries array', () => {
    const result = JSON.parse(formatIOCsJSON([]));
    expect(result.totalIOCs).toBe(0);
    expect(result.clips).toEqual([]);
  });
});

describe('formatIOCsCSV', () => {
  it('has correct header row', () => {
    const csv = formatIOCsCSV([makeEntry()]);
    const header = csv.split('\n')[0];
    expect(header).toBe('type,value,confidence,analystNotes,attribution,firstSeen,dismissed,clipTitle,sourceUrl');
  });

  it('produces one data row per active IOC', () => {
    const csv = formatIOCsCSV([
      makeEntry({ iocs: [makeIOC(), makeIOC({ id: 'ioc-2', value: '10.0.0.1' })] }),
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 data rows
  });

  it('escapes commas in field values', () => {
    const csv = formatIOCsCSV([
      makeEntry({ iocs: [makeIOC({ analystNotes: 'note with, comma' })] }),
    ]);
    expect(csv).toContain('"note with, comma"');
  });

  it('escapes quotes in field values', () => {
    const csv = formatIOCsCSV([
      makeEntry({ iocs: [makeIOC({ analystNotes: 'has "quotes"' })] }),
    ]);
    expect(csv).toContain('"has ""quotes"""');
  });

  it('escapes newlines in field values', () => {
    const csv = formatIOCsCSV([
      makeEntry({ iocs: [makeIOC({ analystNotes: 'line1\nline2' })] }),
    ]);
    expect(csv).toContain('"line1\nline2"');
  });

  it('skips dismissed IOCs', () => {
    const csv = formatIOCsCSV([
      makeEntry({
        iocs: [
          makeIOC({ dismissed: false }),
          makeIOC({ id: 'ioc-2', value: '10.0.0.2', dismissed: true }),
        ],
      }),
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2); // header + 1 data row
  });

  it('handles multi-clip output', () => {
    const csv = formatIOCsCSV([
      makeEntry({ clipTitle: 'Clip A' }),
      makeEntry({ clipTitle: 'Clip B', iocs: [makeIOC({ id: 'ioc-2', type: 'domain', value: 'evil.com' })] }),
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toContain('Clip A');
    expect(lines[2]).toContain('Clip B');
  });

  it('handles empty IOC arrays', () => {
    const csv = formatIOCsCSV([makeEntry({ iocs: [] })]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // header only
  });
});

describe('slugify', () => {
  it('converts to lowercase kebab-case', () => {
    expect(slugify('My Threat Report')).toBe('my-threat-report');
  });

  it('strips special characters', () => {
    expect(slugify('Report: APT29 (2024)')).toBe('report-apt29-2024');
  });

  it('truncates long strings', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(50);
  });
});
