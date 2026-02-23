import { useState, useEffect } from 'react';
import { RefreshCw, Download, FileText, Paperclip, Shield, Database, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../Common/Modal';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import { useOCISync } from '../../hooks/useOCISync';
import type { SharedManifestEntry } from '../../types';

interface BrowseSharedProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  note: FileText,
  clip: Paperclip,
  'ioc-report': Shield,
  'full-backup': Database,
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export function BrowseShared({ open, onClose, onImportComplete }: BrowseSharedProps) {
  const oci = useOCISync();
  const [items, setItems] = useState<SharedManifestEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmBackupImport, setConfirmBackupImport] = useState<SharedManifestEntry | null>(null);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = await oci.listShared();
      setItems(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadItems();
  }, [open]);

  const handleImport = async (entry: SharedManifestEntry) => {
    if (entry.type === 'full-backup') {
      setConfirmBackupImport(entry);
      return;
    }
    await oci.importSharedItem(entry);
    if (!oci.error) {
      onImportComplete();
    }
  };

  const handleConfirmBackupImport = async () => {
    if (!confirmBackupImport) return;
    await oci.importSharedItem(confirmBackupImport);
    setConfirmBackupImport(null);
    if (!oci.error) {
      onImportComplete();
    }
  };

  const btnClass = 'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors';

  return (
    <>
      <Modal open={open} onClose={onClose} title="Shared Items" wide>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={loadItems}
              disabled={loading}
              className={`${btnClass} bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-50`}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Refresh
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-400 flex items-center gap-1">
              <AlertCircle size={14} />
              {error}
            </p>
          )}

          {oci.progress && (
            <p className="text-sm text-accent">{oci.progress}</p>
          )}
          {oci.error && (
            <p className="text-sm text-red-400 flex items-center gap-1">
              <AlertCircle size={14} />
              {oci.error}
            </p>
          )}

          {!loading && items.length === 0 && !error && (
            <div className="text-center py-8 text-gray-500">
              <p>No shared items found</p>
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {items.map((item, i) => {
              const Icon = TYPE_ICONS[item.type] || FileText;
              return (
                <div
                  key={`${item.objectKey}-${i}`}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <Icon size={18} className="text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      by {item.sharedBy} &middot; {formatRelativeTime(item.sharedAt)}
                      {item.sizeBytes != null && ` \u00B7 ${(item.sizeBytes / 1024).toFixed(1)} KB`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleImport(item)}
                    disabled={oci.syncing}
                    className={`${btnClass} bg-accent hover:bg-accent-hover text-white disabled:opacity-50`}
                  >
                    <Download size={14} />
                    Import
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmBackupImport !== null}
        onClose={() => setConfirmBackupImport(null)}
        onConfirm={handleConfirmBackupImport}
        title="Import Full Backup"
        message="This will replace all your local data with this backup. This cannot be undone."
        confirmLabel="Import & Replace"
        danger
      />
    </>
  );
}
