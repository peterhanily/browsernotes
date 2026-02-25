import { describe, it, expect } from 'vitest';
import { buildGraphData } from '../lib/graph-data';
import type { Note, Task, TimelineEvent, IOCEntry, IOCAnalysis } from '../types';

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
    timelineId: 'tl-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('buildGraphData', () => {
  it('creates note nodes for non-trashed notes', () => {
    const notes = [makeNote(), makeNote({ id: 'note-2', trashed: true })];
    const { nodes } = buildGraphData(notes, [], []);
    expect(nodes.filter((n) => n.type === 'note')).toHaveLength(1);
    expect(nodes[0].id).toBe('note:note-1');
  });

  it('creates task nodes', () => {
    const tasks = [makeTask()];
    const { nodes } = buildGraphData([], tasks, []);
    expect(nodes.filter((n) => n.type === 'task')).toHaveLength(1);
    expect(nodes[0].id).toBe('task:task-1');
  });

  it('creates timeline event nodes', () => {
    const events = [makeEvent()];
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

  it('creates IOC nodes from note analysis', () => {
    const ioc = makeIOC();
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc]) })];
    const { nodes, edges } = buildGraphData(notes, [], []);
    const iocNodes = nodes.filter((n) => n.type === 'ioc');
    expect(iocNodes).toHaveLength(1);
    expect(iocNodes[0].iocType).toBe('ipv4');
    // Should have a contains-ioc edge
    expect(edges.filter((e) => e.type === 'contains-ioc')).toHaveLength(1);
  });

  it('deduplicates IOCs by type+value across notes and tasks', () => {
    const ioc1 = makeIOC({ id: 'ioc-1', value: '1.2.3.4' });
    const ioc2 = makeIOC({ id: 'ioc-2', value: '1.2.3.4' }); // same value
    const ioc3 = makeIOC({ id: 'ioc-3', value: '5.6.7.8' }); // different value
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc1]) })];
    const tasks = [makeTask({ iocAnalysis: makeAnalysis([ioc2, ioc3]) })];
    const { nodes } = buildGraphData(notes, tasks, []);
    const iocNodes = nodes.filter((n) => n.type === 'ioc');
    expect(iocNodes).toHaveLength(2); // 1.2.3.4 and 5.6.7.8
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
    // Both notes should be in sourceEntityIds
    expect(iocNodes[0].sourceEntityIds).toContain('note-1');
    expect(iocNodes[0].sourceEntityIds).toContain('note-2');
  });

  it('skips dismissed IOCs', () => {
    const ioc = makeIOC({ dismissed: true });
    const notes = [makeNote({ iocAnalysis: makeAnalysis([ioc]) })];
    const { nodes } = buildGraphData(notes, [], []);
    expect(nodes.filter((n) => n.type === 'ioc')).toHaveLength(0);
  });

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

  it('creates timeline→note and timeline→task links', () => {
    const notes = [makeNote()];
    const tasks = [makeTask()];
    const events = [makeEvent({ linkedNoteIds: ['note-1'], linkedTaskIds: ['task-1'] })];
    const { edges } = buildGraphData(notes, tasks, events);
    const tlLinks = edges.filter((e) => e.type === 'timeline-link');
    expect(tlLinks).toHaveLength(2);
  });

  it('returns empty graph for empty inputs', () => {
    const { nodes, edges } = buildGraphData([], [], []);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('does not create edges to non-existent notes/tasks from timeline', () => {
    const events = [makeEvent({ linkedNoteIds: ['does-not-exist'], linkedTaskIds: ['also-missing'] })];
    const { edges } = buildGraphData([], [], events);
    expect(edges.filter((e) => e.type === 'timeline-link')).toHaveLength(0);
  });
});
