import { describe, it, expect } from 'vitest';
import { mergeText, adjustCursor } from '../lib/text-merge';
import type { MergeResult } from '../lib/text-merge';

describe('mergeText', () => {
  // --- Fast paths ---

  it('accepts remote when no local changes', () => {
    const r = mergeText('A', 'A', 'B');
    expect(r).toEqual({ ok: true, merged: 'B' });
  });

  it('keeps local when no remote changes', () => {
    const r = mergeText('A', 'A!', 'A');
    expect(r).toEqual({ ok: true, merged: 'A!' });
  });

  it('returns local when both sides made the same change', () => {
    const r = mergeText('A', 'B', 'B');
    expect(r).toEqual({ ok: true, merged: 'B' });
  });

  it('no-ops when base, local, and remote are all equal', () => {
    const r = mergeText('hello', 'hello', 'hello');
    expect(r).toEqual({ ok: true, merged: 'hello' });
  });

  // --- 3-way merge scenarios ---

  it('merges non-overlapping edits at beginning and end', () => {
    const r = mergeText('hello world', 'HI world', 'hello WORLD');
    expect(r.ok).toBe(true);
    expect((r as Extract<MergeResult, { ok: true }>).merged).toBe('HI WORLD');
  });

  it('merges edits on different lines', () => {
    const r = mergeText('line1\nline2\nline3', 'LINE1\nline2\nline3', 'line1\nline2\nLINE3');
    expect(r.ok).toBe(true);
    expect((r as Extract<MergeResult, { ok: true }>).merged).toBe('LINE1\nline2\nLINE3');
  });

  it('handles remote insertion when local is unchanged', () => {
    const r = mergeText('foo bar', 'foo bar', 'foo baz bar');
    expect(r).toEqual({ ok: true, merged: 'foo baz bar' });
  });

  it('handles remote deletion with local addition elsewhere', () => {
    const r = mergeText('aaa bbb ccc', 'aaa bbb ccc ddd', 'aaa ccc');
    expect(r.ok).toBe(true);
    const merged = (r as Extract<MergeResult, { ok: true }>).merged;
    expect(merged).toContain('aaa');
    expect(merged).toContain('ccc');
    expect(merged).toContain('ddd');
  });

  it('handles empty base with remote content', () => {
    const r = mergeText('', '', 'new content');
    expect(r).toEqual({ ok: true, merged: 'new content' });
  });

  it('handles empty base with local content', () => {
    const r = mergeText('', 'local stuff', '');
    expect(r).toEqual({ ok: true, merged: 'local stuff' });
  });

  // --- Merge result shape ---

  it('returns ok: true with merged string on success', () => {
    const r = mergeText('a', 'a', 'b');
    expect(r.ok).toBe(true);
    expect('merged' in r).toBe(true);
    expect('conflict' in r).toBe(false);
  });

  it('fast-path results always return ok: true', () => {
    // All three fast paths should return ok: true
    expect(mergeText('x', 'x', 'y').ok).toBe(true); // no local change
    expect(mergeText('x', 'y', 'x').ok).toBe(true); // no remote change
    expect(mergeText('x', 'y', 'y').ok).toBe(true); // same change
  });

  // --- Large text merge ---

  it('merges edits in a large multi-paragraph note', () => {
    const base = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.\n\nParagraph four.';
    const local = 'Paragraph one EDITED.\n\nParagraph two.\n\nParagraph three.\n\nParagraph four.';
    const remote = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.\n\nParagraph four EDITED.';
    const r = mergeText(base, local, remote);
    expect(r.ok).toBe(true);
    const merged = (r as Extract<MergeResult, { ok: true }>).merged;
    expect(merged).toContain('Paragraph one EDITED.');
    expect(merged).toContain('Paragraph four EDITED.');
  });

  // --- Empty string edge cases ---

  it('handles all three inputs empty', () => {
    const r = mergeText('', '', '');
    expect(r).toEqual({ ok: true, merged: '' });
  });

  it('handles base empty with both local and remote adding content', () => {
    const r = mergeText('', 'local', 'remote');
    // Both diverged from empty — this goes through patch_apply
    expect(r.ok).toBeDefined();
  });
});

describe('adjustCursor', () => {
  it('returns same position when texts are identical', () => {
    expect(adjustCursor('hello', 'hello', 3)).toBe(3);
  });

  it('shifts cursor forward after insertion before cursor', () => {
    expect(adjustCursor('hello', 'XXhello', 3)).toBe(5);
  });

  it('shifts cursor backward after deletion before cursor', () => {
    expect(adjustCursor('XXhello', 'hello', 5)).toBe(3);
  });

  it('keeps cursor stable when changes are after cursor', () => {
    expect(adjustCursor('hello world', 'hello WORLD', 3)).toBe(3);
  });

  it('handles cursor at start of text with insertion before it', () => {
    expect(adjustCursor('abc', 'Xabc', 0)).toBe(1);
  });

  it('handles cursor at end of text', () => {
    expect(adjustCursor('abc', 'abcXX', 3)).toBe(3);
  });

  it('handles cursor inside deleted region', () => {
    expect(adjustCursor('abcdef', 'adef', 2)).toBe(1);
  });

  // --- Additional edge cases ---

  it('handles empty old text', () => {
    // Empty → "abc" is a pure insertion; cursor at 0 shifts past the insert
    expect(adjustCursor('', 'abc', 0)).toBe(3);
  });

  it('handles empty new text', () => {
    expect(adjustCursor('abc', '', 2)).toBe(0);
  });

  it('handles both texts empty', () => {
    expect(adjustCursor('', '', 0)).toBe(0);
  });

  it('handles cursor at very end of old text with append', () => {
    // Cursor at end, text appended after — cursor stays at same logical position
    expect(adjustCursor('abc', 'abcdef', 3)).toBe(3);
  });

  it('handles multiple insertions and deletions', () => {
    // "abcdef" → "Xabef" (insert X at start, delete "cd")
    // cursor at 4 ("abcd|ef") → "cd" deleted, "X" inserted
    const result = adjustCursor('abcdef', 'Xabef', 4);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual('Xabef'.length);
  });

  it('clamps to valid range', () => {
    const result = adjustCursor('abc', 'de', 3);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(2);
  });
});
