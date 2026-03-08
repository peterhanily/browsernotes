/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlaybooks } from '../hooks/usePlaybooks';
import { db } from '../db';
import { BUILTIN_PLAYBOOKS } from '../lib/builtin-playbooks';
import { BUILTIN_NOTE_TEMPLATES } from '../lib/builtin-templates';
import type { Folder, PlaybookTemplate } from '../types';

describe('usePlaybooks', () => {
  beforeEach(async () => {
    await db.playbookTemplates.clear();
    await db.notes.clear();
    await db.tasks.clear();
    await db.folders.clear();
    await db.timelines.clear();
  });

  it('starts with builtin playbooks and loading false after init', async () => {
    const { result } = renderHook(() => usePlaybooks());
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.builtinPlaybooks).toBe(BUILTIN_PLAYBOOKS);
    expect(result.current.playbooks.length).toBe(BUILTIN_PLAYBOOKS.length);
    expect(result.current.userPlaybooks).toEqual([]);
  });

  it('returns builtin playbooks with source "builtin"', async () => {
    const { result } = renderHook(() => usePlaybooks());
    await act(async () => {});

    for (const p of result.current.builtinPlaybooks) {
      expect(p.source).toBe('builtin');
    }
  });

  // ─── Create ────────────────────────────────────────────────────

  describe('createPlaybook', () => {
    it('creates a user playbook with required fields', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      let created: PlaybookTemplate;
      await act(async () => {
        created = await result.current.createPlaybook({
          name: 'Custom Playbook',
          steps: [
            { order: 1, entityType: 'task', title: 'Step 1', content: 'Do something', priority: 'high', status: 'todo' },
          ],
        });
      });

      expect(created!.name).toBe('Custom Playbook');
      expect(created!.source).toBe('user');
      expect(created!.investigationType).toBe('custom');
      expect(created!.steps).toHaveLength(1);
      expect(created!.id).toBeTruthy();
      expect(created!.createdAt).toBeGreaterThan(0);
      expect(created!.updatedAt).toBeGreaterThan(0);
    });

    it('creates a playbook with optional fields', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      let created: PlaybookTemplate;
      await act(async () => {
        created = await result.current.createPlaybook({
          name: 'Full Playbook',
          description: 'A full test playbook',
          icon: '🔒',
          investigationType: 'incident-response',
          defaultTags: ['ir', 'critical'],
          defaultClsLevel: 'TLP:RED',
          defaultPapLevel: 'PAP:RED',
          steps: [
            { order: 1, entityType: 'note', title: 'Triage', content: 'triage content' },
            { order: 2, entityType: 'task', title: 'Contain', content: 'contain threat', priority: 'high', status: 'todo' },
          ],
        });
      });

      expect(created!.description).toBe('A full test playbook');
      expect(created!.icon).toBe('🔒');
      expect(created!.investigationType).toBe('incident-response');
      expect(created!.defaultTags).toEqual(['ir', 'critical']);
      expect(created!.defaultClsLevel).toBe('TLP:RED');
      expect(created!.defaultPapLevel).toBe('PAP:RED');
      expect(created!.steps).toHaveLength(2);
    });

    it('adds to both userPlaybooks and playbooks (combined)', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      await act(async () => {
        await result.current.createPlaybook({
          name: 'Custom 1',
          steps: [{ order: 1, entityType: 'task', title: 'Step', content: '' }],
        });
      });

      expect(result.current.userPlaybooks).toHaveLength(1);
      expect(result.current.playbooks.length).toBe(BUILTIN_PLAYBOOKS.length + 1);
    });

    it('persists the playbook to IndexedDB', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      await act(async () => {
        await result.current.createPlaybook({
          name: 'Persisted',
          steps: [{ order: 1, entityType: 'task', title: 'Step', content: '' }],
        });
      });

      const stored = await db.playbookTemplates.toArray();
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Persisted');
      expect(stored[0].source).toBe('user');
    });

    it('defaults investigationType to "custom" when not provided', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      let created: PlaybookTemplate;
      await act(async () => {
        created = await result.current.createPlaybook({
          name: 'No Type',
          steps: [],
        });
      });

      expect(created!.investigationType).toBe('custom');
    });
  });

  // ─── Update ────────────────────────────────────────────────────

  describe('updatePlaybook', () => {
    it('updates a user playbook', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      let created: PlaybookTemplate;
      await act(async () => {
        created = await result.current.createPlaybook({
          name: 'Original',
          steps: [{ order: 1, entityType: 'task', title: 'Old Step', content: '' }],
        });
      });

      await act(async () => {
        await result.current.updatePlaybook(created!.id, {
          name: 'Updated',
          description: 'Now with description',
        });
      });

      const updated = result.current.userPlaybooks.find((p) => p.id === created!.id);
      expect(updated!.name).toBe('Updated');
      expect(updated!.description).toBe('Now with description');
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(created!.updatedAt);
    });

    it('persists updates to IndexedDB', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      let created: PlaybookTemplate;
      await act(async () => {
        created = await result.current.createPlaybook({
          name: 'Original',
          steps: [],
        });
      });

      await act(async () => {
        await result.current.updatePlaybook(created!.id, { name: 'Patched' });
      });

      const stored = await db.playbookTemplates.get(created!.id);
      expect(stored!.name).toBe('Patched');
    });

    it('sets updatedAt on update', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      let created: PlaybookTemplate;
      await act(async () => {
        created = await result.current.createPlaybook({ name: 'For Update', steps: [] });
      });

      const originalUpdatedAt = created!.updatedAt;
      await new Promise((r) => setTimeout(r, 10));

      await act(async () => {
        await result.current.updatePlaybook(created!.id, { name: 'Renamed' });
      });

      const updated = result.current.userPlaybooks.find((p) => p.id === created!.id);
      expect(updated!.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });

  // ─── Delete ────────────────────────────────────────────────────

  describe('deletePlaybook', () => {
    it('removes a user playbook from state and DB', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      let created: PlaybookTemplate;
      await act(async () => {
        created = await result.current.createPlaybook({
          name: 'Doomed',
          steps: [],
        });
      });

      expect(result.current.userPlaybooks).toHaveLength(1);

      await act(async () => {
        await result.current.deletePlaybook(created!.id);
      });

      expect(result.current.userPlaybooks).toHaveLength(0);
      expect(result.current.playbooks.length).toBe(BUILTIN_PLAYBOOKS.length);

      const stored = await db.playbookTemplates.get(created!.id);
      expect(stored).toBeUndefined();
    });

    it('does not affect other playbooks when deleting one', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      let second: PlaybookTemplate;
      await act(async () => {
        await result.current.createPlaybook({ name: 'Keep', steps: [] });
        second = await result.current.createPlaybook({ name: 'Delete', steps: [] });
      });

      await act(async () => {
        await result.current.deletePlaybook(second!.id);
      });

      expect(result.current.userPlaybooks).toHaveLength(1);
      expect(result.current.userPlaybooks[0].name).toBe('Keep');
    });
  });

  // ─── Instantiate ──────────────────────────────────────────────

  describe('instantiate', () => {
    function makeFolder(name = 'Test Investigation'): Folder {
      return {
        id: 'folder-1',
        name,
        order: 1,
        createdAt: Date.now(),
      };
    }

    it('creates notes and tasks from a builtin playbook', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      // Add the folder to DB so update works
      const folder = makeFolder();
      await db.folders.add(folder);

      const playbook = BUILTIN_PLAYBOOKS[0]; // Incident Response (Generic)
      const noteSteps = playbook.steps.filter((s) => s.entityType === 'note');
      const taskSteps = playbook.steps.filter((s) => s.entityType === 'task');

      let instantiated: Awaited<ReturnType<typeof result.current.instantiate>>;
      await act(async () => {
        instantiated = await result.current.instantiate(playbook.id, folder, BUILTIN_NOTE_TEMPLATES);
      });

      expect(instantiated!.notes).toHaveLength(noteSteps.length);
      expect(instantiated!.tasks).toHaveLength(taskSteps.length);
    });

    it('sets correct fields on instantiated notes', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      const folder = makeFolder();
      await db.folders.add(folder);

      const playbook = BUILTIN_PLAYBOOKS[0];

      let instantiated: Awaited<ReturnType<typeof result.current.instantiate>>;
      await act(async () => {
        instantiated = await result.current.instantiate(playbook.id, folder, BUILTIN_NOTE_TEMPLATES);
      });

      for (const note of instantiated!.notes) {
        expect(note.folderId).toBe(folder.id);
        expect(note.id).toBeTruthy();
        expect(note.pinned).toBe(false);
        expect(note.archived).toBe(false);
        expect(note.trashed).toBe(false);
        expect(note.createdAt).toBeGreaterThan(0);
        expect(note.updatedAt).toBeGreaterThan(0);
      }
    });

    it('sets correct fields on instantiated tasks', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      const folder = makeFolder();
      await db.folders.add(folder);

      const playbook = BUILTIN_PLAYBOOKS[0];

      let instantiated: Awaited<ReturnType<typeof result.current.instantiate>>;
      await act(async () => {
        instantiated = await result.current.instantiate(playbook.id, folder, BUILTIN_NOTE_TEMPLATES);
      });

      for (const task of instantiated!.tasks) {
        expect(task.folderId).toBe(folder.id);
        expect(task.id).toBeTruthy();
        expect(task.completed).toBe(false);
        expect(task.trashed).toBe(false);
        expect(task.archived).toBe(false);
        expect(task.createdAt).toBeGreaterThan(0);
      }
    });

    it('applies note template content when noteTemplateId is specified', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      const folder = makeFolder();
      await db.folders.add(folder);

      // IR playbook has steps referencing note templates like bt-ir-triage
      const playbook = BUILTIN_PLAYBOOKS[0];
      const noteStepWithTemplate = playbook.steps.find((s) => s.entityType === 'note' && s.noteTemplateId);

      if (!noteStepWithTemplate) return; // safety

      const expectedTemplate = BUILTIN_NOTE_TEMPLATES.find((t) => t.id === noteStepWithTemplate.noteTemplateId);

      let instantiated: Awaited<ReturnType<typeof result.current.instantiate>>;
      await act(async () => {
        instantiated = await result.current.instantiate(playbook.id, folder, BUILTIN_NOTE_TEMPLATES);
      });

      const matchingNote = instantiated!.notes.find((n) => n.title === noteStepWithTemplate.title);
      expect(matchingNote).toBeDefined();
      expect(matchingNote!.content).toBe(expectedTemplate!.content);
    });

    it('persists notes and tasks to IndexedDB', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      const folder = makeFolder();
      await db.folders.add(folder);

      const playbook = BUILTIN_PLAYBOOKS[0];

      let instantiated: Awaited<ReturnType<typeof result.current.instantiate>>;
      await act(async () => {
        instantiated = await result.current.instantiate(playbook.id, folder, BUILTIN_NOTE_TEMPLATES);
      });

      const storedNotes = await db.notes.where('folderId').equals(folder.id).toArray();
      const storedTasks = await db.tasks.where('folderId').equals(folder.id).toArray();

      expect(storedNotes.length).toBe(instantiated!.notes.length);
      expect(storedTasks.length).toBe(instantiated!.tasks.length);
    });

    it('creates a timeline for the investigation', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      const folder = makeFolder('IR Case 42');
      await db.folders.add(folder);

      const playbook = BUILTIN_PLAYBOOKS[0];

      await act(async () => {
        await result.current.instantiate(playbook.id, folder, BUILTIN_NOTE_TEMPLATES);
      });

      const timelines = await db.timelines.toArray();
      expect(timelines.length).toBeGreaterThanOrEqual(1);
      const created = timelines.find((t) => t.name === 'IR Case 42');
      expect(created).toBeDefined();
    });

    it('updates folder with timelineId', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      const folder = makeFolder();
      await db.folders.add(folder);

      const playbook = BUILTIN_PLAYBOOKS[0];

      await act(async () => {
        await result.current.instantiate(playbook.id, folder, BUILTIN_NOTE_TEMPLATES);
      });

      const updatedFolder = await db.folders.get(folder.id);
      expect(updatedFolder!.timelineId).toBeTruthy();
    });

    it('applies defaultClsLevel to folder', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      const folder = makeFolder();
      await db.folders.add(folder);

      // IR playbook has defaultClsLevel: 'TLP:AMBER'
      const playbook = BUILTIN_PLAYBOOKS.find((p) => p.defaultClsLevel);
      if (!playbook) return; // safety

      await act(async () => {
        await result.current.instantiate(playbook.id, folder, BUILTIN_NOTE_TEMPLATES);
      });

      const updatedFolder = await db.folders.get(folder.id);
      expect(updatedFolder!.clsLevel).toBe(playbook.defaultClsLevel);
    });

    it('applies defaultTags to folder', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      const folder = makeFolder();
      folder.tags = ['existing-tag'];
      await db.folders.add(folder);

      const playbook = BUILTIN_PLAYBOOKS.find((p) => p.defaultTags && p.defaultTags.length > 0);
      if (!playbook) return;

      await act(async () => {
        await result.current.instantiate(playbook.id, folder, BUILTIN_NOTE_TEMPLATES);
      });

      const updatedFolder = await db.folders.get(folder.id);
      expect(updatedFolder!.tags).toContain('existing-tag');
      for (const tag of playbook.defaultTags!) {
        expect(updatedFolder!.tags).toContain(tag);
      }
    });

    it('includes phase as a tag on instantiated entities', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      const folder = makeFolder();
      await db.folders.add(folder);

      const playbook = BUILTIN_PLAYBOOKS[0];
      const stepWithPhase = playbook.steps.find((s) => s.phase);

      if (!stepWithPhase) return;

      let instantiated: Awaited<ReturnType<typeof result.current.instantiate>>;
      await act(async () => {
        instantiated = await result.current.instantiate(playbook.id, folder, BUILTIN_NOTE_TEMPLATES);
      });

      const allEntities = [...instantiated!.notes, ...instantiated!.tasks];
      const matchingEntity = allEntities.find((e) => e.title === stepWithPhase.title);
      expect(matchingEntity).toBeDefined();
      expect(matchingEntity!.tags).toContain(stepWithPhase.phase!.toLowerCase());
    });

    it('throws when playbook id is not found', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      const folder = makeFolder();

      await expect(
        act(async () => {
          await result.current.instantiate('nonexistent-id', folder, []);
        }),
      ).rejects.toThrow('Playbook not found');
    });

    it('instantiates a custom user playbook', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      let created: PlaybookTemplate;
      await act(async () => {
        created = await result.current.createPlaybook({
          name: 'My Custom Playbook',
          steps: [
            { order: 1, entityType: 'note', title: 'Investigation Notes', content: '# Start here' },
            { order: 2, entityType: 'task', title: 'First action', content: 'Do this first', priority: 'high', status: 'todo' },
            { order: 3, entityType: 'task', title: 'Second action', content: 'Do this second', priority: 'medium', status: 'todo' },
          ],
        });
      });

      const folder = makeFolder('Custom Case');
      await db.folders.add(folder);

      let instantiated: Awaited<ReturnType<typeof result.current.instantiate>>;
      await act(async () => {
        instantiated = await result.current.instantiate(created!.id, folder, []);
      });

      expect(instantiated!.notes).toHaveLength(1);
      expect(instantiated!.notes[0].title).toBe('Investigation Notes');
      expect(instantiated!.notes[0].content).toBe('# Start here');

      expect(instantiated!.tasks).toHaveLength(2);
      expect(instantiated!.tasks[0].title).toBe('First action');
      expect(instantiated!.tasks[0].priority).toBe('high');
      expect(instantiated!.tasks[1].title).toBe('Second action');
      expect(instantiated!.tasks[1].priority).toBe('medium');
    });

    it('sets task order and status from playbook step', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      let created: PlaybookTemplate;
      await act(async () => {
        created = await result.current.createPlaybook({
          name: 'Order Test',
          steps: [
            { order: 5, entityType: 'task', title: 'Task at 5', content: '', priority: 'none', status: 'in-progress' },
            { order: 10, entityType: 'task', title: 'Task at 10', content: '', priority: 'low', status: 'todo' },
          ],
        });
      });

      const folder = makeFolder();
      await db.folders.add(folder);

      let instantiated: Awaited<ReturnType<typeof result.current.instantiate>>;
      await act(async () => {
        instantiated = await result.current.instantiate(created!.id, folder, []);
      });

      expect(instantiated!.tasks[0].order).toBe(5);
      expect(instantiated!.tasks[0].status).toBe('in-progress');
      expect(instantiated!.tasks[1].order).toBe(10);
      expect(instantiated!.tasks[1].status).toBe('todo');
    });

    it('defaults task priority to "none" and status to "todo" when not specified', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      let created: PlaybookTemplate;
      await act(async () => {
        created = await result.current.createPlaybook({
          name: 'Default Test',
          steps: [
            { order: 1, entityType: 'task', title: 'No priority/status', content: '' },
          ],
        });
      });

      const folder = makeFolder();
      await db.folders.add(folder);

      let instantiated: Awaited<ReturnType<typeof result.current.instantiate>>;
      await act(async () => {
        instantiated = await result.current.instantiate(created!.id, folder, []);
      });

      expect(instantiated!.tasks[0].priority).toBe('none');
      expect(instantiated!.tasks[0].status).toBe('todo');
    });
  });

  // ─── Reload ────────────────────────────────────────────────────

  describe('reload', () => {
    it('reloads playbooks from DB', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      // Add directly to DB
      await db.playbookTemplates.add({
        id: 'direct-add', name: 'Direct', steps: [], investigationType: 'custom',
        source: 'user', createdAt: Date.now(), updatedAt: Date.now(),
      });

      expect(result.current.userPlaybooks.find((p) => p.id === 'direct-add')).toBeUndefined();

      await act(async () => {
        await result.current.reload();
      });

      expect(result.current.userPlaybooks.find((p) => p.id === 'direct-add')).toBeDefined();
    });
  });

  // ─── Combined list ────────────────────────────────────────────

  describe('playbooks (combined list)', () => {
    it('contains builtins followed by user playbooks', async () => {
      const { result } = renderHook(() => usePlaybooks());
      await act(async () => {});

      await act(async () => {
        await result.current.createPlaybook({ name: 'User 1', steps: [] });
        await result.current.createPlaybook({ name: 'User 2', steps: [] });
      });

      const playbooks = result.current.playbooks;
      expect(playbooks.length).toBe(BUILTIN_PLAYBOOKS.length + 2);

      for (let i = 0; i < BUILTIN_PLAYBOOKS.length; i++) {
        expect(playbooks[i].source).toBe('builtin');
      }
      expect(playbooks[playbooks.length - 2].source).toBe('user');
      expect(playbooks[playbooks.length - 1].source).toBe('user');
    });
  });
});
