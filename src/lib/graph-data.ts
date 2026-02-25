import type { Note, Task, TimelineEvent, Settings, IOCEntry, IOCType, TimelineEventType } from '../types';
import { IOC_TYPE_LABELS, TIMELINE_EVENT_TYPE_LABELS, DEFAULT_RELATIONSHIP_TYPES } from '../types';
import type { IOCRelationshipDef } from '../types';
import { getNodeIcon } from './graph-icons';

export interface GraphNode {
  id: string;
  label: string;
  type: 'ioc' | 'note' | 'task' | 'timeline-event';
  color: string;
  shape: 'round-rectangle';
  icon: string;
  /** Original entity IDs that contributed to this node (for IOCs deduplicated across entities) */
  sourceEntityIds: string[];
  iocType?: IOCType;
  eventType?: TimelineEventType;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: 'contains-ioc' | 'ioc-relationship' | 'timeline-link';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Build a unified graph from all entities.
 * IOCs are deduplicated by (type, lowercase value) across notes and tasks.
 */
export function buildGraphData(
  notes: Note[],
  tasks: Task[],
  timelineEvents: TimelineEvent[],
  settings?: Settings,
): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // IOC deduplication map: key = `${type}:${value.toLowerCase()}`
  const iocNodeMap = new Map<string, GraphNode>();
  // Map from individual IOCEntry id → deduplicated graph node id
  const iocIdToNodeId = new Map<string, string>();

  const allRelDefs: Record<string, IOCRelationshipDef> = { ...DEFAULT_RELATIONSHIP_TYPES };
  if (settings?.tiRelationshipTypes) {
    for (const [k, v] of Object.entries(settings.tiRelationshipTypes)) allRelDefs[k] = v;
  }

  function getOrCreateIOCNode(ioc: IOCEntry): GraphNode {
    const key = `${ioc.type}:${ioc.value.toLowerCase()}`;
    let node = iocNodeMap.get(key);
    if (!node) {
      const typeInfo = IOC_TYPE_LABELS[ioc.type];
      node = {
        id: `ioc:${key}`,
        label: ioc.value.length > 40 ? ioc.value.substring(0, 37) + '...' : ioc.value,
        type: 'ioc',
        color: typeInfo.color,
        shape: 'round-rectangle',
        icon: getNodeIcon('ioc', typeInfo.color, ioc.type),
        sourceEntityIds: [],
        iocType: ioc.type,
      };
      iocNodeMap.set(key, node);
      nodes.push(node);
    }
    iocIdToNodeId.set(ioc.id, node.id);
    return node;
  }

