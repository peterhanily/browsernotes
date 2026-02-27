/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from 'vitest';
import {
  MITRE_TACTICS,
  MITRE_TECHNIQUES,
  getParentTechniqueId,
  lookupTechnique,
  getTechniqueLabel,
  searchTechniques,
  confidenceToRank,
  buildNavigatorLayer,
  buildMitreCSV,
} from '../lib/mitre-attack';

// ── Static data integrity ───────────────────────────────────────────

describe('MITRE_TACTICS', () => {
  it('has 14 tactics', () => {
    expect(MITRE_TACTICS).toHaveLength(14);
  });

  it('all have TA-prefixed IDs', () => {
    for (const t of MITRE_TACTICS) {
      expect(t.id).toMatch(/^TA\d{4}$/);
    }
  });

  it('order values are sequential 0–13', () => {
    const orders = MITRE_TACTICS.map((t) => t.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 14 }, (_, i) => i));
  });

  it('includes key tactics', () => {
    const names = MITRE_TACTICS.map((t) => t.shortName);
    expect(names).toContain('initial-access');
    expect(names).toContain('execution');
    expect(names).toContain('persistence');
    expect(names).toContain('exfiltration');
    expect(names).toContain('impact');
  });
});

describe('MITRE_TECHNIQUES', () => {
  it('has more than 150 techniques', () => {
    expect(MITRE_TECHNIQUES.length).toBeGreaterThan(150);
  });

  it('all have T-prefixed IDs', () => {
    for (const t of MITRE_TECHNIQUES) {
      expect(t.id).toMatch(/^T\d{4}$/);
    }
  });

  it('all reference valid tactic shortNames', () => {
    const validTactics = new Set(MITRE_TACTICS.map((t) => t.shortName));
    for (const tech of MITRE_TECHNIQUES) {
      for (const tactic of tech.tactics) {
        expect(validTactics.has(tactic)).toBe(true);
      }
    }
  });

  it('some techniques span multiple tactics', () => {
    const multi = MITRE_TECHNIQUES.filter((t) => t.tactics.length > 1);
    expect(multi.length).toBeGreaterThan(0);
    // T1078 Valid Accounts spans 4 tactics
    const t1078 = MITRE_TECHNIQUES.find((t) => t.id === 'T1078');
    expect(t1078!.tactics.length).toBeGreaterThanOrEqual(4);
  });
});

// ── getParentTechniqueId ────────────────────────────────────────────

describe('getParentTechniqueId', () => {
  it('returns the same ID for a parent technique', () => {
    expect(getParentTechniqueId('T1566')).toBe('T1566');
  });

  it('strips sub-technique suffix', () => {
    expect(getParentTechniqueId('T1059.001')).toBe('T1059');
    expect(getParentTechniqueId('T1566.002')).toBe('T1566');
  });

  it('handles IDs without dots', () => {
    expect(getParentTechniqueId('T1078')).toBe('T1078');
  });
});

// ── lookupTechnique ─────────────────────────────────────────────────

describe('lookupTechnique', () => {
  it('finds a technique by exact ID', () => {
    const result = lookupTechnique('T1566');
    expect(result).toBeDefined();
    expect(result!.name).toBe('Phishing');
  });

  it('finds a technique by sub-technique ID (rolls up to parent)', () => {
    const result = lookupTechnique('T1059.001');
    expect(result).toBeDefined();
    expect(result!.id).toBe('T1059');
    expect(result!.name).toBe('Command and Scripting Interpreter');
  });

  it('returns undefined for unknown technique', () => {
    expect(lookupTechnique('T9999')).toBeUndefined();
  });
});

// ── getTechniqueLabel ───────────────────────────────────────────────

describe('getTechniqueLabel', () => {
  it('returns "ID: Name" for known technique', () => {
    expect(getTechniqueLabel('T1566')).toBe('T1566: Phishing');
  });

  it('returns "subID: parentName" for sub-technique', () => {
    expect(getTechniqueLabel('T1059.001')).toBe('T1059.001: Command and Scripting Interpreter');
  });

  it('returns just the ID for unknown technique', () => {
    expect(getTechniqueLabel('T9999')).toBe('T9999');
  });
});

// ── searchTechniques ────────────────────────────────────────────────

describe('searchTechniques', () => {
  it('returns empty array for empty query', () => {
    expect(searchTechniques('')).toEqual([]);
  });

  it('finds techniques by ID substring', () => {
    const results = searchTechniques('T1566');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].id).toBe('T1566');
  });

  it('finds techniques by name substring (case-insensitive)', () => {
    const results = searchTechniques('phishing');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((t) => t.name.toLowerCase().includes('phishing'))).toBe(true);
  });

  it('is case-insensitive', () => {
    const lower = searchTechniques('brute force');
    const upper = searchTechniques('BRUTE FORCE');
    expect(lower).toEqual(upper);
  });

  it('returns multiple matches for broad queries', () => {
    const results = searchTechniques('credential');
    expect(results.length).toBeGreaterThan(1);
  });
});

// ── confidenceToRank ────────────────────────────────────────────────

describe('confidenceToRank', () => {
  it('maps known confidence levels to ranks', () => {
    expect(confidenceToRank('low')).toBe(1);
    expect(confidenceToRank('medium')).toBe(2);
    expect(confidenceToRank('high')).toBe(3);
    expect(confidenceToRank('confirmed')).toBe(4);
  });

  it('returns 0 for unknown confidence', () => {
    expect(confidenceToRank('unknown')).toBe(0);
    expect(confidenceToRank('')).toBe(0);
  });
});

