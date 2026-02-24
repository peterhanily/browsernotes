import { useState, useCallback } from 'react';
import { useSettings } from './useSettings';
import { exportJSON } from '../lib/export';
import type { Note, ExportData } from '../types';
import {
  validatePAR,
  buildNoteEnvelope,
  buildIOCReportEnvelope,
  buildFullBackupEnvelope,
  buildObjectKey,
  ociPut,
} from '../lib/oci-sync';
import { formatIOCsFlatJSON, slugify } from '../lib/ioc-export';
import type { IOCExportEntry, ThreatIntelExportConfig } from '../lib/ioc-export';

export function useOCISync() {
  const { settings } = useSettings();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const requireWritePAR = useCallback((): string => {
    const par = settings.ociWritePAR;
    if (!par) throw new Error('No write PAR URL configured. Go to Settings > OCI Object Storage to set one.');
    const validation = validatePAR(par);
    if (!validation.valid) throw new Error(validation.error);
    return par;
  }, [settings.ociWritePAR]);

  const pushFullBackup = useCallback(async () => {
    setSyncing(true);
    setError(null);
    setProgress('Exporting data...');
    try {
      const writePAR = requireWritePAR();
      const label = settings.ociLabel || 'default';

      const json = await exportJSON();
      const exportData: ExportData = JSON.parse(json);

      setProgress('Building envelope...');
      const envelope = buildFullBackupEnvelope(exportData, label);
      const objectKey = buildObjectKey('full-backup', '', label);
      const data = JSON.stringify(envelope, null, 2);

      setProgress('Uploading backup...');
      const result = await ociPut(writePAR, objectKey, data);
      if (!result.ok) throw new Error(result.error || 'Upload failed');

      setLastSyncAt(Date.now());
      setProgress('Backup uploaded successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push failed');
      setProgress('');
    } finally {
      setSyncing(false);
    }
  }, [requireWritePAR, settings.ociLabel]);

  const shareNote = useCallback(async (note: Note, clipsFolderId?: string) => {
    setSyncing(true);
    setError(null);
    setProgress('Sharing note...');
    try {
      const writePAR = requireWritePAR();
      const label = settings.ociLabel || 'default';

      const envelope = buildNoteEnvelope(note, label, clipsFolderId);
      const objectKey = buildObjectKey(envelope.type, note.id, label);
      const data = JSON.stringify(envelope, null, 2);

      const result = await ociPut(writePAR, objectKey, data);
      if (!result.ok) throw new Error(result.error || 'Upload failed');

      setProgress('Shared successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed');
      setProgress('');
    } finally {
      setSyncing(false);
    }
  }, [requireWritePAR, settings.ociLabel]);

  const shareIOCReport = useCallback(async (note: Note) => {
    setSyncing(true);
    setError(null);
    setProgress('Sharing IOC report...');
    try {
      const writePAR = requireWritePAR();
      const label = settings.ociLabel || 'default';

      const envelope = buildIOCReportEnvelope(note, label);
      const objectKey = buildObjectKey('ioc-report', note.id, label);
      const data = JSON.stringify(envelope, null, 2);

      const result = await ociPut(writePAR, objectKey, data);
      if (!result.ok) throw new Error(result.error || 'Upload failed');

      setProgress('IOC report shared successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed');
      setProgress('');
    } finally {
      setSyncing(false);
    }
  }, [requireWritePAR, settings.ociLabel]);

  const pushIOCs = useCallback(async (
    entries: IOCExportEntry[],
    slug: string,
    typeSlug?: string,
    tiExportConfig?: ThreatIntelExportConfig,
  ) => {
    setSyncing(true);
    setError(null);
    setProgress('Pushing IOCs...');
    try {
      const writePAR = requireWritePAR();
      const data = formatIOCsFlatJSON(entries, tiExportConfig);
      const timestamp = Date.now();
      const safeSlug = slugify(slug) || 'iocs';
      const objectKey = typeSlug
        ? `browsernotes/iocs/${safeSlug}-${typeSlug}-${timestamp}.json`
        : `browsernotes/iocs/${safeSlug}-${timestamp}.json`;

      const result = await ociPut(writePAR, objectKey, data);
      if (!result.ok) throw new Error(result.error || 'Upload failed');

      setProgress('IOCs pushed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push failed');
      setProgress('');
    } finally {
      setSyncing(false);
    }
  }, [requireWritePAR]);

  return {
    syncing,
    progress,
    error,
    lastSyncAt,
    pushFullBackup,
    shareNote,
    shareIOCReport,
    pushIOCs,
  };
}
