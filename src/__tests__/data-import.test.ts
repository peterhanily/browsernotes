import { describe, it, expect } from 'vitest';
import {
  detectFormat,
  parseInput,
  flattenObject,
  detectSchema,
  parseTimestamp,
  mapConfidence,
  mapEventType,
} from '../lib/data-import';

// ---------------------------------------------------------------------------
// detectFormat
// ---------------------------------------------------------------------------
describe('detectFormat', () => {
  it('detects CSV', () => {
    expect(detectFormat('a,b,c\n1,2,3')).toBe('csv');
  });

  it('detects TSV', () => {
    expect(detectFormat('a\tb\tc\n1\t2\t3')).toBe('tsv');
  });

  it('detects JSON array', () => {
    expect(detectFormat('[{"a":1},{"a":2}]')).toBe('json-array');
  });

  it('detects single JSON object as json-array', () => {
    expect(detectFormat('{"a":1}')).toBe('json-array');
  });

  it('detects NDJSON', () => {
    expect(detectFormat('{"a":1}\n{"a":2}\n{"a":3}')).toBe('ndjson');
  });

  it('returns unknown for empty string', () => {
    expect(detectFormat('')).toBe('unknown');
  });

  it('returns unknown for whitespace only', () => {
    expect(detectFormat('   \n  ')).toBe('unknown');
  });

  it('returns unknown for plain text without delimiters', () => {
    expect(detectFormat('hello world')).toBe('unknown');
  });

  it('prefers TSV when tabs outnumber commas', () => {
    expect(detectFormat('a\tb,c\td\n1\t2,3\t4')).toBe('tsv');
  });

  it('handles JSON with whitespace', () => {
    expect(detectFormat('  [{"x": 1}]  ')).toBe('json-array');
  });
});

// ---------------------------------------------------------------------------
// parseInput
// ---------------------------------------------------------------------------
describe('parseInput', () => {
  it('parses CSV with headers', () => {
    const result = parseInput('name,age,city\nAlice,30,NYC\nBob,25,LA');
    expect(result.format).toBe('csv');
    expect(result.headers).toEqual(['name', 'age', 'city']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ name: 'Alice', age: '30', city: 'NYC' });
    expect(result.truncated).toBe(false);
    expect(result.totalRowCount).toBe(2);
  });

  it('parses TSV with headers', () => {
    const result = parseInput('name\tage\nAlice\t30');
    expect(result.format).toBe('tsv');
    expect(result.headers).toEqual(['name', 'age']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ name: 'Alice', age: '30' });
  });

  it('parses JSON array', () => {
    const result = parseInput('[{"name":"Alice","age":30},{"name":"Bob","age":25}]');
    expect(result.format).toBe('json-array');
    expect(result.headers).toContain('name');
    expect(result.headers).toContain('age');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].name).toBe('Alice');
    expect(result.rows[0].age).toBe('30');
  });

  it('parses NDJSON', () => {
    const result = parseInput('{"name":"Alice"}\n{"name":"Bob"}');
    expect(result.format).toBe('ndjson');
    expect(result.headers).toContain('name');
    expect(result.rows).toHaveLength(2);
  });

  it('returns error for oversized input', () => {
    const big = 'a'.repeat(10_000_001);
    const result = parseInput(big);
    expect(result.error).toContain('maximum size');
  });

  it('returns error for unknown format', () => {
    const result = parseInput('hello world no delimiters');
    expect(result.format).toBe('unknown');
    expect(result.error).toContain('Could not detect');
  });

  it('handles empty JSON array', () => {
    const result = parseInput('[]');
    expect(result.format).toBe('json-array');
    expect(result.rows).toHaveLength(0);
    expect(result.error).toContain('empty');
  });

  it('flattens nested JSON objects', () => {
    const result = parseInput('[{"process":{"name":"cmd.exe","parent":{"name":"explorer.exe"}}}]');
    expect(result.format).toBe('json-array');
    expect(result.headers).toContain('process.name');
    expect(result.headers).toContain('process.parent.name');
    expect(result.rows[0]['process.name']).toBe('cmd.exe');
    expect(result.rows[0]['process.parent.name']).toBe('explorer.exe');
  });

  it('handles single JSON object (wraps as array)', () => {
    const result = parseInput('{"name":"Alice","age":30}');
    expect(result.format).toBe('json-array');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Alice');
  });

  it('reports NDJSON parse errors gracefully', () => {
    const result = parseInput('{"a":1}\nnot json\n{"a":3}');
    expect(result.format).toBe('ndjson');
    expect(result.rows).toHaveLength(2); // 2 valid lines
    expect(result.error).toContain('1 lines failed');
  });
});

