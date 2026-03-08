/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from 'vitest';
import { buildGraphData, parseIOCNodeId } from '../lib/graph-data';
import type { GraphData } from '../lib/graph-data';
import type { Note, Task, TimelineEvent, IOCEntry, IOCAnalysis, Settings } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────

function makeIOC(overrides: Partial<IOCEntry> = {}): IOCEntry {
  return {
    id: 'ioc-1',
    type: 'ipv4',
    value: '1.2.3.4',
    confidence: 'high',
    firstSeen: Date.now(),
    dismissed: false,
    ...overrides,
  };
}

function makeAnalysis(iocs: IOCEntry[]): IOCAnalysis {
  return { extractedAt: Date.now(), iocs };
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Test Note',
    content: 'test',
    tags: [],
    pinned: false,
    archived: false,
    trashed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    completed: false,
    priority: 'none',
    tags: [],
    status: 'todo',
    order: 0,
    trashed: false,
    archived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'event-1',
    timestamp: Date.now(),
    title: 'Test Event',
    eventType: 'detection',
    source: 'test',
    confidence: 'high',
    linkedIOCIds: [],
    linkedNoteIds: [],
    linkedTaskIds: [],
    mitreAttackIds: [],
    assets: [],
    tags: [],
    starred: false,
    trashed: false,
    archived: false,
    timelineId: 'tl-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

/** Simple BFS shortest-path on the graph structure (treats edges as undirected). */
function bfsShortestPath(graph: GraphData, startId: string, endId: string): string[] | null {
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target);
    adj.get(edge.target)?.push(edge.source);
  }
  if (!adj.has(startId) || !adj.has(endId)) return null;

  const visited = new Set<string>([startId]);
  const parent = new Map<string, string | null>([[startId, null]]);
  const queue = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === endId) {
      const path: string[] = [];
      let node: string | null | undefined = endId;
      while (node != null) {
        path.unshift(node);
        node = parent.get(node);
      }
      return path;
    }
    for (const neighbor of adj.get(current) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }
  return null;
}

/** Get connected components using BFS. */
function getConnectedComponents(graph: GraphData): string[][] {
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target);
    adj.get(edge.target)?.push(edge.source);
  }

  const visited = new Set<string>();
  const components: string[][] = [];

  for (const node of graph.nodes) {
    if (visited.has(node.id)) continue;
    const component: string[] = [];
    const queue = [node.id];
    visited.add(node.id);
    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      for (const neighbor of adj.get(current) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    components.push(component);
  }
  return components;
}

// ─── parseIOCNodeId ─────────────────────────────────────────────────

describe('parseIOCNodeId', () => {
  it('parses a valid ioc node id into type and value', () => {
    const result = parseIOCNodeId('ioc:ipv4:1.2.3.4');
    expect(result).toEqual({ iocType: 'ipv4', normalizedValue: '1.2.3.4' });
  });

  it('handles colons in the value portion', () => {
    const result = parseIOCNodeId('ioc:url:https://evil.com:8080');
    expect(result).toEqual({ iocType: 'url', normalizedValue: 'https://evil.com:8080' });
  });

  it('returns null for non-ioc prefix', () => {
    expect(parseIOCNodeId('note:note-1')).toBeNull();
    expect(parseIOCNodeId('task:task-1')).toBeNull();
    expect(parseIOCNodeId('event:event-1')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseIOCNodeId('')).toBeNull();
  });

  it('returns null for malformed ioc ids', () => {
    expect(parseIOCNodeId('ioc:')).toBeNull();
    expect(parseIOCNodeId('ioc:ipv4')).toBeNull();
    expect(parseIOCNodeId('ioc:ipv4:')).toBeNull(); // empty value does not match .+ in the regex
  });

  it('returns null for string with only "ioc:" prefix and no type/value', () => {
    // 'ioc:' has no match for `[^:]+` followed by `:` and `.+`
    expect(parseIOCNodeId('ioc:')).toBeNull();
  });

  it('parses domain IOC node ids', () => {
    expect(parseIOCNodeId('ioc:domain:evil.com')).toEqual({
      iocType: 'domain',
      normalizedValue: 'evil.com',
    });
  });

  it('parses sha256 IOC node ids', () => {
    const hash = 'abc123def456abc123def456abc123def456abc123def456abc123def456abcd';
    expect(parseIOCNodeId(`ioc:sha256:${hash}`)).toEqual({
      iocType: 'sha256',
      normalizedValue: hash,
    });
  });
});

// ─── buildGraphData — basic node construction ───────────────────────

