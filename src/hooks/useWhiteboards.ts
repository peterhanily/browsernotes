import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { Whiteboard } from '../types';
import { nanoid } from 'nanoid';

export function useWhiteboards() {
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWhiteboards = useCallback(async () => {
    const all = await db.whiteboards.toArray();
    setWhiteboards(all.sort((a, b) => a.order - b.order));
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWhiteboards();
  }, [loadWhiteboards]);

  const createWhiteboard = useCallback(async (name?: string): Promise<Whiteboard> => {
    const maxOrder = whiteboards.reduce((max, w) => Math.max(max, w.order), 0);
    const now = Date.now();
    const whiteboard: Whiteboard = {
      id: nanoid(),
      name: name || 'Untitled Whiteboard',
      elements: '[]',
      tags: [],
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };
    await db.whiteboards.add(whiteboard);
    setWhiteboards((prev) => [...prev, whiteboard].sort((a, b) => a.order - b.order));
    return whiteboard;
  }, [whiteboards]);

  const updateWhiteboard = useCallback(async (id: string, updates: Partial<Whiteboard>) => {
    const patched = { ...updates, updatedAt: Date.now() };
    await db.whiteboards.update(id, patched);
    setWhiteboards((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...patched } : w)).sort((a, b) => a.order - b.order)
    );
  }, []);

  const deleteWhiteboard = useCallback(async (id: string) => {
    await db.whiteboards.delete(id);
    setWhiteboards((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return {
    whiteboards,
    loading,
    createWhiteboard,
    updateWhiteboard,
    deleteWhiteboard,
    reload: loadWhiteboards,
  };
}
