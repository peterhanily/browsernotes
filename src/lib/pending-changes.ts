/**
 * Global tracker for unsaved changes. Editors increment on edit and
 * decrement after save. The beforeunload handler in App.tsx checks this
 * to warn users before losing in-progress work.
 */
let pendingCount = 0;

export function markPending() { pendingCount++; }
export function clearPending() { pendingCount = Math.max(0, pendingCount - 1); }
export function hasPendingChanges() { return pendingCount > 0; }
