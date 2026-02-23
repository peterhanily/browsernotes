import { useState, useCallback, useMemo } from 'react';
import type { Note, IOCEntry, IOCType, IOCAnalysis } from '../types';
import { extractIOCs, mergeIOCAnalysis } from '../lib/ioc-extractor';

interface UseIOCAnalysisOptions {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
}

export function useIOCAnalysis({ note, onUpdate }: UseIOCAnalysisOptions) {
  const [analyzing, setAnalyzing] = useState(false);

  const analysis = note.iocAnalysis;

  const analyzeNote = useCallback(() => {
    setAnalyzing(true);
    try {
      const fresh = extractIOCs(note.content);
      const merged = mergeIOCAnalysis(note.iocAnalysis, fresh);
      const iocTypes = [...new Set(merged.iocs.filter((i) => !i.dismissed).map((i) => i.type))];
      onUpdate(note.id, { iocAnalysis: merged, iocTypes });
    } finally {
      setAnalyzing(false);
    }
  }, [note.id, note.content, note.iocAnalysis, onUpdate]);

  const updateIOC = useCallback((iocId: string, updates: Partial<IOCEntry>) => {
    if (!analysis) return;
    const updatedIOCs = analysis.iocs.map((ioc) =>
      ioc.id === iocId ? { ...ioc, ...updates } : ioc
    );
    const updated: IOCAnalysis = { ...analysis, iocs: updatedIOCs };
    const iocTypes = [...new Set(updatedIOCs.filter((i) => !i.dismissed).map((i) => i.type))];
    onUpdate(note.id, { iocAnalysis: updated, iocTypes });
  }, [note.id, analysis, onUpdate]);

  const updateSummary = useCallback((text: string) => {
    if (!analysis) return;
    onUpdate(note.id, { iocAnalysis: { ...analysis, analysisSummary: text } });
  }, [note.id, analysis, onUpdate]);

  const dismissIOC = useCallback((iocId: string) => {
    updateIOC(iocId, { dismissed: true });
  }, [updateIOC]);

  const restoreIOC = useCallback((iocId: string) => {
    updateIOC(iocId, { dismissed: false });
  }, [updateIOC]);

  const getIOCsByType = useCallback((): Map<IOCType, IOCEntry[]> => {
    if (!analysis) return new Map();
    const grouped = new Map<IOCType, IOCEntry[]>();
    for (const ioc of analysis.iocs) {
      const list = grouped.get(ioc.type) || [];
      list.push(ioc);
      grouped.set(ioc.type, list);
    }
    return grouped;
  }, [analysis]);

  const hasAnalysis = !!analysis;
  const iocCount = analysis?.iocs.filter((i) => !i.dismissed).length ?? 0;
  const lastAnalyzedAt = analysis?.extractedAt;

  const activeIOCs = useMemo(
    () => analysis?.iocs.filter((i) => !i.dismissed) ?? [],
    [analysis]
  );

  const dismissedIOCs = useMemo(
    () => analysis?.iocs.filter((i) => i.dismissed) ?? [],
    [analysis]
  );

  return {
    analysis,
    analyzing,
    analyzeNote,
    updateIOC,
    updateSummary,
    dismissIOC,
    restoreIOC,
    getIOCsByType,
    hasAnalysis,
    iocCount,
    lastAnalyzedAt,
    activeIOCs,
    dismissedIOCs,
  };
}