describe('buildGraphData', () => {
  it('creates note nodes for non-trashed notes', () => {
    const notes = [makeNote(), makeNote({ id: 'note-2', trashed: true })];
    const { nodes } = buildGraphData(notes, [], []);
    expect(nodes.filter((n) => n.type === 'note')).toHaveLength(1);
    expect(nodes[0].id).toBe('note:note-1');
  });

  it('creates task nodes for non-trashed tasks', () => {
    const tasks = [makeTask(), makeTask({ id: 'task-2', trashed: true })];
    const { nodes } = buildGraphData([], tasks, []);
    expect(nodes.filter((n) => n.type === 'task')).toHaveLength(1);
    expect(nodes[0].id).toBe('task:task-1');
  });

  it('creates timeline event nodes for non-trashed events', () => {
    const events = [makeEvent(), makeEvent({ id: 'event-2', trashed: true })];
    const { nodes } = buildGraphData([], [], events);
    expect(nodes.filter((n) => n.type === 'timeline-event')).toHaveLength(1);
    expect(nodes[0].id).toBe('event:event-1');
  });

  it('all nodes have shape round-rectangle', () => {
    const ioc = makeIOC();
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc]) })];
    const tasks = [makeTask()];
    const events = [makeEvent()];
    const { nodes } = buildGraphData(notes, tasks, events);
    for (const node of nodes) {
      expect(node.shape).toBe('round-rectangle');
    }
  });

  it('all nodes have an icon data URI', () => {
    const ioc = makeIOC();
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc]) })];
    const tasks = [makeTask()];
    const events = [makeEvent()];
    const { nodes } = buildGraphData(notes, tasks, events);
    for (const node of nodes) {
      expect(node.icon).toMatch(/^data:image\/svg\+xml;utf8,/);
    }
  });

  it('uses "Untitled" label when note title is empty', () => {
    const notes = [makeNote({ title: '' })];
    const { nodes } = buildGraphData(notes, [], []);
    expect(nodes[0].label).toBe('Untitled');
  });

  it('uses "Untitled" label when task title is empty', () => {
    const tasks = [makeTask({ title: '' })];
    const { nodes } = buildGraphData([], tasks, []);
    expect(nodes[0].label).toBe('Untitled');
  });

  it('uses "Untitled" label when event title is empty', () => {
    const events = [makeEvent({ title: '' })];
    const { nodes } = buildGraphData([], [], events);
    expect(nodes[0].label).toBe('Untitled');
  });

  it('assigns correct colors: notes=#3b82f6, tasks=#22c55e', () => {
    const notes = [makeNote()];
    const tasks = [makeTask()];
    const { nodes } = buildGraphData(notes, tasks, []);
    const noteNode = nodes.find((n) => n.type === 'note');
    const taskNode = nodes.find((n) => n.type === 'task');
    expect(noteNode!.color).toBe('#3b82f6');
    expect(taskNode!.color).toBe('#22c55e');
  });

  it('assigns event color from TIMELINE_EVENT_TYPE_LABELS', () => {
    const events = [makeEvent({ eventType: 'initial-access' })];
    const { nodes } = buildGraphData([], [], events);
    const eventNode = nodes.find((n) => n.type === 'timeline-event');
    expect(eventNode!.color).toBe('#ef4444'); // initial-access color
    expect(eventNode!.eventType).toBe('initial-access');
  });

  // ─── IOC nodes ──────────────────────────────────────────────────

  it('creates IOC nodes from note analysis', () => {
    const ioc = makeIOC();
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc]) })];
    const { nodes, edges } = buildGraphData(notes, [], []);
    const iocNodes = nodes.filter((n) => n.type === 'ioc');
    expect(iocNodes).toHaveLength(1);
    expect(iocNodes[0].iocType).toBe('ipv4');
    expect(edges.filter((e) => e.type === 'contains-ioc')).toHaveLength(1);
  });

  it('deduplicates IOCs by type+value across notes and tasks', () => {
    const ioc1 = makeIOC({ id: 'ioc-1', value: '1.2.3.4' });
    const ioc2 = makeIOC({ id: 'ioc-2', value: '1.2.3.4' });
    const ioc3 = makeIOC({ id: 'ioc-3', value: '5.6.7.8' });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc1]) })];
    const tasks = [makeTask({ iocAnalysis: makeAnalysis([ioc2, ioc3]) })];
    const { nodes } = buildGraphData(notes, tasks, []);
    const iocNodes = nodes.filter((n) => n.type === 'ioc');
    expect(iocNodes).toHaveLength(2);
  });

  it('deduplicates IOCs case-insensitively', () => {
    const ioc1 = makeIOC({ id: 'ioc-1', type: 'domain', value: 'Example.com' });
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'domain', value: 'example.com' });
    const notes = [
      makeNote({ id: 'note-1', iocAnalysis: makeAnalysis([ioc1]) }),
      makeNote({ id: 'note-2', iocAnalysis: makeAnalysis([ioc2]) }),
    ];
    const { nodes } = buildGraphData(notes, [], []);
    const iocNodes = nodes.filter((n) => n.type === 'ioc');
    expect(iocNodes).toHaveLength(1);
    expect(iocNodes[0].sourceEntityIds).toContain('note-1');
    expect(iocNodes[0].sourceEntityIds).toContain('note-2');
  });

  it('skips dismissed IOCs', () => {
    const ioc = makeIOC({ dismissed: true });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc]) })];
    const { nodes } = buildGraphData(notes, [], []);
    expect(nodes.filter((n) => n.type === 'ioc')).toHaveLength(0);
  });

  it('creates IOC nodes from task analysis', () => {
    const ioc = makeIOC({ id: 'ioc-t', type: 'domain', value: 'task-ioc.com' });
    const tasks = [makeTask({ iocAnalysis: makeAnalysis([ioc]) })];
    const { nodes, edges } = buildGraphData([], tasks, []);
    const iocNodes = nodes.filter((n) => n.type === 'ioc');
    expect(iocNodes).toHaveLength(1);
    expect(iocNodes[0].iocType).toBe('domain');
    expect(edges.filter((e) => e.type === 'contains-ioc')).toHaveLength(1);
    expect(edges[0].source).toBe('task:task-1');
  });

  it('creates IOC nodes from timeline event iocAnalysis', () => {
    const ioc = makeIOC({ id: 'ioc-ev-1', type: 'domain', value: 'malware.example.com' });
    const events = [makeEvent({ id: 'event-1', iocAnalysis: makeAnalysis([ioc]) })];
    const { nodes, edges } = buildGraphData([], [], events);
    const iocNodes = nodes.filter((n) => n.type === 'ioc');
    expect(iocNodes).toHaveLength(1);
    expect(iocNodes[0].iocType).toBe('domain');
    expect(iocNodes[0].sourceEntityIds).toContain('event-1');
    const containsEdges = edges.filter((e) => e.type === 'contains-ioc');
    expect(containsEdges).toHaveLength(1);
    expect(containsEdges[0].source).toBe('event:event-1');
  });

  it('handles notes without iocAnalysis field', () => {
    const notes = [makeNote()];
    const { nodes, edges } = buildGraphData(notes, [], []);
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
  });

  it('handles notes with empty iocs array', () => {
    const notes = [makeNote({ iocAnalysis: makeAnalysis([]) })];
    const { nodes, edges } = buildGraphData(notes, [], []);
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
  });

  it('creates IOC nodes for each distinct IOC type', () => {
    const iocs = [
      makeIOC({ id: 'i1', type: 'ipv4', value: '1.2.3.4' }),
      makeIOC({ id: 'i2', type: 'domain', value: 'evil.com' }),
      makeIOC({ id: 'i3', type: 'sha256', value: 'abcdef1234567890' }),
      makeIOC({ id: 'i4', type: 'email', value: 'bad@evil.com' }),
    ];
    const notes = [makeNote({ iocAnalysis: makeAnalysis(iocs) })];
    const { nodes } = buildGraphData(notes, [], []);
    const iocNodes = nodes.filter((n) => n.type === 'ioc');
    expect(iocNodes).toHaveLength(4);
    const types = iocNodes.map((n) => n.iocType);
    expect(types).toContain('ipv4');
    expect(types).toContain('domain');
    expect(types).toContain('sha256');
    expect(types).toContain('email');
  });

  // ─── IOC label truncation ─────────────────────────────────────

  it('truncates IOC labels longer than 40 characters with "..."', () => {
    const longValue = 'a'.repeat(50);
    const ioc = makeIOC({ value: longValue });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc]) })];
    const { nodes } = buildGraphData(notes, [], []);
    const iocNode = nodes.find((n) => n.type === 'ioc');
    expect(iocNode).toBeDefined();
    expect(iocNode!.label).toBe('a'.repeat(37) + '...');
    expect(iocNode!.label.length).toBe(40);
  });

  it('does not truncate IOC labels of 40 characters or fewer', () => {
    const exact40 = 'b'.repeat(40);
    const ioc = makeIOC({ value: exact40 });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc]) })];
    const { nodes } = buildGraphData(notes, [], []);
    const iocNode = nodes.find((n) => n.type === 'ioc');
    expect(iocNode).toBeDefined();
    expect(iocNode!.label).toBe(exact40);
  });

  it('does not truncate short IOC values', () => {
    const shortValue = '1.2.3.4';
    const ioc = makeIOC({ value: shortValue });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc]) })];
    const { nodes } = buildGraphData(notes, [], []);
    const iocNode = nodes.find((n) => n.type === 'ioc');
    expect(iocNode).toBeDefined();
    expect(iocNode!.label).toBe(shortValue);
  });

  // ─── IOC relationship edges ────────────────────────────────────

  it('creates IOC→IOC relationship edges', () => {
    const ioc1 = makeIOC({ id: 'ioc-1', type: 'domain', value: 'evil.com', relationships: [{ targetIOCId: 'ioc-2', relationshipType: 'resolves-to' }] });
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'ipv4', value: '10.0.0.1' });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc1, ioc2]) })];
    const { edges } = buildGraphData(notes, [], []);
    const relEdges = edges.filter((e) => e.type === 'ioc-relationship');
    expect(relEdges).toHaveLength(1);
    expect(relEdges[0].label).toBe('Resolves To');
  });

  it('handles legacy relatedId/relationshipType for edge creation', () => {
    const ioc1 = makeIOC({ id: 'ioc-1', type: 'domain', value: 'evil.com', relatedId: 'ioc-2', relationshipType: 'resolves-to' });
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'ipv4', value: '10.0.0.1' });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc1, ioc2]) })];
    const { edges } = buildGraphData(notes, [], []);
    const relEdges = edges.filter((e) => e.type === 'ioc-relationship');
    expect(relEdges).toHaveLength(1);
  });

  it('does not create self-referencing relationship edges', () => {
    // Same type+value → same deduplicated node → self-edge should be skipped
    const ioc1 = makeIOC({
      id: 'ioc-1',
      type: 'ipv4',
      value: '10.0.0.1',
      relationships: [{ targetIOCId: 'ioc-2', relationshipType: 'related-to' }],
    });
    // ioc-2 is the same type+value, so deduplicates to the same graph node
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'ipv4', value: '10.0.0.1' });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc1, ioc2]) })];
    const { edges } = buildGraphData(notes, [], []);
    const relEdges = edges.filter((e) => e.type === 'ioc-relationship');
    // Self-referencing edges are filtered out (targetNodeId === sourceNodeId)
    expect(relEdges).toHaveLength(0);
  });

  it('deduplicates IOC relationship edges with the same source→target and type', () => {
    // Two IOC entries referencing the same relationship
    const ioc1 = makeIOC({
      id: 'ioc-1',
      type: 'domain',
      value: 'evil.com',
      relationships: [{ targetIOCId: 'ioc-3', relationshipType: 'resolves-to' }],
    });
    const ioc2 = makeIOC({
      id: 'ioc-2',
      type: 'domain',
      value: 'evil.com', // same node after dedup
      relationships: [{ targetIOCId: 'ioc-3', relationshipType: 'resolves-to' }],
    });
    const ioc3 = makeIOC({ id: 'ioc-3', type: 'ipv4', value: '10.0.0.1' });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc1, ioc2, ioc3]) })];
    const { edges } = buildGraphData(notes, [], []);
    const relEdges = edges.filter((e) => e.type === 'ioc-relationship');
    expect(relEdges).toHaveLength(1);
  });

  it('uses relationship type key as label when def is not found', () => {
    const ioc1 = makeIOC({
      id: 'ioc-1',
      type: 'ipv4',
      value: '10.0.0.1',
      relationships: [{ targetIOCId: 'ioc-2', relationshipType: 'custom-unknown-type' }],
    });
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'domain', value: 'evil.com' });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc1, ioc2]) })];
    const { edges } = buildGraphData(notes, [], []);
    const relEdges = edges.filter((e) => e.type === 'ioc-relationship');
    expect(relEdges).toHaveLength(1);
    expect(relEdges[0].label).toBe('custom-unknown-type');
  });

  it('uses custom relationship types from settings', () => {
    const ioc1 = makeIOC({
      id: 'ioc-1',
      type: 'ipv4',
      value: '10.0.0.1',
      relationships: [{ targetIOCId: 'ioc-2', relationshipType: 'my-custom-rel' }],
    });
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'domain', value: 'evil.com' });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc1, ioc2]) })];
    const settings: Settings = {
      theme: 'dark',
      defaultView: 'dashboard',
      editorMode: 'split',
      sidebarCollapsed: false,
      taskViewMode: 'list',
      tiRelationshipTypes: {
        'my-custom-rel': {
          label: 'My Custom Relationship',
          sourceTypes: [],
          targetTypes: [],
        },
      },
    };
    const { edges } = buildGraphData(notes, [], [], settings);
    const relEdges = edges.filter((e) => e.type === 'ioc-relationship');
    expect(relEdges).toHaveLength(1);
    expect(relEdges[0].label).toBe('My Custom Relationship');
  });

  it('prefers relationships[] over legacy relatedId when both present', () => {
    // When relationships[] has entries, the legacy fields are not used
    const ioc1 = makeIOC({
      id: 'ioc-1',
      type: 'domain',
      value: 'evil.com',
      relatedId: 'ioc-3', // legacy — should be ignored since relationships is non-empty
      relationshipType: 'communicates-with',
      relationships: [{ targetIOCId: 'ioc-2', relationshipType: 'resolves-to' }],
    });
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'ipv4', value: '10.0.0.1' });
    const ioc3 = makeIOC({ id: 'ioc-3', type: 'ipv4', value: '10.0.0.2' });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc1, ioc2, ioc3]) })];
    const { edges } = buildGraphData(notes, [], []);
    const relEdges = edges.filter((e) => e.type === 'ioc-relationship');
    // Should only have the one from relationships[], not the legacy one
    expect(relEdges).toHaveLength(1);
    expect(relEdges[0].label).toBe('Resolves To');
  });

  it('skips relationship edge when target IOC is not in the graph', () => {
    const ioc1 = makeIOC({
      id: 'ioc-1',
      type: 'domain',
      value: 'evil.com',
      relationships: [{ targetIOCId: 'ioc-nonexistent', relationshipType: 'resolves-to' }],
    });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc1]) })];
    const { edges } = buildGraphData(notes, [], []);
    const relEdges = edges.filter((e) => e.type === 'ioc-relationship');
    expect(relEdges).toHaveLength(0);
  });

  it('creates multiple relationship edges for IOC with multiple relationships', () => {
    const ioc1 = makeIOC({
      id: 'ioc-1',
      type: 'domain',
      value: 'evil.com',
      relationships: [
        { targetIOCId: 'ioc-2', relationshipType: 'resolves-to' },
        { targetIOCId: 'ioc-3', relationshipType: 'hosts' },
      ],
    });
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'ipv4', value: '10.0.0.1' });
    const ioc3 = makeIOC({ id: 'ioc-3', type: 'url', value: 'http://evil.com/payload' });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc1, ioc2, ioc3]) })];
    const { edges } = buildGraphData(notes, [], []);
    const relEdges = edges.filter((e) => e.type === 'ioc-relationship');
    expect(relEdges).toHaveLength(2);
    const labels = relEdges.map((e) => e.label).sort();
    expect(labels).toEqual(['Hosts', 'Resolves To']);
  });

  // ─── Timeline links ────────────────────────────────────────────

  it('creates timeline→note and timeline→task links', () => {
    const notes = [makeNote()];
    const tasks = [makeTask()];
    const events = [makeEvent({ linkedNoteIds: ['note-1'], linkedTaskIds: ['task-1'] })];
    const { edges } = buildGraphData(notes, tasks, events);
    const tlLinks = edges.filter((e) => e.type === 'timeline-link');
    expect(tlLinks).toHaveLength(2);
  });

  it('does not create edges to non-existent notes/tasks from timeline', () => {
    const events = [makeEvent({ linkedNoteIds: ['does-not-exist'], linkedTaskIds: ['also-missing'] })];
    const { edges } = buildGraphData([], [], events);
    expect(edges.filter((e) => e.type === 'timeline-link')).toHaveLength(0);
  });

  it('creates timeline→IOC links via linkedIOCIds', () => {
    const ioc = makeIOC({ id: 'ioc-1', type: 'ipv4', value: '10.0.0.1' });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc]) })];
    const events = [makeEvent({ linkedIOCIds: ['ioc-1'] })];
    const { edges } = buildGraphData(notes, [], events);
    const tlLinks = edges.filter((e) => e.type === 'timeline-link');
    expect(tlLinks).toHaveLength(1);
    expect(tlLinks[0].source).toBe('event:event-1');
  });

  it('does not create timeline→IOC link when IOC id is not in the graph', () => {
    const events = [makeEvent({ linkedIOCIds: ['ioc-nonexistent'] })];
    const { edges } = buildGraphData([], [], events);
    const tlLinks = edges.filter((e) => e.type === 'timeline-link');
    expect(tlLinks).toHaveLength(0);
  });

  it('deduplicates timeline→IOC links (from iocAnalysis and linkedIOCIds)', () => {
    // IOC appears in both event's iocAnalysis (creating a contains-ioc edge)
    // AND linkedIOCIds (creating a timeline-link edge) — but the timeline-link
    // should be deduplicated with the contains-ioc edge since they share the same edgeId
    const ioc = makeIOC({ id: 'ioc-1', type: 'ipv4', value: '10.0.0.1' });
    const events = [makeEvent({
      iocAnalysis: makeAnalysis([ioc]),
      linkedIOCIds: ['ioc-1'],
    })];
    const { edges } = buildGraphData([], [], events);
    // The edgeId for contains-ioc and timeline-link with same source/target is the same
    // so the timeline-link is deduplicated
    const allEdgesFromEvent = edges.filter((e) => e.source === 'event:event-1');
    expect(allEdgesFromEvent).toHaveLength(1);
  });

  // ─── Entity-link edges ─────────────────────────────────────────

  it('creates entity-link edges for Note→Note via linkedNoteIds', () => {
    const notes = [
      makeNote({ id: 'note-1', linkedNoteIds: ['note-2'] }),
      makeNote({ id: 'note-2' }),
    ];
    const { edges } = buildGraphData(notes, [], []);
    const entityLinks = edges.filter((e) => e.type === 'entity-link');
    expect(entityLinks).toHaveLength(1);
    expect(entityLinks[0].label).toBe('linked');
    expect(entityLinks[0].source).toContain('note:');
    expect(entityLinks[0].target).toContain('note:');
  });

  it('creates entity-link edges for Note→Task via linkedTaskIds', () => {
    const notes = [makeNote({ id: 'note-1', linkedTaskIds: ['task-1'] })];
    const tasks = [makeTask({ id: 'task-1' })];
    const { edges } = buildGraphData(notes, tasks, []);
    const entityLinks = edges.filter((e) => e.type === 'entity-link');
    expect(entityLinks).toHaveLength(1);
    expect(entityLinks[0].source).toBe('note:note-1');
    expect(entityLinks[0].target).toBe('task:task-1');
  });

  it('creates entity-link edges for Note→Event via linkedTimelineEventIds', () => {
    const notes = [makeNote({ id: 'note-1', linkedTimelineEventIds: ['event-1'] })];
    const events = [makeEvent({ id: 'event-1' })];
    const { edges } = buildGraphData(notes, [], events);
    const entityLinks = edges.filter((e) => e.type === 'entity-link');
    expect(entityLinks).toHaveLength(1);
    expect(entityLinks[0].source).toBe('note:note-1');
    expect(entityLinks[0].target).toBe('event:event-1');
  });

  it('creates entity-link edges for Task→Note and Task→Task', () => {
    const notes = [makeNote({ id: 'note-1' })];
    const tasks = [
      makeTask({ id: 'task-1', linkedNoteIds: ['note-1'], linkedTaskIds: ['task-2'] }),
      makeTask({ id: 'task-2' }),
    ];
    const { edges } = buildGraphData(notes, tasks, []);
    const entityLinks = edges.filter((e) => e.type === 'entity-link');
    expect(entityLinks).toHaveLength(2);
    const targets = entityLinks.map((e) => e.target).sort();
    expect(targets).toContain('note:note-1');
    expect(targets).toContain('task:task-2');
  });

  it('creates entity-link edges for Task→Event via linkedTimelineEventIds', () => {
    const tasks = [makeTask({ id: 'task-1', linkedTimelineEventIds: ['event-1'] })];
    const events = [makeEvent({ id: 'event-1' })];
    const { edges } = buildGraphData([], tasks, events);
    const entityLinks = edges.filter((e) => e.type === 'entity-link');
    expect(entityLinks).toHaveLength(1);
  });

  it('deduplicates bidirectional entity links (A→B and B→A produce one edge)', () => {
    const notes = [
      makeNote({ id: 'note-1', linkedNoteIds: ['note-2'] }),
      makeNote({ id: 'note-2', linkedNoteIds: ['note-1'] }),
    ];
    const { edges } = buildGraphData(notes, [], []);
    const entityLinks = edges.filter((e) => e.type === 'entity-link');
    expect(entityLinks).toHaveLength(1);
  });

  it('skips entity links to non-existent targets', () => {
    const notes = [makeNote({
      id: 'note-1',
      linkedNoteIds: ['note-ghost'],
      linkedTaskIds: ['task-ghost'],
      linkedTimelineEventIds: ['event-ghost'],
    })];
    const { edges } = buildGraphData(notes, [], []);
    const entityLinks = edges.filter((e) => e.type === 'entity-link');
    expect(entityLinks).toHaveLength(0);
  });

  // ─── sourceEntityIds ───────────────────────────────────────────

  it('IOC shared across note, task, and event has all three in sourceEntityIds', () => {
    const iocInNote = makeIOC({ id: 'ioc-n1', type: 'ipv4', value: '192.168.1.1' });
    const iocInTask = makeIOC({ id: 'ioc-t1', type: 'ipv4', value: '192.168.1.1' });
    const iocInEvent = makeIOC({ id: 'ioc-e1', type: 'ipv4', value: '192.168.1.1' });
    const notes = [makeNote({ id: 'note-1', iocAnalysis: makeAnalysis([iocInNote]) })];
    const tasks = [makeTask({ id: 'task-1', iocAnalysis: makeAnalysis([iocInTask]) })];
    const events = [makeEvent({ id: 'event-1', iocAnalysis: makeAnalysis([iocInEvent]) })];
    const { nodes } = buildGraphData(notes, tasks, events);
    const iocNodes = nodes.filter((n) => n.type === 'ioc');
    expect(iocNodes).toHaveLength(1);
    expect(iocNodes[0].sourceEntityIds).toContain('note-1');
    expect(iocNodes[0].sourceEntityIds).toContain('task-1');
    expect(iocNodes[0].sourceEntityIds).toContain('event-1');
    expect(iocNodes[0].sourceEntityIds).toHaveLength(3);
  });

  it('does not duplicate sourceEntityIds when same IOC appears twice in same note', () => {
    const ioc1 = makeIOC({ id: 'ioc-1', type: 'ipv4', value: '10.0.0.1' });
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'ipv4', value: '10.0.0.1' });
    const notes = [makeNote({ id: 'note-1', iocAnalysis: makeAnalysis([ioc1, ioc2]) })];
    const { nodes } = buildGraphData(notes, [], []);
    const iocNode = nodes.find((n) => n.type === 'ioc')!;
    // The note-1 should appear only once even though two IOCEntry instances refer to it
    const noteIdCount = iocNode.sourceEntityIds.filter((id) => id === 'note-1').length;
    expect(noteIdCount).toBe(1);
  });

  // ─── Edge deduplication ────────────────────────────────────────

  it('does not duplicate the same note→IOC contains-ioc edge', () => {
    const ioc1 = makeIOC({ id: 'ioc-1', type: 'ipv4', value: '10.0.0.1' });
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'ipv4', value: '10.0.0.1' });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc1, ioc2]) })];
    const { edges } = buildGraphData(notes, [], []);
    const containsEdges = edges.filter((e) => e.type === 'contains-ioc');
    expect(containsEdges).toHaveLength(1);
  });

  it('does not duplicate contains-ioc edge when same IOC appears in note and task', () => {
    const iocInNote = makeIOC({ id: 'ioc-1', type: 'domain', value: 'shared.com' });
    const iocInTask = makeIOC({ id: 'ioc-2', type: 'domain', value: 'shared.com' });
    const notes = [makeNote({ id: 'note-1', iocAnalysis: makeAnalysis([iocInNote]) })];
    const tasks = [makeTask({ id: 'task-1', iocAnalysis: makeAnalysis([iocInTask]) })];
    const { edges } = buildGraphData(notes, tasks, []);
    const containsEdges = edges.filter((e) => e.type === 'contains-ioc');
    expect(containsEdges).toHaveLength(2);
    const sources = containsEdges.map((e) => e.source);
    expect(new Set(sources).size).toBe(2);
  });

  // ─── Empty / edge cases ────────────────────────────────────────

  it('returns empty graph for empty inputs', () => {
    const { nodes, edges } = buildGraphData([], [], []);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('handles a large number of entities without errors', () => {
    const notes = Array.from({ length: 100 }, (_, i) =>
      makeNote({ id: `note-${i}`, title: `Note ${i}` }),
    );
    const tasks = Array.from({ length: 100 }, (_, i) =>
      makeTask({ id: `task-${i}`, title: `Task ${i}` }),
    );
    const events = Array.from({ length: 50 }, (_, i) =>
      makeEvent({ id: `event-${i}`, title: `Event ${i}` }),
    );
    const { nodes } = buildGraphData(notes, tasks, events);
    expect(nodes).toHaveLength(250);
  });

  it('handles all trashed entities — results in empty graph', () => {
    const notes = [makeNote({ trashed: true })];
    const tasks = [makeTask({ trashed: true })];
    const events = [makeEvent({ trashed: true })];
    const { nodes, edges } = buildGraphData(notes, tasks, events);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('correctly assigns edge IDs for entity-link edges using sorted canonical key', () => {
    const notes = [
      makeNote({ id: 'note-aaa', linkedNoteIds: ['note-zzz'] }),
      makeNote({ id: 'note-zzz' }),
    ];
    const { edges } = buildGraphData(notes, [], []);
    const entityLinks = edges.filter((e) => e.type === 'entity-link');
    expect(entityLinks).toHaveLength(1);
    // The id should use sorted canonical key
    expect(entityLinks[0].id).toBe('link:note:note-aaa--note:note-zzz');
  });
});

// ─── Graph analysis: BFS shortest path ──────────────────────────────

describe('graph analysis - BFS shortest path', () => {
  it('finds direct path between note and its IOC', () => {
    const ioc = makeIOC({ id: 'ioc-1', type: 'ipv4', value: '1.2.3.4' });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc]) })];
    const graph = buildGraphData(notes, [], []);
    const path = bfsShortestPath(graph, 'note:note-1', 'ioc:ipv4:1.2.3.4');
    expect(path).toEqual(['note:note-1', 'ioc:ipv4:1.2.3.4']);
  });

  it('finds path between two notes connected through a shared IOC', () => {
    const ioc1 = makeIOC({ id: 'ioc-1', type: 'ipv4', value: '1.2.3.4' });
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'ipv4', value: '1.2.3.4' });
    const notes = [
      makeNote({ id: 'note-1', iocAnalysis: makeAnalysis([ioc1]) }),
      makeNote({ id: 'note-2', iocAnalysis: makeAnalysis([ioc2]) }),
    ];
    const graph = buildGraphData(notes, [], []);
    const path = bfsShortestPath(graph, 'note:note-1', 'note:note-2');
    expect(path).not.toBeNull();
    expect(path).toHaveLength(3); // note-1 → IOC → note-2
    expect(path![1]).toBe('ioc:ipv4:1.2.3.4');
  });

  it('returns null when no path exists between disconnected nodes', () => {
    const notes = [makeNote({ id: 'note-1' }), makeNote({ id: 'note-2' })];
    const graph = buildGraphData(notes, [], []);
    const path = bfsShortestPath(graph, 'note:note-1', 'note:note-2');
    expect(path).toBeNull();
  });

  it('returns single-element path when start === end', () => {
    const notes = [makeNote({ id: 'note-1' })];
    const graph = buildGraphData(notes, [], []);
    const path = bfsShortestPath(graph, 'note:note-1', 'note:note-1');
    expect(path).toEqual(['note:note-1']);
  });

  it('returns null for non-existent start node', () => {
    const graph = buildGraphData([], [], []);
    const path = bfsShortestPath(graph, 'note:phantom', 'note:ghost');
    expect(path).toBeNull();
  });

  it('finds shortest path through entity links', () => {
    const notes = [
      makeNote({ id: 'note-1', linkedNoteIds: ['note-2'] }),
      makeNote({ id: 'note-2', linkedNoteIds: ['note-3'] }),
      makeNote({ id: 'note-3' }),
    ];
    const graph = buildGraphData(notes, [], []);
    const path = bfsShortestPath(graph, 'note:note-1', 'note:note-3');
    expect(path).not.toBeNull();
    expect(path).toHaveLength(3);
    expect(path).toEqual(['note:note-1', 'note:note-2', 'note:note-3']);
  });

  it('finds path across note → IOC → task', () => {
    const ioc1 = makeIOC({ id: 'ioc-1', type: 'domain', value: 'shared.com' });
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'domain', value: 'shared.com' });
    const notes = [makeNote({ id: 'note-1', iocAnalysis: makeAnalysis([ioc1]) })];
    const tasks = [makeTask({ id: 'task-1', iocAnalysis: makeAnalysis([ioc2]) })];
    const graph = buildGraphData(notes, tasks, []);
    const path = bfsShortestPath(graph, 'note:note-1', 'task:task-1');
    expect(path).not.toBeNull();
    expect(path).toHaveLength(3);
    expect(path![1]).toBe('ioc:domain:shared.com');
  });

  it('finds path across note → IOC → IOC (via relationship) → task', () => {
    const ioc1 = makeIOC({
      id: 'ioc-1',
      type: 'domain',
      value: 'evil.com',
      relationships: [{ targetIOCId: 'ioc-2', relationshipType: 'resolves-to' }],
    });
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'ipv4', value: '10.0.0.1' });
    const ioc3 = makeIOC({ id: 'ioc-3', type: 'ipv4', value: '10.0.0.1' }); // same as ioc2, will dedup
    const notes = [makeNote({ id: 'note-1', iocAnalysis: makeAnalysis([ioc1, ioc2]) })];
    const tasks = [makeTask({ id: 'task-1', iocAnalysis: makeAnalysis([ioc3]) })];
    const graph = buildGraphData(notes, tasks, []);
    // note-1 → ioc:domain:evil.com → ioc:ipv4:10.0.0.1 → task-1
    const path = bfsShortestPath(graph, 'note:note-1', 'task:task-1');
    expect(path).not.toBeNull();
    // But BFS finds shortest, which might be through the shared IP directly: note-1 → ipv4 → task-1
    expect(path!.length).toBeLessThanOrEqual(4);
  });
});

