import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasks } from '../hooks/useTasks';
import { db } from '../db';

describe('useTasks', () => {
  beforeEach(async () => {
    await db.tasks.clear();
  });

  it('starts with empty tasks', async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => {});
    expect(result.current.tasks).toEqual([]);
  });

  it('creates a task with defaults', async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => {});

    await act(async () => {
      await result.current.createTask();
    });

    expect(result.current.tasks).toHaveLength(1);
    const task = result.current.tasks[0];
    expect(task.title).toBe('');
    expect(task.completed).toBe(false);
    expect(task.priority).toBe('none');
    expect(task.status).toBe('todo');
    expect(task.tags).toEqual([]);
    expect(task.order).toBe(1);
  });

  it('creates a task with partial overrides', async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => {});

    await act(async () => {
      await result.current.createTask({ title: 'Buy groceries', priority: 'high', tags: ['personal'] });
    });

    const task = result.current.tasks[0];
    expect(task.title).toBe('Buy groceries');
    expect(task.priority).toBe('high');
    expect(task.tags).toEqual(['personal']);
  });

  it('auto-increments order', async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => {});

    await act(async () => {
      await result.current.createTask({ title: 'First' });
    });
    await act(async () => {
      await result.current.createTask({ title: 'Second' });
    });

    expect(result.current.tasks.find((t) => t.title === 'First')!.order).toBe(1);
    expect(result.current.tasks.find((t) => t.title === 'Second')!.order).toBe(2);
  });

  it('updates a task', async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => {});

    await act(async () => {
      await result.current.createTask({ title: 'Original' });
    });
    const id = result.current.tasks[0].id;

    await act(async () => {
      await result.current.updateTask(id, { title: 'Updated', priority: 'medium' });
    });

    expect(result.current.tasks[0].title).toBe('Updated');
    expect(result.current.tasks[0].priority).toBe('medium');
  });

  it('sets completed and completedAt when status is done', async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => {});

    await act(async () => {
      await result.current.createTask({ title: 'Finish me' });
    });
    const id = result.current.tasks[0].id;

    await act(async () => {
      await result.current.updateTask(id, { status: 'done' });
    });

    expect(result.current.tasks[0].completed).toBe(true);
    expect(result.current.tasks[0].completedAt).toBeGreaterThan(0);
    expect(result.current.tasks[0].status).toBe('done');
  });

  it('clears completed when status moves away from done', async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => {});

    await act(async () => {
      await result.current.createTask({ title: 'Reopen me' });
    });
    const id = result.current.tasks[0].id;

    await act(async () => {
      await result.current.updateTask(id, { status: 'done' });
    });
    expect(result.current.tasks[0].completed).toBe(true);

    await act(async () => {
      await result.current.updateTask(id, { status: 'in-progress' });
    });
    expect(result.current.tasks[0].completed).toBe(false);
    expect(result.current.tasks[0].completedAt).toBeUndefined();
  });

  it('deletes a task', async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => {});

    await act(async () => {
      await result.current.createTask({ title: 'Delete me' });
    });
    const id = result.current.tasks[0].id;

    await act(async () => {
      await result.current.deleteTask(id);
    });

    expect(result.current.tasks).toHaveLength(0);
  });

  it('toggles complete', async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => {});

    await act(async () => {
      await result.current.createTask({ title: 'Toggle me' });
    });
    const id = result.current.tasks[0].id;
    expect(result.current.tasks[0].completed).toBe(false);

    await act(async () => {
      await result.current.toggleComplete(id);
    });
    expect(result.current.tasks[0].completed).toBe(true);
    expect(result.current.tasks[0].status).toBe('done');

    await act(async () => {
      await result.current.toggleComplete(id);
    });
    expect(result.current.tasks[0].completed).toBe(false);
    expect(result.current.tasks[0].status).toBe('todo');
  });

  describe('taskCounts', () => {
    it('counts tasks by status', async () => {
      const { result } = renderHook(() => useTasks());
      await act(async () => {});

      await act(async () => {
        await result.current.createTask({ title: 'Todo 1', status: 'todo' });
        await result.current.createTask({ title: 'Todo 2', status: 'todo' });
        await result.current.createTask({ title: 'In Progress', status: 'in-progress' });
        await result.current.createTask({ title: 'Done', status: 'done', completed: true });
      });

      expect(result.current.taskCounts).toEqual({
        todo: 2,
        'in-progress': 1,
        done: 1,
        total: 4,
      });
    });
  });

  describe('getFilteredTasks', () => {
    it('filters by folderId', async () => {
      const { result } = renderHook(() => useTasks());
      await act(async () => {});

      await act(async () => {
        await result.current.createTask({ title: 'In Folder', folderId: 'f1' });
        await result.current.createTask({ title: 'No Folder' });
      });

      const filtered = result.current.getFilteredTasks({ folderId: 'f1' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('In Folder');
    });

    it('filters by tag', async () => {
      const { result } = renderHook(() => useTasks());
      await act(async () => {});

      await act(async () => {
        await result.current.createTask({ title: 'Tagged', tags: ['work'] });
        await result.current.createTask({ title: 'Untagged' });
      });

      const filtered = result.current.getFilteredTasks({ tag: 'work' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Tagged');
    });

    it('filters by status', async () => {
      const { result } = renderHook(() => useTasks());
      await act(async () => {});

      await act(async () => {
        await result.current.createTask({ title: 'Todo', status: 'todo' });
        await result.current.createTask({ title: 'Done', status: 'done' });
      });

      const filtered = result.current.getFilteredTasks({ status: 'todo' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Todo');
    });

    it('filters by search text', async () => {
      const { result } = renderHook(() => useTasks());
      await act(async () => {});

      await act(async () => {
        await result.current.createTask({ title: 'Buy groceries' });
        await result.current.createTask({ title: 'Fix bug', description: 'Something about groceries' });
        await result.current.createTask({ title: 'Clean house' });
      });

      const filtered = result.current.getFilteredTasks({ search: 'groceries' });
      expect(filtered).toHaveLength(2);
    });

    it('returns tasks sorted by order', async () => {
      const { result } = renderHook(() => useTasks());
      await act(async () => {});

      await act(async () => {
        await result.current.createTask({ title: 'Third', order: 3 });
        await result.current.createTask({ title: 'First', order: 1 });
        await result.current.createTask({ title: 'Second', order: 2 });
      });

      const filtered = result.current.getFilteredTasks({});
      expect(filtered.map((t) => t.title)).toEqual(['First', 'Second', 'Third']);
    });
  });

  describe('getTasksByStatus', () => {
    it('returns tasks for a given status sorted by order', async () => {
      const { result } = renderHook(() => useTasks());
      await act(async () => {});

      await act(async () => {
        await result.current.createTask({ title: 'Todo 1', status: 'todo' });
        await result.current.createTask({ title: 'In Progress', status: 'in-progress' });
        await result.current.createTask({ title: 'Todo 2', status: 'todo' });
      });

      const todos = result.current.getTasksByStatus('todo');
      expect(todos).toHaveLength(2);
      expect(todos.map((t) => t.title)).toEqual(['Todo 1', 'Todo 2']);
    });

    it('filters by folderId when provided', async () => {
      const { result } = renderHook(() => useTasks());
      await act(async () => {});

      await act(async () => {
        await result.current.createTask({ title: 'In Folder', status: 'todo', folderId: 'f1' });
        await result.current.createTask({ title: 'No Folder', status: 'todo' });
      });

      const todos = result.current.getTasksByStatus('todo', 'f1');
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe('In Folder');
    });
  });
});