// ---------------------------------------------------------------------------
// flattenObject
// ---------------------------------------------------------------------------
describe('flattenObject', () => {
  it('flattens nested object with dot notation', () => {
    const result = flattenObject({ a: { b: { c: 'deep' } } });
    expect(result).toEqual({ 'a.b.c': 'deep' });
  });

  it('joins arrays as comma-separated strings', () => {
    const result = flattenObject({ tags: ['a', 'b', 'c'] });
    expect(result).toEqual({ tags: 'a, b, c' });
  });

  it('converts null/undefined to empty string', () => {
    const result = flattenObject({ x: null, y: undefined } as Record<string, unknown>);
    expect(result.x).toBe('');
    expect(result.y).toBe('');
  });

  it('converts numbers and booleans to strings', () => {
    const result = flattenObject({ count: 42, active: true } as Record<string, unknown>);
    expect(result.count).toBe('42');
    expect(result.active).toBe('true');
  });

  it('handles empty object', () => {
    expect(flattenObject({})).toEqual({});
  });

  it('uses prefix when provided', () => {
    const result = flattenObject({ x: 1 } as Record<string, unknown>, 'root');
    expect(result).toEqual({ 'root.x': '1' });
  });
});

// ---------------------------------------------------------------------------
// detectSchema
// ---------------------------------------------------------------------------
describe('detectSchema', () => {
  it('detects Splunk-style headers', () => {
    const headers = ['_time', 'src_ip', 'dst_ip', 'alert_name', 'severity'];
    const detections = detectSchema(headers);
    const map = Object.fromEntries(detections.map((d) => [d.column, d.mapping]));
    expect(map['_time']).toBe('timestamp');
    expect(map['src_ip']).toBe('ioc-ipv4');
    expect(map['dst_ip']).toBe('ioc-ipv4');
    expect(map['alert_name']).toBe('event-title');
    expect(map['severity']).toBe('confidence');
  });

  it('detects CrowdStrike-style headers', () => {
    const headers = ['timestamp', 'SrcAddr', 'DstAddr', 'detection_name', 'severity', 'FilePath'];
    const detections = detectSchema(headers);
    const map = Object.fromEntries(detections.map((d) => [d.column, d.mapping]));
    expect(map['timestamp']).toBe('timestamp');
    expect(map['SrcAddr']).toBe('ioc-ipv4');
    expect(map['detection_name']).toBe('event-title');
    expect(map['FilePath']).toBe('ioc-file-path');
  });

  it('detects Elastic-style headers', () => {
    const headers = ['@timestamp', 'source.ip', 'destination.ip', 'event.action', 'host.name'];
    const detections = detectSchema(headers);
    const map = Object.fromEntries(detections.map((d) => [d.column, d.mapping]));
    expect(map['@timestamp']).toBe('timestamp');
  });

  it('sets unknown columns to ignore', () => {
    const headers = ['foo_bar_baz', 'xyzzy'];
    const detections = detectSchema(headers);
    expect(detections.every((d) => d.mapping === 'ignore')).toBe(true);
  });

  it('detects hash columns', () => {
    const headers = ['md5', 'sha1', 'sha256'];
    const detections = detectSchema(headers);
    const map = Object.fromEntries(detections.map((d) => [d.column, d.mapping]));
    expect(map['md5']).toBe('ioc-md5');
    expect(map['sha1']).toBe('ioc-sha1');
    expect(map['sha256']).toBe('ioc-sha256');
  });

  it('detects MITRE technique column', () => {
    const headers = ['mitre_technique_id'];
    const detections = detectSchema(headers);
    expect(detections[0].mapping).toBe('mitre-technique');
  });

  it('detects domain and url columns', () => {
    const headers = ['domain', 'url', 'email'];
    const detections = detectSchema(headers);
    const map = Object.fromEntries(detections.map((d) => [d.column, d.mapping]));
    expect(map['domain']).toBe('ioc-domain');
    expect(map['url']).toBe('ioc-url');
    expect(map['email']).toBe('ioc-email');
  });

  it('detects CVE column', () => {
    const headers = ['cve_id'];
    const detections = detectSchema(headers);
    expect(detections[0].mapping).toBe('ioc-cve');
  });

  it('detects source and description columns', () => {
    const headers = ['source', 'description', 'event_type'];
    const detections = detectSchema(headers);
    const map = Object.fromEntries(detections.map((d) => [d.column, d.mapping]));
    expect(map['source']).toBe('source');
    expect(map['description']).toBe('event-description');
    expect(map['event_type']).toBe('event-type');
  });

  it('detects actor and asset columns', () => {
    const headers = ['threat_actor', 'asset'];
    const detections = detectSchema(headers);
    const map = Object.fromEntries(detections.map((d) => [d.column, d.mapping]));
    expect(map['threat_actor']).toBe('actor');
    expect(map['asset']).toBe('asset');
  });
});

