import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatIOCsJSON, formatIOCsCSV, formatIOCsFlatJSON, formatIOCsFlatCSV, slugify } from '../lib/ioc-export';
import type { IOCExportEntry, ThreatIntelExportConfig } from '../lib/ioc-export';
import type { IOCEntry } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────

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

const FROZEN_NOW = '2024-03-01T00:00:00.000Z';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FROZEN_NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

// ── formatIOCsJSON ──────────────────────────────────────────────────

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

  it('exportedAt is a valid ISO timestamp', () => {
    const result = JSON.parse(formatIOCsJSON([makeEntry()]));
    expect(result.exportedAt).toBe(FROZEN_NOW);
  });

  it('output is valid JSON', () => {
    expect(() => JSON.parse(formatIOCsJSON([makeEntry()]))).not.toThrow();
  });

  it('resolves clsLevel from entityClsLevel when IOC has none', () => {
    const entries = [makeEntry({ entityClsLevel: 'TLP:GREEN', iocs: [makeIOC()] })];
    const result = JSON.parse(formatIOCsJSON(entries));
    expect(result.clips[0].iocs[0].clsLevel).toBe('TLP:GREEN');
  });

  it('IOC clsLevel takes priority over entityClsLevel', () => {
    const entries = [makeEntry({ entityClsLevel: 'TLP:GREEN', iocs: [makeIOC({ clsLevel: 'TLP:RED' })] })];
    const result = JSON.parse(formatIOCsJSON(entries));
    expect(result.clips[0].iocs[0].clsLevel).toBe('TLP:RED');
  });

  it('preserves all exported IOC fields', () => {
    const entries = [makeEntry({
      iocs: [makeIOC({
        type: 'domain',
        value: 'evil.com',
        confidence: 'confirmed',
        analystNotes: 'C2 server',
        attribution: 'APT29',
        firstSeen: 1709251200000,
      })],
    })];
    const result = JSON.parse(formatIOCsJSON(entries));
    const ioc = result.clips[0].iocs[0];
    expect(ioc.type).toBe('domain');
    expect(ioc.value).toBe('evil.com');
    expect(ioc.confidence).toBe('confirmed');
    expect(ioc.analystNotes).toBe('C2 server');
    expect(ioc.attribution).toBe('APT29');
    expect(ioc.firstSeen).toBe(1709251200000);
    expect(ioc.dismissed).toBe(false);
  });
});

// ── formatIOCsCSV ───────────────────────────────────────────────────

