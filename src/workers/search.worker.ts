import MiniSearch from 'minisearch';
import { unifiedSearch, generateSnippet } from '../lib/search';
import type { Note, Task, TimelineEvent, Whiteboard, StandaloneIOC, ChatThread } from '../types';
import type { SearchQuery, SearchResult, SearchResultType, UnifiedSearchResult } from '../lib/search';
import { TIMELINE_EVENT_TYPE_LABELS } from '../types';

interface DataMessage {
  type: 'data';
  notes: Note[];
  tasks: Task[];
  clipsFolderId: string | undefined;
  timelineEvents?: TimelineEvent[];
  whiteboards?: Whiteboard[];
  standaloneIOCs?: StandaloneIOC[];
  chatThreads?: ChatThread[];
}

interface QueryMessage {
  type: 'query';
  id: number;
  query: SearchQuery;
  folderId?: string;
}

type WorkerMessage = DataMessage | QueryMessage;

// --- MiniSearch index ---

interface IndexDoc {
  id: string;
  entityType: SearchResultType;
  title: string;
  content: string;
  tags: string;
  folderId: string | undefined;
  updatedAt: number;
  createdAt: number;
}

let searchIndex: MiniSearch<IndexDoc> | null = null;
// Lookup map for building SearchResult from index hits
const entityMap = new Map<string, { type: SearchResultType; entity: Note | Task | TimelineEvent | Whiteboard | StandaloneIOC | ChatThread }>();

function buildIndex(
  notes: Note[],
  tasks: Task[],
  clipsFolderId: string | undefined,
  timelineEvents?: TimelineEvent[],
  whiteboards?: Whiteboard[],
  standaloneIOCs?: StandaloneIOC[],
  chatThreads?: ChatThread[],
): void {
  entityMap.clear();

  const index = new MiniSearch<IndexDoc>({
    fields: ['title', 'content', 'tags'],
    storeFields: ['entityType', 'folderId', 'updatedAt', 'createdAt'],
    searchOptions: {
      prefix: true,
      fuzzy: false,
      combineWith: 'AND',
    },
  });

  const docs: IndexDoc[] = [];

  for (const note of notes) {
    if (note.trashed || note.archived) continue;
    const type: SearchResultType = note.folderId === clipsFolderId ? 'clip' : 'note';
    entityMap.set(note.id, { type, entity: note });
    docs.push({
      id: note.id,
      entityType: type,
      title: note.title,
      content: note.content,
      tags: note.tags.join(' '),
      folderId: note.folderId,
      updatedAt: note.updatedAt,
      createdAt: note.createdAt,
    });
  }

  for (const task of tasks) {
    if (task.trashed || task.archived) continue;
    entityMap.set(task.id, { type: 'task', entity: task });
    docs.push({
      id: task.id,
      entityType: 'task',
      title: task.title,
      content: task.description || '',
      tags: task.tags.join(' '),
      folderId: task.folderId,
      updatedAt: task.updatedAt,
      createdAt: task.createdAt,
    });
  }

  if (timelineEvents) {
    for (const ev of timelineEvents) {
      entityMap.set(ev.id, { type: 'timeline', entity: ev });
      docs.push({
        id: ev.id,
        entityType: 'timeline',
        title: ev.title,
        content: [ev.description || '', ev.source, ev.actor || '', TIMELINE_EVENT_TYPE_LABELS[ev.eventType]?.label || ''].join(' '),
        tags: ev.tags.join(' '),
        folderId: ev.folderId,
        updatedAt: ev.updatedAt,
        createdAt: ev.createdAt,
      });
    }
  }

  if (whiteboards) {
    for (const wb of whiteboards) {
      if (wb.trashed || wb.archived) continue;
      entityMap.set(wb.id, { type: 'whiteboard', entity: wb });
      docs.push({
        id: wb.id,
        entityType: 'whiteboard',
        title: wb.name,
        content: '',
        tags: wb.tags.join(' '),
        folderId: wb.folderId,
        updatedAt: wb.updatedAt,
        createdAt: wb.createdAt,
      });
    }
  }

  if (standaloneIOCs) {
    for (const ioc of standaloneIOCs) {
      if (ioc.trashed || ioc.archived) continue;
      entityMap.set(ioc.id, { type: 'ioc', entity: ioc });
      docs.push({
        id: ioc.id,
        entityType: 'ioc',
        title: ioc.value,
        content: [ioc.type, ioc.analystNotes || '', ioc.attribution || ''].join(' '),
        tags: ioc.tags.join(' '),
        folderId: ioc.folderId,
        updatedAt: ioc.updatedAt,
        createdAt: ioc.createdAt,
      });
    }
  }

  if (chatThreads) {
    for (const thread of chatThreads) {
      if (thread.trashed || thread.archived) continue;
      entityMap.set(thread.id, { type: 'chat', entity: thread });
      docs.push({
        id: thread.id,
        entityType: 'chat',
        title: thread.title,
        content: thread.messages.map((m) => m.content).join(' '),
        tags: thread.tags.join(' '),
        folderId: thread.folderId,
        updatedAt: thread.updatedAt,
        createdAt: thread.createdAt,
      });
    }
  }

  index.addAll(docs);
  searchIndex = index;
}

