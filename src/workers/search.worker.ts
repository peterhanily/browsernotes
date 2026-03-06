import { unifiedSearch } from '../lib/search';
import type { Note, Task, TimelineEvent, Whiteboard, StandaloneIOC, ChatThread } from '../types';
import type { SearchQuery } from '../lib/search';

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

// Cached data — updated only when main thread sends new data
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
  } else if (msg.type === 'query') {
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
};
