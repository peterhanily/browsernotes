import type { IOCType } from '../types';

/** Darken a hex color by the given amount (0-1). */
function darken(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(h.substring(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(h.substring(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(h.substring(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// --- 15 pixel-art SVG template functions (16x16 viewBox) ---

function svgIpv4(c: string): string {
  const d = darken(c, 0.25);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="${c}" stroke-width="1.5"/><line x1="2" y1="8" x2="14" y2="8" stroke="${d}" stroke-width="1"/><line x1="8" y1="2" x2="8" y2="14" stroke="${d}" stroke-width="1"/><ellipse cx="8" cy="8" rx="3" ry="6" fill="none" stroke="${d}" stroke-width="0.8"/><text x="12" y="14" font-size="5" font-family="monospace" fill="${c}" font-weight="bold">4</text></svg>`;
}

function svgIpv6(c: string): string {
  const d = darken(c, 0.25);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="${c}" stroke-width="1.5"/><line x1="2" y1="8" x2="14" y2="8" stroke="${d}" stroke-width="1"/><line x1="8" y1="2" x2="8" y2="14" stroke="${d}" stroke-width="1"/><ellipse cx="8" cy="8" rx="3" ry="6" fill="none" stroke="${d}" stroke-width="0.8"/><text x="12" y="14" font-size="5" font-family="monospace" fill="${c}" font-weight="bold">6</text></svg>`;
}

function svgDomain(c: string): string {
  const d = darken(c, 0.25);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="${c}" stroke-width="1.5"/><line x1="2" y1="8" x2="14" y2="8" stroke="${d}" stroke-width="1"/><line x1="8" y1="2" x2="8" y2="14" stroke="${d}" stroke-width="1"/><ellipse cx="8" cy="8" rx="3" ry="6" fill="none" stroke="${d}" stroke-width="0.8"/><line x1="3" y1="5" x2="13" y2="5" stroke="${d}" stroke-width="0.7"/><line x1="3" y1="11" x2="13" y2="11" stroke="${d}" stroke-width="0.7"/></svg>`;
}

function svgUrl(c: string): string {
  const d = darken(c, 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="2" y="6" width="5" height="4" rx="1" fill="none" stroke="${c}" stroke-width="1.5"/><rect x="9" y="6" width="5" height="4" rx="1" fill="none" stroke="${c}" stroke-width="1.5"/><line x1="7" y1="8" x2="9" y2="8" stroke="${d}" stroke-width="1.5"/></svg>`;
}

function svgEmail(c: string): string {
  const d = darken(c, 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="2" y="4" width="12" height="8" rx="1" fill="none" stroke="${c}" stroke-width="1.5"/><polyline points="2,4 8,9 14,4" fill="none" stroke="${d}" stroke-width="1.2"/></svg>`;
}

function svgMd5(c: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text x="8" y="12" font-size="12" font-family="monospace" fill="${c}" font-weight="bold" text-anchor="middle">#</text></svg>`;
}

function svgSha1(c: string): string {
  const d = darken(c, 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text x="5" y="12" font-size="10" font-family="monospace" fill="${c}" font-weight="bold" text-anchor="middle">#</text><text x="13" y="14" font-size="5" font-family="monospace" fill="${d}" font-weight="bold">1</text></svg>`;
}

function svgSha256(c: string): string {
  const d = darken(c, 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text x="5" y="11" font-size="10" font-family="monospace" fill="${c}" font-weight="bold" text-anchor="middle">#</text><polyline points="10,10 12,13 15,7" fill="none" stroke="${d}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function svgCve(c: string): string {
  const d = darken(c, 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M8 1.5 L14.5 6 L14.5 13 L1.5 13 L1.5 6 Z" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/><text x="8" y="11" font-size="8" font-family="monospace" fill="${d}" font-weight="bold" text-anchor="middle">!</text></svg>`;
}

function svgMitreAttack(c: string): string {
  const d = darken(c, 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="${c}" stroke-width="1.2"/><circle cx="8" cy="8" r="3" fill="none" stroke="${d}" stroke-width="1"/><circle cx="8" cy="8" r="1" fill="${c}"/><line x1="8" y1="1" x2="8" y2="4" stroke="${c}" stroke-width="1"/><line x1="8" y1="12" x2="8" y2="15" stroke="${c}" stroke-width="1"/><line x1="1" y1="8" x2="4" y2="8" stroke="${c}" stroke-width="1"/><line x1="12" y1="8" x2="15" y2="8" stroke="${c}" stroke-width="1"/></svg>`;
}

function svgYaraRule(c: string): string {
  const d = darken(c, 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="7" cy="7" r="5" fill="none" stroke="${c}" stroke-width="1.5"/><line x1="11" y1="11" x2="14.5" y2="14.5" stroke="${d}" stroke-width="2" stroke-linecap="round"/></svg>`;
}

function svgFilePath(c: string): string {
  const d = darken(c, 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M4 2 L11 2 L14 5 L14 14 L4 14 Z" fill="none" stroke="${c}" stroke-width="1.3" stroke-linejoin="round"/><polyline points="11,2 11,5 14,5" fill="none" stroke="${d}" stroke-width="1"/></svg>`;
}

function svgNote(c: string): string {
  const d = darken(c, 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="${c}" stroke-width="1.3"/><line x1="5" y1="5" x2="11" y2="5" stroke="${d}" stroke-width="1"/><line x1="5" y1="8" x2="11" y2="8" stroke="${d}" stroke-width="1"/><line x1="5" y1="11" x2="9" y2="11" stroke="${d}" stroke-width="1"/></svg>`;
}

function svgTask(c: string): string {
  const d = darken(c, 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="2" y="3" width="10" height="10" rx="1.5" fill="none" stroke="${c}" stroke-width="1.5"/><polyline points="5,8 7,11 11,5" fill="none" stroke="${d}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function svgTimelineEvent(c: string): string {
  const d = darken(c, 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="${c}" stroke-width="1.5"/><line x1="8" y1="4" x2="8" y2="8" stroke="${d}" stroke-width="1.3" stroke-linecap="round"/><line x1="8" y1="8" x2="11" y2="10" stroke="${d}" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="8" r="0.8" fill="${c}"/></svg>`;
}

// --- Icon resolver ---

const IOC_ICON_MAP: Record<IOCType, (c: string) => string> = {
  ipv4: svgIpv4,
  ipv6: svgIpv6,
  domain: svgDomain,
  url: svgUrl,
  email: svgEmail,
  md5: svgMd5,
  sha1: svgSha1,
  sha256: svgSha256,
  cve: svgCve,
  'mitre-attack': svgMitreAttack,
  'yara-rule': svgYaraRule,
  'file-path': svgFilePath,
};

const cache = new Map<string, string>();

/**
 * Returns a data URI for a pixel-art SVG icon matching the given entity type and color.
 */
export function getNodeIcon(
  type: 'ioc' | 'note' | 'task' | 'timeline-event',
  color: string,
  iocType?: IOCType,
): string {
  const key = `${type}:${iocType ?? ''}:${color}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let svg: string;
  switch (type) {
    case 'ioc': {
      const fn = iocType ? IOC_ICON_MAP[iocType] : svgDomain;
      svg = fn(color);
      break;
    }
    case 'note':
      svg = svgNote(color);
      break;
    case 'task':
      svg = svgTask(color);
      break;
    case 'timeline-event':
      svg = svgTimelineEvent(color);
      break;
  }

  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  cache.set(key, uri);
  return uri;
}

/** Visible for testing only. */
export function _clearIconCache(): void {
  cache.clear();
}
