// Global clip message buffer.
// Starts listening for THREATCADDY_IMPORT_CLIPS messages before React mounts
// so clips arriving while the encryption lock screen is shown are not lost.

interface BufferedClip {
  data: unknown;
}

const buffer: BufferedClip[] = [];
let listening = false;
let flushed = false;

function handler(event: MessageEvent) {
  if (event.source !== window) return;
  const type = event.data?.type;
  if (type !== 'THREATCADDY_IMPORT_CLIPS' && type !== 'BROWSERNOTES_IMPORT_CLIPS') return;
  buffer.push({ data: event.data });
}

export const clipBuffer = {
  /** Begin capturing clip messages from the window. Call once at boot. */
  startListening() {
    if (listening) return;
    listening = true;
    window.addEventListener('message', handler);
  },

  /**
   * Stop buffering and re-dispatch any captured messages so the App listener
   * (which is now mounted) can process them. Safe to call multiple times —
   * only the first call replays; subsequent calls are no-ops.
   */
  flush() {
    if (flushed) return;
    flushed = true;
    // Stop intercepting — App's own listener will handle future messages
    window.removeEventListener('message', handler);
    // Re-post buffered clips so the existing App.tsx handler picks them up
    for (const { data } of buffer) {
      window.postMessage(data, window.location.origin);
    }
    buffer.length = 0;
  },
};
