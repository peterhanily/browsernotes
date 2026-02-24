import { useState, useRef } from 'react';
import { AlertCircle, CheckCircle, Cloud, Upload, Loader2 } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useOCISync } from '../../hooks/useOCISync';
import { testPAR } from '../../lib/oci-sync';
import { ConfirmDialog } from '../Common/ConfirmDialog';

export function OCISync() {
  const { settings, updateSettings } = useSettings();
  const oci = useOCISync();

  const [writePAR, setWritePAR] = useState(settings.ociWritePAR || '');
  const [label, setLabel] = useState(settings.ociLabel || '');
  const [testingWrite, setTestingWrite] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [message, setMessage] = useState('');
  const [confirmPush, setConfirmPush] = useState(false);

  const msgTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showMessage = (msg: string) => {
    setMessage(msg);
    clearTimeout(msgTimeoutRef.current);
    msgTimeoutRef.current = setTimeout(() => setMessage(''), 5000);
  };

  const handleSave = () => {
    updateSettings({
      ociWritePAR: writePAR.trim() || undefined,
      ociLabel: label.trim() || undefined,
    });
    showMessage('OCI settings saved');
  };

  const handleTestWrite = async () => {
    if (!writePAR.trim()) return;
    setTestingWrite(true);
    setTestResult(null);
    const result = await testPAR(writePAR.trim());
    setTestResult(result);
    setTestingWrite(false);
  };

  const handlePushBackup = async () => {
    setConfirmPush(false);
    await oci.pushFullBackup();
    if (!oci.error) {
      showMessage('Backup pushed successfully');
    }
  };

  const btnClass = 'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors';
  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent font-mono';

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
        <Cloud size={16} />
        OCI Object Storage
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className={inputClass.replace('font-mono', '')}
            placeholder="My Team Bucket"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Write PAR URL</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={writePAR}
              onChange={(e) => setWritePAR(e.target.value)}
              className={`flex-1 ${inputClass}`}
              placeholder="https://objectstorage..."
            />
            <button
              onClick={handleTestWrite}
              disabled={!writePAR.trim() || testingWrite}
              className={`${btnClass} bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-50`}
            >
              {testingWrite ? <Loader2 size={14} className="animate-spin" /> : 'Test'}
            </button>
          </div>
        </div>

        {testResult && (
          <p className={`text-sm flex items-center gap-1 ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}>
            {testResult.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            Write PAR: {testResult.ok ? 'Connected successfully' : testResult.error}
          </p>
        )}

        <button
          onClick={handleSave}
          className={`${btnClass} bg-accent hover:bg-accent-hover text-white`}
        >
          Save Settings
        </button>
      </div>

      {/* Full Backup */}
      <div className="pt-2 border-t border-gray-800 space-y-3">
        <h4 className="text-sm font-semibold text-gray-400">Full Backup</h4>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setConfirmPush(true)}
            disabled={!settings.ociWritePAR || oci.syncing}
            className={`${btnClass} bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-50`}
          >
            {oci.syncing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Push Backup
          </button>
        </div>
        {oci.lastSyncAt && (
          <p className="text-xs text-gray-500">Last sync: {new Date(oci.lastSyncAt).toLocaleString()}</p>
        )}
      </div>

      {/* Status */}
      {(oci.progress || oci.error || message) && (
        <div className="pt-2">
          {oci.progress && <p className="text-sm text-accent">{oci.progress}</p>}
          {oci.error && (
            <p className="text-sm text-red-400 flex items-center gap-1">
              <AlertCircle size={14} />
              {oci.error}
            </p>
          )}
          {message && !oci.error && !oci.progress && (
            <p className="text-sm text-green-400">{message}</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmPush}
        onClose={() => setConfirmPush(false)}
        onConfirm={handlePushBackup}
        title="Push Backup"
        message="This will upload your entire database to OCI Object Storage. Continue?"
        confirmLabel="Push Backup"
      />
    </div>
  );
}
