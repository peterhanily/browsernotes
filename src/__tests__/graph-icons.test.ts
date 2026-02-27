/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach } from 'vitest';
import { getNodeIcon, getLegendEntries, _clearIconCache } from '../lib/graph-icons';
import type { IOCType } from '../types';
import { IOC_TYPE_LABELS } from '../types';

const ALL_IOC_TYPES: IOCType[] = [
  'ipv4', 'ipv6', 'domain', 'url', 'email',
  'md5', 'sha1', 'sha256',
  'cve', 'mitre-attack', 'yara-rule', 'sigma-rule', 'file-path',
];

/** Decode a data URI back to the raw SVG string. */
function decodeSvgUri(uri: string): string {
  const prefix = 'data:image/svg+xml;utf8,';
  return decodeURIComponent(uri.slice(prefix.length));
}

describe('getNodeIcon', () => {
  beforeEach(() => {
    _clearIconCache();
  });

  it('returns a valid data URI for every IOC type', () => {
    for (const iocType of ALL_IOC_TYPES) {
      const uri = getNodeIcon('ioc', '#3b82f6', iocType);
      expect(uri).toMatch(/^data:image\/svg\+xml;utf8,/);
      expect(uri.length).toBeGreaterThan(30);
    }
  });

  it('returns a valid data URI for note type', () => {
    const uri = getNodeIcon('note', '#3b82f6');
    expect(uri).toMatch(/^data:image\/svg\+xml;utf8,/);
  });

  it('returns a valid data URI for task type', () => {
    const uri = getNodeIcon('task', '#22c55e');
    expect(uri).toMatch(/^data:image\/svg\+xml;utf8,/);
  });

  it('returns a valid data URI for timeline-event type', () => {
    const uri = getNodeIcon('timeline-event', '#6b7280');
    expect(uri).toMatch(/^data:image\/svg\+xml;utf8,/);
  });

  it('caches results for the same type+color', () => {
    const a = getNodeIcon('note', '#3b82f6');
    const b = getNodeIcon('note', '#3b82f6');
    expect(a).toBe(b); // exact same string reference (from cache)
  });

  it('returns different URIs for different IOC types', () => {
    const uris = ALL_IOC_TYPES.map((t) => getNodeIcon('ioc', '#3b82f6', t));
    const unique = new Set(uris);
    expect(unique.size).toBe(ALL_IOC_TYPES.length);
  });

  it('returns different URIs for different colors', () => {
    const a = getNodeIcon('note', '#3b82f6');
    const b = getNodeIcon('note', '#22c55e');
    expect(a).not.toBe(b);
  });

  it('produces different SVGs for note vs task vs timeline-event', () => {
    const noteUri = getNodeIcon('note', '#ffffff');
    const taskUri = getNodeIcon('task', '#ffffff');
    const eventUri = getNodeIcon('timeline-event', '#ffffff');
    const uris = new Set([noteUri, taskUri, eventUri]);
    expect(uris.size).toBe(3);
  });
});

describe('getLegendEntries', () => {
  beforeEach(() => {
    _clearIconCache();
  });

  it('returns exactly 16 entries (3 base types + 13 IOC types)', () => {
    const entries = getLegendEntries();
    expect(entries).toHaveLength(16);
  });

  it('starts with note, task, timeline-event as the first 3 entries', () => {
    const entries = getLegendEntries();
    expect(entries[0].type).toBe('note');
    expect(entries[0].label).toBe('Note');
    expect(entries[1].type).toBe('task');
    expect(entries[1].label).toBe('Task');
    expect(entries[2].type).toBe('timeline-event');
    expect(entries[2].label).toBe('Timeline Event');
  });

  it('includes all 13 IOC types after the base entries', () => {
    const entries = getLegendEntries();
    const iocEntries = entries.slice(3);
    expect(iocEntries).toHaveLength(13);
    for (const entry of iocEntries) {
      expect(entry.type).toBe('ioc');
      expect(entry.iocType).toBeDefined();
      expect(ALL_IOC_TYPES).toContain(entry.iocType);
    }
  });

  it('every entry has type, label, color, and icon fields', () => {
    const entries = getLegendEntries();
    for (const entry of entries) {
      expect(entry).toHaveProperty('type');
      expect(entry).toHaveProperty('label');
      expect(entry).toHaveProperty('color');
      expect(entry).toHaveProperty('icon');
      expect(typeof entry.type).toBe('string');
      expect(typeof entry.label).toBe('string');
      expect(entry.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.icon).toMatch(/^data:image\/svg\+xml;utf8,/);
    }
  });

  it('IOC entries have iocType set while base entries do not', () => {
    const entries = getLegendEntries();
    const [note, task, timeline] = entries;
    expect(note.iocType).toBeUndefined();
    expect(task.iocType).toBeUndefined();
    expect(timeline.iocType).toBeUndefined();

    const iocEntries = entries.slice(3);
    for (const entry of iocEntries) {
      expect(entry.iocType).toBeDefined();
    }
  });

  it('uses colors and labels from IOC_TYPE_LABELS for IOC entries', () => {
    const entries = getLegendEntries();
    const iocEntries = entries.slice(3);
    for (const entry of iocEntries) {
      const meta = IOC_TYPE_LABELS[entry.iocType!];
      expect(entry.label).toBe(meta.label);
      expect(entry.color).toBe(meta.color);
    }
  });
});

describe('_clearIconCache', () => {
  it('allows fresh icon generation after clearing', () => {
    const before = getNodeIcon('note', '#3b82f6');
    _clearIconCache();
    const after = getNodeIcon('note', '#3b82f6');
    // After clearing and regenerating, the URI should still be valid and equivalent
    expect(after).toMatch(/^data:image\/svg\+xml;utf8,/);
    expect(after).toBe(before); // deterministic: same inputs produce same output
  });

  it('cache still works after clearing and regenerating', () => {
    getNodeIcon('task', '#22c55e');
    _clearIconCache();
    const first = getNodeIcon('task', '#22c55e');
    const second = getNodeIcon('task', '#22c55e');
    // After regeneration, the cache should store the new entry
    expect(first).toBe(second); // same reference from cache
  });
});

describe('edge cases', () => {
  beforeEach(() => {
    _clearIconCache();
  });

  it('IOC type without iocType falls back to domain icon', () => {
    const fallback = getNodeIcon('ioc', '#3b82f6', undefined);
    const domain = getNodeIcon('ioc', '#3b82f6', 'domain');
    // Both should produce valid URIs; the fallback uses svgDomain
    // They will have different cache keys ('ioc::color' vs 'ioc:domain:color')
    // but the SVG content should be identical
    const fallbackSvg = decodeSvgUri(fallback);
    const domainSvg = decodeSvgUri(domain);
    expect(fallbackSvg).toBe(domainSvg);
  });

  it('SVG content includes the provided color in the output', () => {
    const color = '#ef4444';
    const uri = getNodeIcon('note', color);
    const svg = decodeSvgUri(uri);
    expect(svg).toContain(color);
  });

  it('decoded URI contains valid SVG opening tag', () => {
    for (const iocType of ALL_IOC_TYPES) {
      const uri = getNodeIcon('ioc', '#3b82f6', iocType);
      const svg = decodeSvgUri(uri);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }

    for (const nodeType of ['note', 'task', 'timeline-event'] as const) {
      const uri = getNodeIcon(nodeType, '#3b82f6');
      const svg = decodeSvgUri(uri);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }
  });

  it('SVG includes xmlns attribute for valid standalone SVG', () => {
    const uri = getNodeIcon('note', '#3b82f6');
    const svg = decodeSvgUri(uri);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});
