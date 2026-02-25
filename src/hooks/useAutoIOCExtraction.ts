import { useEffect, useRef } from 'react';
import type { IOCAnalysis, IOCType } from '../types';
import { extractIOCs, mergeIOCAnalysis } from '../lib/ioc-extractor';

interface UseAutoIOCExtractionOptions {
  entityId: string | undefined;
  content: string;
  existingAnalysis: IOCAnalysis | undefined;
  onUpdate: (id: string, updates: { iocAnalysis: IOCAnalysis; iocTypes: IOCType[] }) => void;
  enabled?: boolean;
}

/**
 * Debounced auto-extraction of IOCs from content changes.
 * Skips the initial mount to avoid re-extracting when opening an entity.
 */
export function useAutoIOCExtraction({
  entityId,
  content,
  existingAnalysis,
  onUpdate,
  enabled = true,
}: UseAutoIOCExtractionOptions) {
  const mountedRef = useRef(false);
  const prevContentRef = useRef(content);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset mount flag when entity changes
  useEffect(() => {
    mountedRef.current = false;
    prevContentRef.current = content;
    clearTimeout(timerRef.current);
  }, [entityId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled || !entityId) return;

    // Skip if content hasn't actually changed (e.g. iocAnalysis update re-rendered parent)
    if (content === prevContentRef.current) return;
    prevContentRef.current = content;

    // Skip initial mount
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const fresh = extractIOCs(content);
      if (fresh.length === 0 && !existingAnalysis) return;
      const merged = mergeIOCAnalysis(existingAnalysis, fresh);
      const iocTypes = [...new Set(merged.iocs.filter((i) => !i.dismissed).map((i) => i.type))];
      onUpdate(entityId, { iocAnalysis: merged, iocTypes });
    }, 2000);

    return () => clearTimeout(timerRef.current);
  }, [content, entityId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);
}