describe('formatIOCsCSV', () => {
  it('has correct header row', () => {
    const csv = formatIOCsCSV([makeEntry()]);
    const header = csv.split('\n')[0];
    expect(header).toBe('type,value,confidence,analystNotes,attribution,firstSeen,dismissed,clsLevel,clipTitle,sourceUrl');
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

  it('escapes carriage returns in field values', () => {
    const csv = formatIOCsCSV([
      makeEntry({ iocs: [makeIOC({ analystNotes: 'line1\rline2' })] }),
    ]);
    expect(csv).toContain('"line1\rline2"');
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

  it('handles empty entries array', () => {
    const csv = formatIOCsCSV([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // header only
  });

  it('formats firstSeen as ISO string', () => {
    const csv = formatIOCsCSV([makeEntry({ iocs: [makeIOC({ firstSeen: 1709251200000 })] })]);
    expect(csv).toContain('2024-03-01T00:00:00.000Z');
  });

  it('uses entityClsLevel when IOC has no clsLevel', () => {
    const csv = formatIOCsCSV([makeEntry({ entityClsLevel: 'TLP:AMBER', iocs: [makeIOC()] })]);
    expect(csv).toContain('TLP:AMBER');
  });

  it('IOC clsLevel takes priority over entityClsLevel', () => {
    const csv = formatIOCsCSV([makeEntry({
      entityClsLevel: 'TLP:GREEN',
      iocs: [makeIOC({ clsLevel: 'TLP:RED' })],
    })]);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('TLP:RED');
    expect(lines[1]).not.toContain('TLP:GREEN');
  });

  it('uses empty string for missing optional fields', () => {
    const csv = formatIOCsCSV([makeEntry({
      sourceUrl: undefined,
      iocs: [makeIOC({ analystNotes: undefined, attribution: undefined })],
    })]);
    const lines = csv.split('\n');
    // Data row should have empty fields (consecutive commas) for missing values
    const fields = lines[1].split(',');
    // analystNotes at index 3, attribution at index 4 should be empty
    expect(fields[3]).toBe('');
    expect(fields[4]).toBe('');
  });

  it('includes all fields in correct order', () => {
    const csv = formatIOCsCSV([makeEntry({
      clipTitle: 'MyClip',
      sourceUrl: 'https://test.com',
      entityClsLevel: 'TLP:GREEN',
      iocs: [makeIOC({
        type: 'domain',
        value: 'evil.com',
        confidence: 'confirmed',
        analystNotes: 'note',
        attribution: 'APT29',
      })],
    })]);
    const lines = csv.split('\n');
    const fields = lines[1].split(',');
    expect(fields[0]).toBe('domain');       // type
    expect(fields[1]).toBe('evil.com');     // value
    expect(fields[2]).toBe('confirmed');    // confidence
    expect(fields[3]).toBe('note');         // analystNotes
    expect(fields[4]).toBe('APT29');        // attribution
    // fields[5] = firstSeen (ISO)
    expect(fields[6]).toBe('false');        // dismissed
    expect(fields[7]).toBe('TLP:GREEN');    // clsLevel
    expect(fields[8]).toBe('MyClip');       // clipTitle
    expect(fields[9]).toBe('https://test.com'); // sourceUrl
  });
});

// ── formatIOCsFlatJSON ──────────────────────────────────────────────

describe('formatIOCsFlatJSON', () => {
  it('produces correct { iocs: [...] } structure', () => {
    const result = JSON.parse(formatIOCsFlatJSON([makeEntry()]));
    expect(result).toHaveProperty('iocs');
    expect(Array.isArray(result.iocs)).toBe(true);
    expect(result.iocs).toHaveLength(1);
  });

  it('assigns sequential IDs across entries', () => {
    const entries = [
      makeEntry({ clipTitle: 'Clip A', iocs: [makeIOC(), makeIOC({ id: 'ioc-2', value: '10.0.0.1' })] }),
      makeEntry({ clipTitle: 'Clip B', iocs: [makeIOC({ id: 'ioc-3', type: 'domain', value: 'evil.com' })] }),
    ];
    const result = JSON.parse(formatIOCsFlatJSON(entries));
    expect(result.iocs.map((i: { id: number }) => i.id)).toEqual([1, 2, 3]);
  });

  it('maps confidence string to numeric value', () => {
    const entries = [
      makeEntry({ iocs: [
        makeIOC({ confidence: 'low' }),
        makeIOC({ id: 'ioc-2', confidence: 'medium' }),
        makeIOC({ id: 'ioc-3', confidence: 'high' }),
        makeIOC({ id: 'ioc-4', confidence: 'confirmed' }),
      ] }),
    ];
    const result = JSON.parse(formatIOCsFlatJSON(entries));
    expect(result.iocs.map((i: { confidence: number }) => i.confidence)).toEqual([1, 2, 3, 5]);
  });

  it('applies default values from config', () => {
    const config: ThreatIntelExportConfig = {
      defaultClsLevel: 'TLP:AMBER',
      defaultReportSource: 'Internal',
    };
    const entries = [makeEntry({ sourceUrl: undefined, iocs: [makeIOC()] })];
    const result = JSON.parse(formatIOCsFlatJSON(entries, config));
    expect(result.iocs[0].cls_level).toBe('TLP:AMBER');
    expect(result.iocs[0].report_source).toBe('Internal');
  });

  it('per-IOC overrides take precedence over defaults', () => {
    const config: ThreatIntelExportConfig = { defaultClsLevel: 'TLP:GREEN' };
    const entries = [makeEntry({ iocs: [makeIOC({ clsLevel: 'TLP:RED' })] })];
    const result = JSON.parse(formatIOCsFlatJSON(entries, config));
    expect(result.iocs[0].cls_level).toBe('TLP:RED');
  });

  it('entityClsLevel takes precedence over config default', () => {
    const config: ThreatIntelExportConfig = { defaultClsLevel: 'TLP:CLEAR' };
    const entries = [makeEntry({ entityClsLevel: 'TLP:AMBER', iocs: [makeIOC()] })];
    const result = JSON.parse(formatIOCsFlatJSON(entries, config));
    expect(result.iocs[0].cls_level).toBe('TLP:AMBER');
  });

  it('formats tags as colon-delimited string', () => {
    const entries = [makeEntry({ tags: ['malware', 'apt', 'phishing'] })];
    const result = JSON.parse(formatIOCsFlatJSON(entries));
    expect(result.iocs[0].tags).toBe('malware:apt:phishing');
  });

  it('uses empty string for no tags', () => {
    const entries = [makeEntry({ tags: undefined })];
    const result = JSON.parse(formatIOCsFlatJSON(entries));
    expect(result.iocs[0].tags).toBe('');
  });

  it('uses empty string for empty tags array', () => {
    const entries = [makeEntry({ tags: [] })];
    const result = JSON.parse(formatIOCsFlatJSON(entries));
    expect(result.iocs[0].tags).toBe('');
  });

  it('filters dismissed IOCs', () => {
    const entries = [
      makeEntry({
        iocs: [
          makeIOC({ dismissed: false }),
          makeIOC({ id: 'ioc-2', value: '10.0.0.2', dismissed: true }),
        ],
      }),
    ];
    const result = JSON.parse(formatIOCsFlatJSON(entries));
    expect(result.iocs).toHaveLength(1);
  });

  it('maps all IOC fields correctly', () => {
    const entries = [makeEntry({
      iocs: [makeIOC({
        attribution: 'APT29',
        analystNotes: 'Suspicious',
        iocSubtype: 'C2',
        iocStatus: 'active',
        relatedId: 'REL-001',
        relationshipType: 'communicates-with',
      })],
    })];
    const result = JSON.parse(formatIOCsFlatJSON(entries));
    const ioc = result.iocs[0];
    expect(ioc.actor_name).toBe('APT29');
    expect(ioc.ioc_value).toBe('192.168.1.1');
    expect(ioc.report_title).toBe('Test Clip');
    expect(ioc.report_source).toBe('https://example.com');
    expect(ioc.ioc_type).toBe('ipv4');
    expect(ioc.ioc_subtype).toBe('C2');
    expect(ioc.notes).toBe('Suspicious');
    expect(ioc.related_id).toBe('REL-001');
    expect(ioc.relationship_type).toBe('communicates-with');
    expect(ioc.ioc_status).toBe('active');
    expect(ioc.first_seen).toBe('2024-06-01T00:00:00.000Z');
    expect(ioc.confidence).toBe(3);
  });

  it('handles empty entries array', () => {
    const result = JSON.parse(formatIOCsFlatJSON([]));
    expect(result.iocs).toEqual([]);
  });

  it('report_date uses current timestamp', () => {
    const result = JSON.parse(formatIOCsFlatJSON([makeEntry()]));
    expect(result.iocs[0].report_date).toBe(FROZEN_NOW);
  });

  it('uses empty strings for missing optional IOC fields', () => {
    const entries = [makeEntry({ iocs: [makeIOC()] })];
    const result = JSON.parse(formatIOCsFlatJSON(entries));
    const ioc = result.iocs[0];
    expect(ioc.actor_name).toBe('');
    expect(ioc.ioc_subtype).toBe('');
    expect(ioc.notes).toBe('');
    expect(ioc.related_id).toBe('');
    expect(ioc.relationship_type).toBe('');
    expect(ioc.ioc_status).toBe('');
  });

  it('sourceUrl falls back to config defaultReportSource', () => {
    const config: ThreatIntelExportConfig = { defaultReportSource: 'https://internal.soc' };
    const entries = [makeEntry({ sourceUrl: undefined, iocs: [makeIOC()] })];
    const result = JSON.parse(formatIOCsFlatJSON(entries, config));
    expect(result.iocs[0].report_source).toBe('https://internal.soc');
  });

  it('sourceUrl from entry takes priority over config', () => {
    const config: ThreatIntelExportConfig = { defaultReportSource: 'https://fallback.com' };
    const entries = [makeEntry({ sourceUrl: 'https://original.com', iocs: [makeIOC()] })];
    const result = JSON.parse(formatIOCsFlatJSON(entries, config));
    expect(result.iocs[0].report_source).toBe('https://original.com');
  });

  it('output is valid JSON', () => {
    expect(() => JSON.parse(formatIOCsFlatJSON([makeEntry()]))).not.toThrow();
  });
});

// ── formatIOCsFlatCSV ───────────────────────────────────────────────

describe('formatIOCsFlatCSV', () => {
  it('has correct header row', () => {
    const csv = formatIOCsFlatCSV([makeEntry()]);
    const header = csv.split('\n')[0];
    expect(header).toBe(
      'id,actor_name,ioc_value,report_date,report_title,report_source,cls_level,confidence,first_seen,ioc_type,ioc_subtype,notes,related_id,relationship_type,ioc_status,tags',
    );
  });

  it('produces matching data rows', () => {
    const csv = formatIOCsFlatCSV([
      makeEntry({ iocs: [makeIOC(), makeIOC({ id: 'ioc-2', value: '10.0.0.1' })] }),
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
    // First data row starts with id=1
    expect(lines[1]).toMatch(/^1,/);
    expect(lines[2]).toMatch(/^2,/);
  });

  it('escapes CSV fields with commas', () => {
    const csv = formatIOCsFlatCSV([
      makeEntry({ iocs: [makeIOC({ analystNotes: 'note, with comma' })] }),
    ]);
    expect(csv).toContain('"note, with comma"');
  });

  it('escapes CSV fields with quotes', () => {
    const csv = formatIOCsFlatCSV([
      makeEntry({ iocs: [makeIOC({ analystNotes: 'has "quotes" inside' })] }),
    ]);
    expect(csv).toContain('"has ""quotes"" inside"');
  });

  it('filters dismissed IOCs', () => {
    const csv = formatIOCsFlatCSV([
      makeEntry({
        iocs: [
          makeIOC({ dismissed: false }),
          makeIOC({ id: 'ioc-2', dismissed: true }),
        ],
      }),
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2); // header + 1 row
  });

  it('handles empty entries', () => {
    const csv = formatIOCsFlatCSV([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // header only
  });

  it('applies config defaults', () => {
    const config: ThreatIntelExportConfig = {
      defaultClsLevel: 'TLP:AMBER',
      defaultReportSource: 'Internal',
    };
    const csv = formatIOCsFlatCSV([makeEntry({ sourceUrl: undefined, iocs: [makeIOC()] })], config);
    expect(csv).toContain('TLP:AMBER');
    expect(csv).toContain('Internal');
  });

  it('includes tags in output', () => {
    const csv = formatIOCsFlatCSV([makeEntry({ tags: ['malware', 'apt'] })]);
    expect(csv).toContain('malware:apt');
  });

  it('sequential IDs across multiple entries', () => {
    const csv = formatIOCsFlatCSV([
      makeEntry({ clipTitle: 'A', iocs: [makeIOC(), makeIOC({ id: 'ioc-2', value: '10.0.0.1' })] }),
      makeEntry({ clipTitle: 'B', iocs: [makeIOC({ id: 'ioc-3', value: '10.0.0.2' })] }),
    ]);
    const lines = csv.split('\n');
    expect(lines[1]).toMatch(/^1,/);
    expect(lines[2]).toMatch(/^2,/);
    expect(lines[3]).toMatch(/^3,/);
  });
});

// ── slugify ─────────────────────────────────────────────────────────

describe('slugify', () => {
  it('converts to lowercase kebab-case', () => {
    expect(slugify('My Threat Report')).toBe('my-threat-report');
  });

  it('strips special characters', () => {
    expect(slugify('Report: APT29 (2024)')).toBe('report-apt29-2024');
  });

  it('truncates long strings to 50 chars', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(50);
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugify('---hello---')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('collapses consecutive special chars to single hyphen', () => {
    expect(slugify('foo!!!bar')).toBe('foo-bar');
  });

  it('handles already-valid slug', () => {
    expect(slugify('already-valid')).toBe('already-valid');
  });

  it('handles numbers', () => {
    expect(slugify('APT 29 Report 2024')).toBe('apt-29-report-2024');
  });
});
