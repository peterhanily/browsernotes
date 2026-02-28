import { unifiedSearch } from '../lib/search';
import type { Note, Task, TimelineEvent, Whiteboard } from '../types';
import type { SearchQuery } from '../lib/search';

interface DataMessage {
  type: 'data';
  notes: Note[];
  tasks: Task[];
  clipsFolderId: string | undefined;
  timelineEvents?: TimelineEvent[];
  whiteboards?: Whiteboard[];
}

interface QueryMessage {
  type: 'query';
  id: number;
  query: SearchQuery;
}

type WorkerMessage = DataMessage | QueryMessage;

// Cached data — updated only when main thread sends new data
let cachedNotes: Note[] = [];
let cachedTasks: Task[] = [];
let cachedClipsFolderId: string | undefined;
let cachedTimelineEvents: TimelineEvent[] | undefined;
let cachedWhiteboards: Whiteboard[] | undefined;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;
  if (msg.type === 'data') {
    cachedNotes = msg.notes;
    cachedTasks = msg.tasks;
    cachedClipsFolderId = msg.clipsFolderId;
    cachedTimelineEvents = msg.timelineEvents;
    cachedWhiteboards = msg.whiteboards;
  } else if (msg.type === 'query') {
    const result = unifiedSearch(cachedNotes, cachedTasks, cachedClipsFolderId, msg.query, cachedTimelineEvents, cachedWhiteboards);
    self.postMessage({ id: msg.id, result });
  }
};