const MAX_RESULTS = 50;

function indexedSimpleSearch(query: string, folderId?: string, dateFilter?: SearchQuery['dateFilter']): UnifiedSearchResult {
  if (!searchIndex || !query.trim()) return { results: [] };
  if (query.length > 1000) return { results: [], error: 'Query too long' };

  const raw = searchIndex.search(query, {
    prefix: true,
    fuzzy: false,
    combineWith: 'AND',
    filter: folderId ? (result) => result.folderId === folderId : undefined,
  });

  const results: SearchResult[] = [];
  for (const hit of raw) {
    if (results.length >= MAX_RESULTS) break;
    const entry = entityMap.get(hit.id);
    if (!entry) continue;

    // Determine which field matched for snippet generation
    const matchField = hit.match ? bestMatchField(hit.match) : 'title';

    const result = buildSearchResult(entry.type, entry.entity, matchField, query);
    if (!result) continue;

    // Date post-filter
    if (dateFilter) {
      const ts = dateFilter.field === 'createdAt' ? result.createdAt : result.updatedAt;
      if (dateFilter.from && ts < dateFilter.from) continue;
      if (dateFilter.to && ts > dateFilter.to) continue;
    }

    results.push(result);
  }

  // Sort by type group, then updatedAt desc
  const typeOrder: Record<SearchResultType, number> = { note: 0, clip: 1, task: 2, timeline: 3, whiteboard: 4, ioc: 5, chat: 6 };
  results.sort((a, b) => {
    const typeDiff = typeOrder[a.type] - typeOrder[b.type];
    if (typeDiff !== 0) return typeDiff;
    return b.updatedAt - a.updatedAt;
  });

  return { results: results.slice(0, MAX_RESULTS) };
}

function bestMatchField(match: Record<string, string[]>): string {
  // MiniSearch match object: { term: [field1, field2, ...], ... }
  // Pick the first field from the first term's matches
  for (const fields of Object.values(match)) {
    if (fields.length > 0) {
      const f = fields[0];
      if (f === 'title' || f === 'content' || f === 'tags') return f;
    }
  }
  return 'title';
}