// ─── Graph analysis: connectivity ───────────────────────────────────

describe('graph analysis - connectivity', () => {
  it('empty graph has no components', () => {
    const graph = buildGraphData([], [], []);
    const components = getConnectedComponents(graph);
    expect(components).toHaveLength(0);
  });

  it('single node is its own component', () => {
    const notes = [makeNote()];
    const graph = buildGraphData(notes, [], []);
    const components = getConnectedComponents(graph);
    expect(components).toHaveLength(1);
    expect(components[0]).toEqual(['note:note-1']);
  });

  it('disconnected nodes form separate components', () => {
    const notes = [makeNote({ id: 'note-1' }), makeNote({ id: 'note-2' })];
    const tasks = [makeTask({ id: 'task-1' })];
    const graph = buildGraphData(notes, tasks, []);
    const components = getConnectedComponents(graph);
    expect(components).toHaveLength(3);
  });

  it('nodes connected through IOCs form a single component', () => {
    const ioc1 = makeIOC({ id: 'ioc-1', type: 'ipv4', value: '1.2.3.4' });
    const ioc2 = makeIOC({ id: 'ioc-2', type: 'ipv4', value: '1.2.3.4' });
    const notes = [makeNote({ id: 'note-1', iocAnalysis: makeAnalysis([ioc1]) })];
    const tasks = [makeTask({ id: 'task-1', iocAnalysis: makeAnalysis([ioc2]) })];
    const graph = buildGraphData(notes, tasks, []);
    const components = getConnectedComponents(graph);
    // note-1, task-1, and the shared IOC should be in one component
    expect(components).toHaveLength(1);
    expect(components[0]).toHaveLength(3);
  });

  it('entity links connect otherwise disconnected entities', () => {
    const notes = [
      makeNote({ id: 'note-1', linkedNoteIds: ['note-2'] }),
      makeNote({ id: 'note-2' }),
    ];
    const tasks = [makeTask({ id: 'task-1' })]; // disconnected
    const graph = buildGraphData(notes, tasks, []);
    const components = getConnectedComponents(graph);
    expect(components).toHaveLength(2);
    const sizes = components.map((c) => c.length).sort();
    expect(sizes).toEqual([1, 2]);
  });

  it('timeline event linking note and task creates single component', () => {
    const notes = [makeNote({ id: 'note-1' })];
    const tasks = [makeTask({ id: 'task-1' })];
    const events = [makeEvent({ id: 'event-1', linkedNoteIds: ['note-1'], linkedTaskIds: ['task-1'] })];
    const graph = buildGraphData(notes, tasks, events);
    const components = getConnectedComponents(graph);
    expect(components).toHaveLength(1);
    expect(components[0]).toHaveLength(3);
  });

  it('IOC relationship chain connects separate entity groups', () => {
    // note-1 has domain IOC, task-1 has IP IOC, domain resolves-to IP
    const iocDomain = makeIOC({
      id: 'ioc-1',
      type: 'domain',
      value: 'evil.com',
      relationships: [{ targetIOCId: 'ioc-2', relationshipType: 'resolves-to' }],
    });
    const iocIp = makeIOC({ id: 'ioc-2', type: 'ipv4', value: '10.0.0.1' });
    const notes = [makeNote({ id: 'note-1', iocAnalysis: makeAnalysis([iocDomain]) })];
    const tasks = [makeTask({ id: 'task-1', iocAnalysis: makeAnalysis([iocIp]) })];
    const graph = buildGraphData(notes, tasks, []);
    const components = getConnectedComponents(graph);
    // note-1 → domain → IP → task-1 should be one component
    expect(components).toHaveLength(1);
  });
});