  // Process notes
  const activeNotes = notes.filter((n) => !n.trashed);
  for (const note of activeNotes) {
    const noteNodeId = `note:${note.id}`;
    nodes.push({
      id: noteNodeId,
      label: note.title || 'Untitled',
      type: 'note',
      color: '#3b82f6',
      shape: 'round-rectangle',
      icon: getNodeIcon('note', '#3b82f6'),
      sourceEntityIds: [note.id],
    });

    if (note.iocAnalysis?.iocs) {
      for (const ioc of note.iocAnalysis.iocs) {
        if (ioc.dismissed) continue;
        const iocNode = getOrCreateIOCNode(ioc);
        if (!iocNode.sourceEntityIds.includes(note.id)) {
          iocNode.sourceEntityIds.push(note.id);
        }
        // Note ↔ IOC edge
        const edgeId = `${noteNodeId}--${iocNode.id}`;
        if (!edges.find((e) => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            source: noteNodeId,
            target: iocNode.id,
            label: 'contains',
            type: 'contains-ioc',
          });
        }
      }
    }
  }

  // Process tasks
  for (const task of tasks) {
    const taskNodeId = `task:${task.id}`;
    nodes.push({
      id: taskNodeId,
      label: task.title || 'Untitled',
      type: 'task',
      color: '#22c55e',
      shape: 'round-rectangle',
      icon: getNodeIcon('task', '#22c55e'),
      sourceEntityIds: [task.id],
    });

    if (task.iocAnalysis?.iocs) {
      for (const ioc of task.iocAnalysis.iocs) {
        if (ioc.dismissed) continue;
        const iocNode = getOrCreateIOCNode(ioc);
        if (!iocNode.sourceEntityIds.includes(task.id)) {
          iocNode.sourceEntityIds.push(task.id);
        }
        const edgeId = `${taskNodeId}--${iocNode.id}`;
        if (!edges.find((e) => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            source: taskNodeId,
            target: iocNode.id,
            label: 'contains',
            type: 'contains-ioc',
          });
        }
      }
    }
  }

  // Process timeline events
  for (const event of timelineEvents) {
    const eventNodeId = `event:${event.id}`;
    const eventTypeInfo = TIMELINE_EVENT_TYPE_LABELS[event.eventType];
    const eventColor = eventTypeInfo?.color || '#6b7280';
    nodes.push({
      id: eventNodeId,
      label: event.title || 'Untitled',
      type: 'timeline-event',
      color: eventColor,
      shape: 'round-rectangle',
      icon: getNodeIcon('timeline-event', eventColor),
      sourceEntityIds: [event.id],
      eventType: event.eventType,
    });

    // Timeline → Note links
    for (const noteId of event.linkedNoteIds) {
      const noteNodeId = `note:${noteId}`;
      if (nodes.find((n) => n.id === noteNodeId)) {
        edges.push({
          id: `${eventNodeId}--${noteNodeId}`,
          source: eventNodeId,
          target: noteNodeId,
          label: 'linked',
          type: 'timeline-link',
        });
      }
    }

    // Timeline → Task links
    for (const taskId of event.linkedTaskIds) {
      const taskNodeId = `task:${taskId}`;
      if (nodes.find((n) => n.id === taskNodeId)) {
        edges.push({
          id: `${eventNodeId}--${taskNodeId}`,
          source: eventNodeId,
          target: taskNodeId,
          label: 'linked',
          type: 'timeline-link',
        });
      }
    }

    // Timeline → IOC links
    for (const iocId of event.linkedIOCIds) {
      const iocNodeId = iocIdToNodeId.get(iocId);
      if (iocNodeId) {
        const edgeId = `${eventNodeId}--${iocNodeId}`;
        if (!edges.find((e) => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            source: eventNodeId,
            target: iocNodeId,
            label: 'linked',
            type: 'timeline-link',
          });
        }
      }
    }
  }

  // IOC → IOC relationship edges (from all IOCEntry instances)
  const allIOCEntries: IOCEntry[] = [];
  for (const note of activeNotes) {
    if (note.iocAnalysis?.iocs) allIOCEntries.push(...note.iocAnalysis.iocs);
  }
  for (const task of tasks) {
    if (task.iocAnalysis?.iocs) allIOCEntries.push(...task.iocAnalysis.iocs);
  }

  const seenRelEdges = new Set<string>();
  for (const ioc of allIOCEntries) {
    if (ioc.dismissed) continue;
    const sourceNodeId = iocIdToNodeId.get(ioc.id);
    if (!sourceNodeId) continue;

    const rels = ioc.relationships || [];
    // Also handle legacy relatedId/relationshipType
    if (ioc.relatedId && ioc.relationshipType && rels.length === 0) {
      rels.push({ targetIOCId: ioc.relatedId, relationshipType: ioc.relationshipType });
    }

    for (const rel of rels) {
      const targetNodeId = iocIdToNodeId.get(rel.targetIOCId);
      if (!targetNodeId || targetNodeId === sourceNodeId) continue;
      const edgeKey = `${sourceNodeId}->${targetNodeId}:${rel.relationshipType}`;
      if (seenRelEdges.has(edgeKey)) continue;
      seenRelEdges.add(edgeKey);

      const def = allRelDefs[rel.relationshipType];
      edges.push({
        id: `rel:${edgeKey}`,
        source: sourceNodeId,
        target: targetNodeId,
        label: def?.label || rel.relationshipType,
        type: 'ioc-relationship',
      });
    }
  }

  return { nodes, edges };
}