// ── buildNavigatorLayer ─────────────────────────────────────────────

describe('buildNavigatorLayer', () => {
  const events = [
    { id: 'e1', title: 'Phishing email', mitreAttackIds: ['T1566'], confidence: 'high' },
    { id: 'e2', title: 'PowerShell execution', mitreAttackIds: ['T1059.001'], confidence: 'confirmed' },
    { id: 'e3', title: 'Another phishing', mitreAttackIds: ['T1566'] },
  ];

  it('returns a valid Navigator layer structure', () => {
    const layer = buildNavigatorLayer(events, 'Test Layer');
    expect(layer.name).toBe('Test Layer');
    expect(layer.domain).toBe('enterprise-attack');
    expect(layer.versions).toHaveProperty('attack');
    expect(layer.versions).toHaveProperty('navigator');
    expect(layer.techniques).toBeInstanceOf(Array);
    expect(layer.gradient).toHaveProperty('colors');
  });

  it('aggregates events by technique and tactic', () => {
    const layer = buildNavigatorLayer(events, 'Test');
    // T1566 appears in 2 events under initial-access
    const phishing = layer.techniques.find((t) => t.techniqueID === 'T1566' && t.tactic === 'initial-access');
    expect(phishing).toBeDefined();
    expect(phishing!.score).toBe(2);
  });

  it('sub-techniques roll up to parent', () => {
    const layer = buildNavigatorLayer(events, 'Test');
    // T1059.001 should map to T1059
    const cmd = layer.techniques.find((t) => t.techniqueID === 'T1059');
    expect(cmd).toBeDefined();
    expect(cmd!.score).toBe(1);
  });

  it('includes event titles in comments', () => {
    const layer = buildNavigatorLayer(events, 'Test');
    const phishing = layer.techniques.find((t) => t.techniqueID === 'T1566');
    expect(phishing!.comment).toContain('Phishing email');
    expect(phishing!.comment).toContain('Another phishing');
  });

  it('description includes event count', () => {
    const layer = buildNavigatorLayer(events, 'Test');
    expect(layer.description).toContain('3 events');
  });

  it('gradient maxValue reflects highest score', () => {
    const layer = buildNavigatorLayer(events, 'Test');
    expect(layer.gradient.maxValue).toBe(2);
  });

  it('handles empty events', () => {
    const layer = buildNavigatorLayer([], 'Empty');
    expect(layer.techniques).toHaveLength(0);
    expect(layer.description).toContain('0 events');
  });

  it('skips unknown technique IDs', () => {
    const layer = buildNavigatorLayer(
      [{ id: 'e1', title: 'Unknown', mitreAttackIds: ['T9999'] }],
      'Test',
    );
    expect(layer.techniques).toHaveLength(0);
  });
});

// ── buildMitreCSV ───────────────────────────────────────────────────

describe('buildMitreCSV', () => {
  it('returns header row for empty events', () => {
    const csv = buildMitreCSV([]);
    expect(csv).toBe('techniqueID,techniqueName,tactic,eventId,eventTitle,confidence,actor,timestamp');
  });

  it('includes data rows for events', () => {
    const csv = buildMitreCSV([
      { id: 'e1', title: 'Test Event', mitreAttackIds: ['T1566'], confidence: 'high', actor: 'APT29', timestamp: 1709251200000 },
    ]);
    const lines = csv.split('\n');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[1]).toContain('T1566');
    expect(lines[1]).toContain('Phishing');
    expect(lines[1]).toContain('initial-access');
    expect(lines[1]).toContain('e1');
    expect(lines[1]).toContain('Test Event');
    expect(lines[1]).toContain('high');
    expect(lines[1]).toContain('APT29');
  });

  it('sub-techniques use original ID but parent name', () => {
    const csv = buildMitreCSV([
      { id: 'e1', title: 'PS', mitreAttackIds: ['T1059.001'] },
    ]);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('T1059.001');
    expect(lines[1]).toContain('Command and Scripting Interpreter');
  });

  it('escapes CSV special characters', () => {
    const csv = buildMitreCSV([
      { id: 'e1', title: 'Event with, comma and "quotes"', mitreAttackIds: ['T1566'] },
    ]);
    // Commas and quotes in title should be escaped
    expect(csv).toContain('"Event with, comma and ""quotes"""');
  });

  it('multi-tactic techniques produce multiple rows', () => {
    const csv = buildMitreCSV([
      { id: 'e1', title: 'Valid Accounts', mitreAttackIds: ['T1078'] },
    ]);
    const lines = csv.split('\n');
    // T1078 spans 4 tactics → 4 data rows + 1 header
    expect(lines.length).toBeGreaterThanOrEqual(5);
  });

  it('formats timestamp as ISO string', () => {
    const csv = buildMitreCSV([
      { id: 'e1', title: 'Event', mitreAttackIds: ['T1566'], timestamp: 1709251200000 },
    ]);
    expect(csv).toContain('2024-03-01');
  });

  it('skips unknown technique IDs', () => {
    const csv = buildMitreCSV([
      { id: 'e1', title: 'Unknown', mitreAttackIds: ['T9999'] },
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // header only
  });
});