// ─── Graph data filtering/searching ─────────────────────────────────

describe('graph data - filtering and searching', () => {
  function buildTestGraph(): GraphData {
    const iocIp = makeIOC({ id: 'ioc-1', type: 'ipv4', value: '10.0.0.1' });
    const iocDomain = makeIOC({ id: 'ioc-2', type: 'domain', value: 'evil.com' });
    const iocSha = makeIOC({ id: 'ioc-3', type: 'sha256', value: 'deadbeef' });
    const notes = [
      makeNote({ id: 'note-1', title: 'Phishing Report', iocAnalysis: makeAnalysis([iocIp, iocDomain]) }),
      makeNote({ id: 'note-2', title: 'Malware Analysis' }),
    ];
    const tasks = [
      makeTask({ id: 'task-1', title: 'Block IPs', iocAnalysis: makeAnalysis([iocSha]) }),
    ];
    const events = [
      makeEvent({ id: 'event-1', title: 'Initial Access Detected', linkedNoteIds: ['note-1'] }),
    ];
    return buildGraphData(notes, tasks, events);
  }

  it('can filter nodes by type', () => {
    const graph = buildTestGraph();
    const noteNodes = graph.nodes.filter((n) => n.type === 'note');
    const taskNodes = graph.nodes.filter((n) => n.type === 'task');
    const iocNodes = graph.nodes.filter((n) => n.type === 'ioc');
    const eventNodes = graph.nodes.filter((n) => n.type === 'timeline-event');
    expect(noteNodes).toHaveLength(2);
    expect(taskNodes).toHaveLength(1);
    expect(iocNodes).toHaveLength(3);
    expect(eventNodes).toHaveLength(1);
  });

  it('can filter IOC nodes by iocType', () => {
    const graph = buildTestGraph();
    const iocNodes = graph.nodes.filter((n) => n.type === 'ioc');
    const ipNodes = iocNodes.filter((n) => n.iocType === 'ipv4');
    const domainNodes = iocNodes.filter((n) => n.iocType === 'domain');
    const shaNodes = iocNodes.filter((n) => n.iocType === 'sha256');
    expect(ipNodes).toHaveLength(1);
    expect(domainNodes).toHaveLength(1);
    expect(shaNodes).toHaveLength(1);
  });

  it('can search nodes by label substring', () => {
    const graph = buildTestGraph();
    const search = 'phishing';
    const matching = graph.nodes.filter((n) => n.label.toLowerCase().includes(search));
    expect(matching).toHaveLength(1);
    expect(matching[0].id).toBe('note:note-1');
  });

  it('can filter edges by type', () => {
    const graph = buildTestGraph();
    const containsEdges = graph.edges.filter((e) => e.type === 'contains-ioc');
    const timelineLinks = graph.edges.filter((e) => e.type === 'timeline-link');
    expect(containsEdges.length).toBeGreaterThan(0);
    expect(timelineLinks.length).toBeGreaterThan(0);
  });

  it('can find all neighbors of a node', () => {
    const graph = buildTestGraph();
    const targetId = 'note:note-1';
    const neighborIds = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.source === targetId) neighborIds.add(edge.target);
      if (edge.target === targetId) neighborIds.add(edge.source);
    }
    // note-1 should be connected to its two IOCs and the timeline event
    expect(neighborIds.size).toBeGreaterThanOrEqual(2);
  });

  it('can compute node degree (number of edges)', () => {
    const graph = buildTestGraph();
    const degrees = new Map<string, number>();
    for (const node of graph.nodes) degrees.set(node.id, 0);
    for (const edge of graph.edges) {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    }
    // note-1 (Phishing Report) should have highest degree (2 IOC contains + timeline link)
    const note1Degree = degrees.get('note:note-1') || 0;
    expect(note1Degree).toBeGreaterThanOrEqual(2);
  });

  it('can identify leaf nodes (degree 1)', () => {
    const ioc = makeIOC({ id: 'ioc-1', type: 'ipv4', value: '1.2.3.4' });
    const notes = [makeNote({ id: 'note-1', iocAnalysis: makeAnalysis([ioc]) })];
    const graph = buildGraphData(notes, [], []);
    // Both the note and IOC are leaf nodes with degree 1
    const degrees = new Map<string, number>();
    for (const node of graph.nodes) degrees.set(node.id, 0);
    for (const edge of graph.edges) {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    }
    const leaves = graph.nodes.filter((n) => (degrees.get(n.id) || 0) === 1);
    expect(leaves).toHaveLength(2);
  });

  it('can identify isolated nodes (degree 0)', () => {
    const notes = [makeNote({ id: 'note-1' }), makeNote({ id: 'note-2' })];
    const graph = buildGraphData(notes, [], []);
    const degrees = new Map<string, number>();
    for (const node of graph.nodes) degrees.set(node.id, 0);
    for (const edge of graph.edges) {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    }
    const isolated = graph.nodes.filter((n) => (degrees.get(n.id) || 0) === 0);
    expect(isolated).toHaveLength(2);
  });
});
