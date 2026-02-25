import { X, ArrowRight, ExternalLink, Pencil } from 'lucide-react';
import type { GraphNode, GraphEdge } from '../../lib/graph-data';
import { IOC_TYPE_LABELS, TIMELINE_EVENT_TYPE_LABELS } from '../../types';

interface GraphDetailPanelProps {
  node: GraphNode;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
  onOpenNewTab?: (node: GraphNode) => void;
  onEditIOC?: (node: GraphNode) => void;
}

export function GraphDetailPanel({ node, edges, allNodes, onClose, onNavigate, onOpenNewTab, onEditIOC }: GraphDetailPanelProps) {
  const connectedEdges = edges.filter((e) => e.source === node.id || e.target === node.id);

  const getNodeLabel = (id: string) => {
    const n = allNodes.find((n) => n.id === id);
    return n?.label || id;
  };

  return (
    <div className="w-72 border-l border-gray-800 bg-gray-900 flex flex-col h-full overflow-hidden shrink-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
        <span className="text-sm font-medium text-gray-200 flex-1 truncate">{node.label}</span>
        <button onClick={onClose} className="p-1 rounded text-gray-500 hover:text-gray-300" aria-label="Close detail panel">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Node info */}
        <div className="space-y-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Type</div>
          <div className="text-xs text-gray-300 capitalize">
            {node.type === 'ioc' && node.iocType
              ? IOC_TYPE_LABELS[node.iocType].label
              : node.type === 'timeline-event' && node.eventType
                ? TIMELINE_EVENT_TYPE_LABELS[node.eventType]?.label || node.eventType
                : node.type.replace('-', ' ')}
          </div>
        </div>

        {node.type === 'ioc' && (
          <div className="space-y-1">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Value</div>
            <div className="text-xs text-gray-300 font-mono break-all">{node.label}</div>
          </div>
        )}

        {node.sourceEntityIds.length > 0 && node.type === 'ioc' && (
          <div className="space-y-1">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Found in {node.sourceEntityIds.length} entit{node.sourceEntityIds.length === 1 ? 'y' : 'ies'}</div>
          </div>
        )}

        {/* Connected edges */}
        <div className="space-y-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
            Connections ({connectedEdges.length})
          </div>
          {connectedEdges.length === 0 ? (
            <p className="text-xs text-gray-600">No connections</p>
          ) : (
            <div className="space-y-1">
              {connectedEdges.map((edge) => {
                const isSource = edge.source === node.id;
                const otherId = isSource ? edge.target : edge.source;
                const otherNode = allNodes.find((n) => n.id === otherId);
                return (
                  <div key={edge.id} className="flex items-center gap-1 text-xs p-1 rounded bg-gray-800/50">
                    {isSource ? (
                      <>
                        <span className="text-gray-500">{edge.label}</span>
                        <ArrowRight size={10} className="text-gray-600 shrink-0" />
                        <span className="text-gray-300 truncate flex-1">{getNodeLabel(otherId)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-300 truncate flex-1">{getNodeLabel(otherId)}</span>
                        <ArrowRight size={10} className="text-gray-600 shrink-0" />
                        <span className="text-gray-500">{edge.label}</span>
                      </>
                    )}
                    {otherNode && (
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: otherNode.color }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer buttons */}
      {(node.type === 'note' || node.type === 'task' || node.type === 'timeline-event' || (node.type === 'ioc' && onEditIOC)) && (
        <div className="border-t border-gray-800 p-2 space-y-1">
          {(node.type === 'note' || node.type === 'task' || node.type === 'timeline-event') && (
            <>
              <button
                onClick={() => onNavigate(node.id)}
                className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
              >
                <ArrowRight size={12} />
                Open {node.type === 'note' ? 'Note' : node.type === 'task' ? 'Task' : 'Event'}
              </button>
              {onOpenNewTab && (
                <button
                  onClick={() => onOpenNewTab(node)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <ExternalLink size={12} />
                  Open in New Tab
                </button>
              )}
            </>
          )}
          {node.type === 'ioc' && onEditIOC && (
            <button
              onClick={() => onEditIOC(node)}
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
            >
              <Pencil size={12} />
              Edit IOC Attributes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
