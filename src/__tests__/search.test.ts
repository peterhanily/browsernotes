import { describe, it, expect } from 'vitest';
import { searchNotes, searchTasks } from '../lib/search';
import type { Note, Task } from '../types';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: '1',
    title: 'Test Note',
    content: 'Some content here',
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
    id: '1',
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

describe('searchNotes', () => {
  const notes = [
    makeNote({ id: '1', title: 'Meeting Notes', content: 'Discuss project timeline' }),
    makeNote({ id: '2', title: 'Recipe', content: 'Chocolate cake recipe', tags: ['food'] }),
    makeNote({ id: '3', title: 'Ideas', content: 'App ideas for 2024' }),
  ];

  it('returns all notes for empty query', () => {
    expect(searchNotes(notes, '')).toHaveLength(3);
    expect(searchNotes(notes, '  ')).toHaveLength(3);
  });

  it('searches by title', () => {
    const results = searchNotes(notes, 'meeting');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  it('searches by content', () => {
    const results = searchNotes(notes, 'chocolate');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('2');
  });

  it('searches by tag', () => {
    const results = searchNotes(notes, 'food');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('2');
  });

  it('is case-insensitive', () => {
    expect(searchNotes(notes, 'MEETING')).toHaveLength(1);
    expect(searchNotes(notes, 'Chocolate')).toHaveLength(1);
  });

  it('returns empty for no matches', () => {
    expect(searchNotes(notes, 'nonexistent')).toHaveLength(0);
  });
});

describe('searchTasks', () => {
  const tasks = [
    makeTask({ id: '1', title: 'Fix bug', description: 'Login page crashes' }),
    makeTask({ id: '2', title: 'Write docs', tags: ['documentation'] }),
    makeTask({ id: '3', title: 'Deploy app' }),
  ];

  it('returns all tasks for empty query', () => {
    expect(searchTasks(tasks, '')).toHaveLength(3);
  });

  it('searches by title', () => {
    const results = searchTasks(tasks, 'fix');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  it('searches by description', () => {
    const results = searchTasks(tasks, 'login');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  it('searches by tag', () => {
    const results = searchTasks(tasks, 'documentation');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('2');
  });
});
