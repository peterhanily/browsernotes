import DiffMatchPatch from 'diff-match-patch';

const dmp = new DiffMatchPatch();

export type MergeResult =
  | { ok: true; merged: string }
  | { ok: false; conflict: true };

/**
 * 3-way text merge: apply remote changes on top of local edits.
 * Computes patches from base→remote, applies them to local.
 * Returns { ok: true, merged } on success, { ok: false, conflict: true }
 * if any patch failed to apply cleanly.
 */
export function mergeText(base: string, local: string, remote: string): MergeResult {
  // Fast path: no remote change
  if (base === remote) return { ok: true, merged: local };
  // Fast path: no local change — accept remote
  if (base === local) return { ok: true, merged: remote };
  // Fast path: both made same change
  if (local === remote) return { ok: true, merged: local };

  // Compute patches from base → remote, apply to local
  const patches = dmp.patch_make(base, remote);
  const [merged, results] = dmp.patch_apply(patches, local);

  // Check if all patches applied cleanly
  if (results.some(ok => !ok)) {
    return { ok: false, conflict: true };
  }

  return { ok: true, merged };
}

/**
 * Map a cursor position from oldText to the equivalent position in newText
 * by walking character-level diffs.
 */
export function adjustCursor(oldText: string, newText: string, cursorPos: number): number {
  if (oldText === newText) return cursorPos;

  const diffs = dmp.diff_main(oldText, newText);
  let oldIdx = 0;
  let newIdx = 0;

  for (const [op, text] of diffs) {
    if (op === DiffMatchPatch.DIFF_EQUAL) {
      const len = text.length;
      if (oldIdx + len >= cursorPos) {
        // Cursor falls within this equal segment
        return newIdx + (cursorPos - oldIdx);
      }
      oldIdx += len;
      newIdx += len;
    } else if (op === DiffMatchPatch.DIFF_DELETE) {
      const len = text.length;
      if (oldIdx + len >= cursorPos) {
        // Cursor was inside deleted text — snap to current newIdx
        return newIdx;
      }
      oldIdx += len;
    } else if (op === DiffMatchPatch.DIFF_INSERT) {
      newIdx += text.length;
    }
  }

  return newIdx;
}
