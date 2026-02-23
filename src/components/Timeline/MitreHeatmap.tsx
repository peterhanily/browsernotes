import { useMemo } from 'react';
import { MITRE_TACTICS, MITRE_TECHNIQUES, getParentTechniqueId } from '../../lib/mitre-attack';
import type { TimelineEvent } from '../../types';

interface MitreHeatmapProps {
  events: TimelineEvent[];
  onTechniqueClick: (techniqueId: string) => void;
}

/** 5-step warm gradient: gray → amber → orange → red-orange → red */
function heatColor(count: number, max: number): { bg: string; text: string } {
  if (count === 0 || max === 0) return { bg: 'rgba(31,41,55,0.5)', text: '#4b5563' };
  const ratio = count / max;
  if (ratio <= 0.25) return { bg: 'rgba(245,158,11,0.2)', text: '#f59e0b' };   // amber
  if (ratio <= 0.5)  return { bg: 'rgba(249,115,22,0.3)', text: '#f97316' };   // orange
  if (ratio <= 0.75) return { bg: 'rgba(239,68,68,0.3)', text: '#ef4444' };    // red-orange
  return { bg: 'rgba(239,68,68,0.5)', text: '#fca5a5' };                       // red
}

export function MitreHeatmap({ events, onTechniqueClick }: MitreHeatmapProps) {
  const { columns, maxCount } = useMemo(() => {
    // Build count map: parentTechniqueId → Set<eventId>
    const countMap = new Map<string, Set<string>>();
    for (const ev of events) {
      for (const id of ev.mitreAttackIds) {
        const parent = getParentTechniqueId(id);
        let set = countMap.get(parent);
        if (!set) { set = new Set(); countMap.set(parent, set); }
        set.add(ev.id);
      }
    }

    let max = 0;
    countMap.forEach((s) => { if (s.size > max) max = s.size; });

    // Group techniques by tactic
    const cols = MITRE_TACTICS.map((tactic) => {
      const techs = MITRE_TECHNIQUES
        .filter((t) => t.tactics.includes(tactic.shortName))
        .map((t) => ({
          id: t.id,
          name: t.name,
          count: countMap.get(t.id)?.size || 0,
        }));
      return { tactic, techniques: techs };
    });

    return { columns: cols, maxCount: max };
  }, [events]);

  const hasAny = events.some((e) => e.mitreAttackIds.length > 0);

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <p className="text-sm">No events have MITRE ATT&CK techniques mapped.</p>
        <p className="text-xs mt-1">Edit events to add technique IDs and see coverage here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-gray-400 px-1">
        <span>Coverage:</span>
        <div className="flex items-center gap-1">
          {[
            { label: '0', ...heatColor(0, 1) },
            { label: 'Low', ...heatColor(1, 4) },
            { label: '', ...heatColor(2, 4) },
            { label: '', ...heatColor(3, 4) },
            { label: 'High', ...heatColor(4, 4) },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className="w-5 h-3 rounded-sm border border-gray-700/50"
                style={{ backgroundColor: step.bg }}
              />
              {step.label && <span className="text-[10px]">{step.label}</span>}
            </div>
          ))}
        </div>
        <span className="ml-auto text-[10px] text-gray-600">
          {maxCount} max event{maxCount !== 1 ? 's' : ''} per technique
        </span>
      </div>

      {/* Matrix grid */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-px" style={{ minWidth: `${columns.length * 140}px` }}>
          {columns.map(({ tactic, techniques }) => (
            <div key={tactic.id} className="flex-1 min-w-[140px] flex flex-col">
              {/* Tactic header */}
              <div className="sticky top-0 z-10 px-1.5 py-2 bg-gray-900 border-b border-gray-700">
                <div className="text-[10px] font-semibold text-gray-300 truncate" title={tactic.name}>
                  {tactic.name}
                </div>
                <div className="text-[9px] text-gray-600 font-mono">{tactic.id}</div>
              </div>

              {/* Technique cells */}
              <div className="flex flex-col gap-px p-0.5">
                {techniques.map((tech) => {
                  const color = heatColor(tech.count, maxCount);
                  const clickable = tech.count > 0;
                  return (
                    <button
                      key={tech.id}
                      type="button"
                      disabled={!clickable}
                      onClick={() => clickable && onTechniqueClick(tech.id)}
                      className={`text-left px-1.5 py-1 rounded-sm transition-colors ${
                        clickable ? 'cursor-pointer hover:ring-1 hover:ring-gray-500' : 'cursor-default'
                      }`}
                      style={{ backgroundColor: color.bg }}
                      title={`${tech.id}: ${tech.name} — ${tech.count} event${tech.count !== 1 ? 's' : ''}`}
                    >
                      <div className="font-mono text-[9px] leading-tight" style={{ color: color.text }}>
                        {tech.id}
                      </div>
                      <div className="text-[9px] leading-tight truncate text-gray-500">
                        {tech.name}
                      </div>
                      {tech.count > 0 && (
                        <div className="text-[9px] font-medium mt-0.5" style={{ color: color.text }}>
                          {tech.count}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
