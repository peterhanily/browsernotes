import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import type { PostAttachment } from '../../types';

function isSafeUrl(url: string): boolean {
  const lower = url.toLowerCase().trim();
  return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('/');
}

interface MediaLightboxProps {
  items: PostAttachment[];
  initialIndex: number;
  onClose: () => void;
}

export function MediaLightbox({ items, initialIndex, onClose }: MediaLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const item = items[index];
  const dialogRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

  // Focus trap: auto-focus dialog on mount
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => { prev?.focus(); };
  }, []);

  if (!item) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Media viewer: ${item.filename}`}
      tabIndex={-1}
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center outline-none"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
        <span className="text-white text-sm truncate max-w-md">{item.filename}</span>
        <div className="flex items-center gap-2">
          {isSafeUrl(item.url) && (
            <a
              href={item.url}
              download={item.filename}
              className="p-2 rounded-full hover:bg-white/10 text-white"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Download ${item.filename}`}
            >
              <Download size={18} />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white"
            aria-label="Close media viewer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      {items.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white z-10"
            aria-label="Previous media"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white z-10"
            aria-label="Next media"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Content */}
      <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {!isSafeUrl(item.url) ? null : item.type === 'image' ? (
          <img
            src={item.url}
            alt={item.alt || item.filename}
            className="max-w-full max-h-[85vh] object-contain rounded"
          />
        ) : item.type === 'video' ? (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] rounded"
          />
        ) : null}
      </div>

      {/* Counter */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full" role="status" aria-live="polite">
          {index + 1} / {items.length}
        </div>
      )}
    </div>
  );
}
