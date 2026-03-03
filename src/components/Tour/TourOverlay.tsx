interface TourOverlayProps {
  targetRect: DOMRect | null;
}

export function TourOverlay({ targetRect }: TourOverlayProps) {
  const padding = 8;
  const r = 8; // border radius

  let clipPath = 'none';
  if (targetRect) {
    const top = targetRect.top - padding;
    const left = targetRect.left - padding;
    const right = targetRect.right + padding;
    const bottom = targetRect.bottom + padding;
    const cutout = `${left + r}px ${top}px,${right - r}px ${top}px,${right}px ${top + r}px,${right}px ${bottom - r}px,${right - r}px ${bottom}px,${left + r}px ${bottom}px,${left}px ${bottom - r}px,${left}px ${top + r}px,${left + r}px ${top}px`;
    clipPath = `polygon(evenodd,0% 0%,100% 0%,100% 100%,0% 100%,0% 0%,${cutout})`;
  }

  return (
    <div
      className="tour-overlay"
      style={{ clipPath }}
      aria-hidden="true"
    />
  );
}

interface TourGlowProps {
  targetRect: DOMRect | null;
}

export function TourGlow({ targetRect }: TourGlowProps) {
  if (!targetRect) return null;

  const padding = 8;
  return (
    <div
      className="tour-glow"
      style={{
        top: targetRect.top - padding,
        left: targetRect.left - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
      }}
      aria-hidden="true"
    />
  );
}
