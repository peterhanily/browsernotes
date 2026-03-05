import { useState, useEffect, useCallback } from 'react';
import { Shield, Loader2, Trash2, Download, Upload, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { db } from '../../db';
import { encryptBackup, decryptBackup, type BackupPayload, type EncryptedBackupBlob } from '../../lib/backup-crypto';
import { buildFullBackupPayload, buildDifferentialPayload, countPayloadEntities } from '../../lib/backup-data';
import { restoreFullReplace, restoreMerge, type RestoreResult } from '../../lib/backup-restore';
import {
  createBackup, listBackups, downloadBackup, deleteBackup,
  type BackupMeta,
} from '../../lib/server-api';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import type { Folder } from '../../types';

type CreateStep = 'idle' | 'collecting' | 'encrypting' | 'uploading' | 'done' | 'error';
type RestoreStep = 'idle' | 'downloading' | 'decrypting' | 'preview' | 'restoring' | 'done' | 'error';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ServerBackup() {
  const { settings } = useSettings();
  const isConnected = !!settings.serverUrl;

  // Backup list
  const [backupsList, setBackupsList] = useState<BackupMeta[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // Create state
  const [scope, setScope] = useState<'all' | 'investigation' | 'entity'>('all');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [backupType, setBackupType] = useState<'full' | 'differential'>('full');
  const [backupName, setBackupName] = useState(() => `backup-${new Date().toISOString().slice(0, 10)}`);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [createStep, setCreateStep] = useState<CreateStep>('idle');
  const [createError, setCreateError] = useState('');

  // Restore state
  const [restoreBackupId, setRestoreBackupId] = useState<string | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreStep, setRestoreStep] = useState<RestoreStep>('idle');
  const [restoreError, setRestoreError] = useState('');
  const [restorePayload, setRestorePayload] = useState<BackupPayload | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Folders for investigation scope
  const [folders, setFolders] = useState<Folder[]>([]);

  useEffect(() => {
    db.folders.toArray().then(setFolders);
  }, []);

  const refreshList = useCallback(async () => {
    if (!isConnected) return;
    setListLoading(true);
    try {
      const result = await listBackups();
      setBackupsList(result.backups);
    } catch {
      // silently fail on list
    } finally {
      setListLoading(false);
    }
  }, [isConnected]);

  useEffect(() => { refreshList(); }, [refreshList]);

  // Check if differential is available (need a prior full backup for this scope)
  const hasFullBackup = backupsList.some(
    (b) => b.type === 'full' && b.scope === scope &&
      (scope !== 'investigation' || b.scopeId === selectedFolderId),
  );

  const latestFullBackup = backupsList.find(
    (b) => b.type === 'full' && b.scope === scope &&
      (scope !== 'investigation' || b.scopeId === selectedFolderId),
  );

  const handleCreate = async () => {
    setCreateError('');
    if (password.length < 12) { setCreateError('Password must be at least 12 characters'); return; }
    if (password !== confirmPassword) { setCreateError('Passwords do not match'); return; }
    if (scope === 'investigation' && !selectedFolderId) { setCreateError('Select an investigation'); return; }

    try {
      // 1. Collect data
      setCreateStep('collecting');
      let payload: BackupPayload;
      if (backupType === 'differential' && latestFullBackup) {
        const lastBackupAt = new Date(latestFullBackup.createdAt).getTime();
        payload = await buildDifferentialPayload(
          scope, lastBackupAt, latestFullBackup.id,
          scope === 'investigation' ? selectedFolderId : undefined,
        );
      } else {
        payload = await buildFullBackupPayload(
          scope,
          scope === 'investigation' ? selectedFolderId : undefined,
        );
      }

      // 2. Encrypt
      setCreateStep('encrypting');
      const encrypted = await encryptBackup(password, payload);
      const blob = new Blob([JSON.stringify(encrypted)], { type: 'application/octet-stream' });

      // 3. Upload
      setCreateStep('uploading');
      await createBackup(
        {
          name: backupName,
          type: backupType,
          scope,
          scopeId: scope === 'investigation' ? selectedFolderId : undefined,
          entityCount: countPayloadEntities(payload),
          parentBackupId: backupType === 'differential' ? latestFullBackup?.id : undefined,
        },
        blob,
      );

      setCreateStep('done');
      setPassword('');
      setConfirmPassword('');
      refreshList();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Backup failed');
      setCreateStep('error');
    }
  };

  const handleDecrypt = async () => {
    if (!restoreBackupId) return;
    setRestoreError('');

    try {
      setRestoreStep('downloading');
      const blob = await downloadBackup(restoreBackupId);
      const text = await blob.text();

      setRestoreStep('decrypting');
      const encrypted = JSON.parse(text) as EncryptedBackupBlob;
      const payload = await decryptBackup(restorePassword, encrypted);

      setRestorePayload(payload);
      setRestoreStep('preview');
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Decryption failed');
      setRestoreStep('error');
    }
  };

  const handleRestore = async (mode: 'replace' | 'merge') => {
    if (!restorePayload) return;
    setRestoreError('');
    setRestoreStep('restoring');

    try {
      let result: RestoreResult;
      if (mode === 'replace') {
        result = await restoreFullReplace(restorePayload);
      } else {
        result = await restoreMerge(restorePayload);
      }
      setRestoreResult(result);
      setRestoreStep('done');
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Restore failed');
      setRestoreStep('error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteBackup(deleteId);
      setDeleteId(null);
      refreshList();
    } catch {
      // ignore
    }
  };

  const resetRestore = () => {
    setRestoreBackupId(null);
    setRestorePassword('');
    setRestoreStep('idle');
    setRestoreError('');
    setRestorePayload(null);
    setRestoreResult(null);
  };

  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent';
  const btnClass = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors';

  if (!isConnected) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Shield size={16} />
          Server Encrypted Backups
        </h3>
        <p className="text-xs text-gray-500">Connect to a team server to use encrypted backups.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
        <Shield size={16} />
        Server Encrypted Backups
      </h3>
      <p className="text-xs text-gray-500">
        Password-protected backups stored on the server. Even admins cannot read them.
      </p>

      {/* ─── Create Backup ─── */}
      <div className="bg-gray-800/30 rounded-lg p-3 space-y-3">
        <h4 className="text-xs font-semibold text-gray-400">Create Backup</h4>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Scope</label>
          <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className={inputClass}>
            <option value="all">All Data</option>
            <option value="investigation">Investigation</option>
          </select>
        </div>

        {scope === 'investigation' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Investigation</label>
            <select value={selectedFolderId} onChange={(e) => setSelectedFolderId(e.target.value)} className={inputClass}>
              <option value="">Select...</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            value={backupType}
            onChange={(e) => setBackupType(e.target.value as 'full' | 'differential')}
            className={inputClass}
          >
            <option value="full">Full</option>
            <option value="differential" disabled={!hasFullBackup}>
              Differential{!hasFullBackup ? ' (needs full backup first)' : ''}
            </option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Name</label>
          <input type="text" value={backupName} onChange={(e) => setBackupName(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Password (min 12 chars)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Encryption password" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Confirm password" />
        </div>

        {createError && (
          <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {createError}</p>
        )}

        {createStep !== 'idle' && createStep !== 'error' && createStep !== 'done' && (
          <p className="text-xs text-accent flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" />
            {createStep === 'collecting' && 'Collecting data...'}
            {createStep === 'encrypting' && 'Encrypting...'}
            {createStep === 'uploading' && 'Uploading to server...'}
          </p>
        )}

        {createStep === 'done' && (
          <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Backup created successfully</p>
        )}

        <button
          onClick={handleCreate}
          disabled={createStep === 'collecting' || createStep === 'encrypting' || createStep === 'uploading'}
          className={`${btnClass} bg-accent hover:bg-accent-hover text-white disabled:opacity-50`}
        >
          {(createStep === 'collecting' || createStep === 'encrypting' || createStep === 'uploading')
            ? <Loader2 size={16} className="animate-spin" />
            : <Upload size={16} />}
          Create Backup
        </button>
      </div>

      {/* ─── Backup List ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-400">Your Backups</h4>
          {listLoading && <Loader2 size={12} className="animate-spin text-gray-500" />}
        </div>

        {backupsList.length === 0 && !listLoading && (
          <p className="text-xs text-gray-600">No backups yet.</p>
        )}

        {backupsList.map((b) => (
          <div key={b.id} className="bg-gray-800/50 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Lock size={12} className="text-gray-500" />
              <span className="text-sm text-gray-200 flex-1 truncate">{b.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                b.type === 'full' ? 'bg-blue-900/30 text-blue-400' : 'bg-yellow-900/30 text-yellow-400'
              }`}>
                {b.type}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                {b.scope}
              </span>
              <button
                onClick={() => { resetRestore(); setRestoreBackupId(b.id); }}
                className="p-1 rounded text-gray-400 hover:text-accent"
                title="Restore"
                aria-label="Restore backup"
              >
                <Download size={14} />
              </button>
              <button
                onClick={() => setDeleteId(b.id)}
                className="p-1 rounded text-gray-500 hover:text-red-400"
                title="Delete"
                aria-label="Delete backup"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="text-[10px] text-gray-500 flex gap-3">
              <span>{formatBytes(b.sizeBytes)}</span>
              <span>{b.entityCount} entities</span>
              <span>{new Date(b.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Restore Flow ─── */}
      {restoreBackupId && (
        <div className="bg-gray-800/30 rounded-lg p-3 space-y-3 border border-gray-700">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-400">Restore Backup</h4>
            <button onClick={resetRestore} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
          </div>

          {restoreStep === 'idle' && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Password</label>
                <input
                  type="password"
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  className={inputClass}
                  placeholder="Enter backup password"
                />
              </div>
              <button onClick={handleDecrypt} className={`${btnClass} bg-gray-700 hover:bg-gray-600 text-gray-200`}>
                <Lock size={16} />
                Decrypt
              </button>
            </>
          )}

          {(restoreStep === 'downloading' || restoreStep === 'decrypting') && (
            <p className="text-xs text-accent flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              {restoreStep === 'downloading' ? 'Downloading...' : 'Decrypting...'}
            </p>
          )}

          {restoreStep === 'preview' && restorePayload && (
            <div className="space-y-3">
              <div className="text-xs text-gray-300 space-y-1">
                <p>Type: <span className="text-gray-200">{restorePayload.type}</span></p>
                <p>Scope: <span className="text-gray-200">{restorePayload.scope}</span></p>
                <p>Entities: <span className="text-gray-200">{countPayloadEntities(restorePayload)}</span></p>
                <p>Created: <span className="text-gray-200">{new Date(restorePayload.createdAt).toLocaleString()}</span></p>
              </div>

              {restorePayload.type === 'differential' ? (
                <button
                  onClick={() => handleRestore('merge')}
                  className={`${btnClass} bg-accent hover:bg-accent-hover text-white`}
                >
                  Apply Changes (Merge)
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRestore('replace')}
                    className={`${btnClass} bg-red-600/80 hover:bg-red-600 text-white`}
                  >
                    Replace All
                  </button>
                  <button
                    onClick={() => handleRestore('merge')}
                    className={`${btnClass} bg-gray-700 hover:bg-gray-600 text-gray-200`}
                  >
                    Merge
                  </button>
                </div>
              )}
            </div>
          )}

          {restoreStep === 'restoring' && (
            <p className="text-xs text-accent flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Restoring...
            </p>
          )}

          {restoreStep === 'done' && restoreResult && (
            <div className="text-xs text-green-400 space-y-1">
              <p className="flex items-center gap-1"><CheckCircle size={12} /> Restore complete</p>
              <p className="text-gray-400">
                Added: {restoreResult.added} | Updated: {restoreResult.updated} | Deleted: {restoreResult.deleted}
              </p>
              <p className="text-gray-500">Tables: {restoreResult.tables.join(', ')}</p>
            </div>
          )}

          {restoreError && (
            <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {restoreError}</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Backup"
        message="This will permanently delete this encrypted backup from the server. This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