function buildSearchResult(
  type: SearchResultType,
  entity: Note | Task | TimelineEvent | Whiteboard | StandaloneIOC | ChatThread,
  matchField: string,
  queryRaw: string,
): SearchResult | null {
  if (type === 'note' || type === 'clip') {
    const note = entity as Note;
    const text = matchField === 'title' ? note.title : matchField === 'tags' ? note.tags.join(', ') : note.content;
    return {
      id: note.id, type, title: note.title,
      snippet: generateSnippet(text, queryRaw, 120),
      tags: note.tags, createdAt: note.createdAt, updatedAt: note.updatedAt, matchField,
    };
  }
  if (type === 'task') {
    const task = entity as Task;
    const text = matchField === 'title' ? task.title : matchField === 'tags' ? task.tags.join(', ') : (task.description || '');
    return {
      id: task.id, type, title: task.title,
      snippet: generateSnippet(text, queryRaw, 120),
      tags: task.tags, createdAt: task.createdAt, updatedAt: task.updatedAt, matchField,
    };
  }
  if (type === 'timeline') {
    const ev = entity as TimelineEvent;
    const textMap: Record<string, string> = {
      title: ev.title, content: [ev.description || '', ev.source, ev.actor || ''].join(' '),
      tags: ev.tags.join(', '),
    };
    return {
      id: ev.id, type, title: ev.title,
      snippet: generateSnippet(textMap[matchField] || ev.title, queryRaw, 120),
      tags: ev.tags, createdAt: ev.createdAt, updatedAt: ev.updatedAt, matchField,
    };
  }
  if (type === 'whiteboard') {
    const wb = entity as Whiteboard;
    return {
      id: wb.id, type, title: wb.name,
      snippet: generateSnippet(matchField === 'tags' ? wb.tags.join(', ') : wb.name, queryRaw, 120),
      tags: wb.tags, createdAt: wb.createdAt, updatedAt: wb.updatedAt, matchField,
    };
  }
  if (type === 'ioc') {
    const ioc = entity as StandaloneIOC;
    const textMap: Record<string, string> = {
      title: ioc.value, content: [ioc.type, ioc.analystNotes || '', ioc.attribution || ''].join(' '),
      tags: ioc.tags.join(', '),
    };
    return {
      id: ioc.id, type, title: ioc.value,
      snippet: generateSnippet(textMap[matchField] || ioc.value, queryRaw, 120),
      tags: ioc.tags, createdAt: ioc.createdAt, updatedAt: ioc.updatedAt, matchField,
    };
  }
  if (type === 'chat') {
    const thread = entity as ChatThread;
    const text = matchField === 'title' ? thread.title :
      matchField === 'content' ? thread.messages.map((m) => m.content).join(' ') :
      thread.tags.join(', ');
    return {
      id: thread.id, type, title: thread.title,
      snippet: generateSnippet(text, queryRaw, 120),
      tags: thread.tags, createdAt: thread.createdAt, updatedAt: thread.updatedAt, matchField,
    };
  }
  return null;
}

// --- Cached data ---
let cachedNotes: Note[] = [];
let cachedTasks: Task[] = [];
let cachedClipsFolderId: string | undefined;
let cachedTimelineEvents: TimelineEvent[] | undefined;
let cachedWhiteboards: Whiteboard[] | undefined;
let cachedStandaloneIOCs: StandaloneIOC[] | undefined;
let cachedChatThreads: ChatThread[] | undefined;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;
  if (msg.type === 'data') {
    cachedNotes = msg.notes;
    cachedTasks = msg.tasks;
    cachedClipsFolderId = msg.clipsFolderId;
    cachedTimelineEvents = msg.timelineEvents;
    cachedWhiteboards = msg.whiteboards;
    cachedStandaloneIOCs = msg.standaloneIOCs;
    cachedChatThreads = msg.chatThreads;
    // Rebuild MiniSearch index
    buildIndex(cachedNotes, cachedTasks, cachedClipsFolderId, cachedTimelineEvents, cachedWhiteboards, cachedStandaloneIOCs, cachedChatThreads);
  } else if (msg.type === 'query') {
    // Use MiniSearch for simple mode, fall back to linear scan for regex/advanced
    if (msg.query.mode === 'simple' && searchIndex) {
      const result = indexedSimpleSearch(msg.query.raw, msg.folderId, msg.query.dateFilter);
      self.postMessage({ id: msg.id, result });
    } else {
      // Fallback: linear scan (regex, advanced, or index not ready)
      const fid = msg.folderId;
      const notes = fid ? cachedNotes.filter((n) => n.folderId === fid) : cachedNotes;
      const tasks = fid ? cachedTasks.filter((t) => t.folderId === fid) : cachedTasks;
      const events = fid && cachedTimelineEvents ? cachedTimelineEvents.filter((e) => e.folderId === fid) : cachedTimelineEvents;
      const wbs = fid && cachedWhiteboards ? cachedWhiteboards.filter((w) => w.folderId === fid) : cachedWhiteboards;
      const iocs = fid && cachedStandaloneIOCs ? cachedStandaloneIOCs.filter((i) => i.folderId === fid) : cachedStandaloneIOCs;
      const chats = fid && cachedChatThreads ? cachedChatThreads.filter((c) => c.folderId === fid) : cachedChatThreads;
      const result = unifiedSearch(notes, tasks, cachedClipsFolderId, msg.query, events, wbs, iocs, chats);
      self.postMessage({ id: msg.id, result });
    }
  }
};
