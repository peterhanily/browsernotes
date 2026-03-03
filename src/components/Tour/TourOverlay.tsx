interface TourOverlayProps {
  targetRect: DOMRect | null;
  highlightRects?: DOMRect[];
}

export function TourOverlay({ targetRect, highlightRects }: TourOverlayProps) {
  const padding = 8;
  const r = 8; // border radius

  const cutoutPath = (rect: DOMRect) => {
    const top = rect.top - padding;
    const left = rect.left - padding;
    const right = rect.right + padding;
    const bottom = rect.bottom + padding;
    return `${left + r}px ${top}px,${right - r}px ${top}px,${right}px ${top + r}px,${right}px ${bottom - r}px,${right - r}px ${bottom}px,${left + r}px ${bottom}px,${left}px ${bottom - r}px,${left}px ${top + r}px,${left + r}px ${top}px`;
  };

  let clipPath = 'none';
  const allRects: DOMRect[] = [];
  if (targetRect) allRects.push(targetRect);
  if (highlightRects) allRects.push(...highlightRects);

  if (allRects.length > 0) {
    const cutouts = allRects.map(cutoutPath).join(',');
    clipPath = `polygon(evenodd,0% 0%,100% 0%,100% 100%,0% 100%,0% 0%,${cutouts})`;
  }

  return (
    <div
      className="tour-overlay"
      style={{ clipPath }}
      aria-hidden="true"
    />
  );
}