// ---------------------------------------------------------------------------
// parseTimestamp
// ---------------------------------------------------------------------------
describe('parseTimestamp', () => {
  it('parses ISO 8601', () => {
    const result = parseTimestamp('2024-01-15T10:30:00Z');
    expect(result).toBe(Date.parse('2024-01-15T10:30:00Z'));
  });

  it('parses unix seconds', () => {
    const result = parseTimestamp('1705312200'); // 2024-01-15 10:30:00 UTC
    expect(result).toBe(1705312200000);
  });

  it('parses unix milliseconds', () => {
    const result = parseTimestamp('1705312200000');
    expect(result).toBe(1705312200000);
  });

  it('parses MM/DD/YYYY format', () => {
    const result = parseTimestamp('01/15/2024');
    expect(result).not.toBeNull();
    expect(typeof result).toBe('number');
  });

  it('parses MM/DD/YYYY HH:MM:SS format', () => {
    const result = parseTimestamp('01/15/2024 10:30:00');
    expect(result).not.toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseTimestamp('')).toBeNull();
  });

  it('returns null for invalid string', () => {
    expect(parseTimestamp('not a date')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(parseTimestamp('   ')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mapConfidence
// ---------------------------------------------------------------------------
describe('mapConfidence', () => {
  it('maps critical to confirmed', () => {
    expect(mapConfidence('critical')).toBe('confirmed');
  });

  it('maps high to high', () => {
    expect(mapConfidence('high')).toBe('high');
  });

  it('maps medium to medium', () => {
    expect(mapConfidence('medium')).toBe('medium');
  });

  it('maps low to low', () => {
    expect(mapConfidence('low')).toBe('low');
  });

  it('maps info to low', () => {
    expect(mapConfidence('info')).toBe('low');
  });

  it('maps informational to low', () => {
    expect(mapConfidence('informational')).toBe('low');
  });

  it('maps numeric 5 to confirmed', () => {
    expect(mapConfidence('5')).toBe('confirmed');
  });

  it('maps numeric 4 to high', () => {
    expect(mapConfidence('4')).toBe('high');
  });

  it('maps numeric 1 to low', () => {
    expect(mapConfidence('1')).toBe('low');
  });

  it('defaults to medium for unknown values', () => {
    expect(mapConfidence('unknown')).toBe('medium');
  });

  it('handles case insensitivity', () => {
    expect(mapConfidence('HIGH')).toBe('high');
    expect(mapConfidence('Critical')).toBe('confirmed');
  });
});

// ---------------------------------------------------------------------------
// mapEventType
// ---------------------------------------------------------------------------
describe('mapEventType', () => {
  it('maps exact MITRE tactic names', () => {
    expect(mapEventType('initial access')).toBe('initial-access');
    expect(mapEventType('execution')).toBe('execution');
    expect(mapEventType('persistence')).toBe('persistence');
    expect(mapEventType('exfiltration')).toBe('exfiltration');
  });

  it('maps hyphenated names', () => {
    expect(mapEventType('credential-access')).toBe('credential-access');
    expect(mapEventType('command-and-control')).toBe('command-and-control');
  });

  it('maps c2 shorthand', () => {
    expect(mapEventType('c2')).toBe('command-and-control');
  });

  it('maps by substring for partial matches', () => {
    expect(mapEventType('lateral movement detected')).toBe('lateral-movement');
    expect(mapEventType('credential theft')).toBe('credential-access');
  });

  it('defaults to other for unknown types', () => {
    expect(mapEventType('something random')).toBe('other');
  });

  it('handles case insensitivity', () => {
    expect(mapEventType('EXECUTION')).toBe('execution');
    expect(mapEventType('Initial Access')).toBe('initial-access');
  });

  it('maps IR phases', () => {
    expect(mapEventType('containment')).toBe('containment');
    expect(mapEventType('eradication')).toBe('eradication');
    expect(mapEventType('recovery')).toBe('recovery');
  });
});
