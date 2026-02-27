import { describe, it, expect } from 'vitest';
import {
  getStandardLists,
  getChaosLists,
  getUnhingedLists,
  getDefconPartyLists,
  generateName,
  getRandomWords,
  getListsForLevel,
  COMEDY_LEVELS,
  type ComedyLevel,
} from '../lib/operation-names';

// ── Word list getters ───────────────────────────────────────────────

describe('getStandardLists', () => {
  it('returns non-empty adjectives and nouns', () => {
    const lists = getStandardLists();
    expect(lists.adjectives.length).toBeGreaterThan(0);
    expect(lists.nouns.length).toBeGreaterThan(0);
  });

  it('all words are uppercase', () => {
    const lists = getStandardLists();
    for (const word of [...lists.adjectives, ...lists.nouns]) {
      expect(word).toBe(word.toUpperCase());
    }
  });
});

describe('getChaosLists', () => {
  it('returns non-empty adjectives and nouns', () => {
    const lists = getChaosLists();
    expect(lists.adjectives.length).toBeGreaterThan(0);
    expect(lists.nouns.length).toBeGreaterThan(0);
  });
});

describe('getUnhingedLists', () => {
  it('returns non-empty adjectives and nouns', () => {
    const lists = getUnhingedLists();
    expect(lists.adjectives.length).toBeGreaterThan(0);
    expect(lists.nouns.length).toBeGreaterThan(0);
  });
});

describe('getDefconPartyLists', () => {
  it('returns non-empty adjectives and nouns', () => {
    const lists = getDefconPartyLists();
    expect(lists.adjectives.length).toBeGreaterThan(0);
    expect(lists.nouns.length).toBeGreaterThan(0);
  });
});

describe('standard word list has unique entries', () => {
  const lists = getStandardLists();

  it('adjectives are unique', () => {
    expect(new Set(lists.adjectives).size).toBe(lists.adjectives.length);
  });

  it('nouns are unique', () => {
    expect(new Set(lists.nouns).size).toBe(lists.nouns.length);
  });
});

// ── generateName ────────────────────────────────────────────────────

describe('generateName', () => {
  const lists = getStandardLists();

  it('returns an object with adjective, noun, and full', () => {
    const name = generateName(lists);
    expect(name).toHaveProperty('adjective');
    expect(name).toHaveProperty('noun');
    expect(name).toHaveProperty('full');
  });

  it('full is "adjective noun"', () => {
    const name = generateName(lists);
    expect(name.full).toBe(`${name.adjective} ${name.noun}`);
  });

  it('adjective comes from the adjectives list', () => {
    const name = generateName(lists);
    expect(lists.adjectives).toContain(name.adjective);
  });

  it('noun comes from the nouns list', () => {
    const name = generateName(lists);
    expect(lists.nouns).toContain(name.noun);
  });

  it('produces varying output (not always the same)', () => {
    const names = new Set<string>();
    for (let i = 0; i < 20; i++) {
      names.add(generateName(lists).full);
    }
    // With 80 adjectives × 75 nouns = 6000 combos, 20 draws should rarely all collide
    expect(names.size).toBeGreaterThan(1);
  });

  it('works with all comedy level lists', () => {
    for (let level = 0; level <= 3; level++) {
      const l = getListsForLevel(level as ComedyLevel);
      const name = generateName(l);
      expect(name.full).toContain(' ');
      expect(l.adjectives).toContain(name.adjective);
      expect(l.nouns).toContain(name.noun);
    }
  });
});

// ── getRandomWords ──────────────────────────────────────────────────

describe('getRandomWords', () => {
  const list = ['A', 'B', 'C', 'D', 'E'];

  it('returns requested number of words', () => {
    expect(getRandomWords(list, 3)).toHaveLength(3);
    expect(getRandomWords(list, 0)).toHaveLength(0);
    expect(getRandomWords(list, 5)).toHaveLength(5);
  });

  it('all returned words come from the input list', () => {
    const result = getRandomWords(list, 10);
    for (const word of result) {
      expect(list).toContain(word);
    }
  });

  it('can return more words than list size (with repetition)', () => {
    const result = getRandomWords(list, 10);
    expect(result).toHaveLength(10);
  });
});

// ── COMEDY_LEVELS ───────────────────────────────────────────────────

describe('COMEDY_LEVELS', () => {
  it('has 4 entries', () => {
    expect(COMEDY_LEVELS).toHaveLength(4);
  });

  it('each entry has label, color, bg, and text', () => {
    for (const level of COMEDY_LEVELS) {
      expect(level.label).toBeTruthy();
      expect(level.color).toBeTruthy();
      expect(level.bg).toMatch(/^bg-/);
      expect(level.text).toMatch(/^text-/);
    }
  });

  it('labels match expected order', () => {
    expect(COMEDY_LEVELS[0].label).toBe('STANDARD');
    expect(COMEDY_LEVELS[1].label).toBe('CHAOS');
    expect(COMEDY_LEVELS[2].label).toBe('UNHINGED');
    expect(COMEDY_LEVELS[3].label).toBe('DEFCON PARTY');
  });
});

// ── getListsForLevel ────────────────────────────────────────────────

describe('getListsForLevel', () => {
  it('level 0 returns standard lists', () => {
    expect(getListsForLevel(0)).toEqual(getStandardLists());
  });

  it('level 1 returns chaos lists', () => {
    expect(getListsForLevel(1)).toEqual(getChaosLists());
  });

  it('level 2 returns unhinged lists', () => {
    expect(getListsForLevel(2)).toEqual(getUnhingedLists());
  });

  it('level 3 returns defcon party lists', () => {
    expect(getListsForLevel(3)).toEqual(getDefconPartyLists());
  });
});
