import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { StandaloneIOC, IOCType, ConfidenceLevel, Folder } from '../../types';
import { IOC_TYPE_LABELS, CONFIDENCE_LEVELS } from '../../types';

interface StandaloneIOCFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<StandaloneIOC>) => void;
  folders: Folder[];
  defaultFolderId?: string;
  editingIOC?: StandaloneIOC;
}

const IOC_TYPES = Object.keys(IOC_TYPE_LABELS) as IOCType[];
const CONF_LEVELS = Object.keys(CONFIDENCE_LEVELS) as ConfidenceLevel[];

export function StandaloneIOCForm({ open, onClose, onSubmit, folders, defaultFolderId, editingIOC }: StandaloneIOCFormProps) {
  const [type, setType] = useState<IOCType>('ipv4');
  const [value, setValue] = useState('');
  const [confidence, setConfidence] = useState<ConfidenceLevel>('medium');
  const [analystNotes, setAnalystNotes] = useState('');
  const [attribution, setAttribution] = useState('');
  const [folderId, setFolderId] = useState(defaultFolderId || '');

  useEffect(() => {
    if (open) {
      if (editingIOC) {
        setType(editingIOC.type);
        setValue(editingIOC.value);
        setConfidence(editingIOC.confidence);
        setAnalystNotes(editingIOC.analystNotes || '');
        setAttribution(editingIOC.attribution || '');
        setFolderId(editingIOC.folderId || '');
      } else {
        setType('ipv4');
        setValue('');
        setConfidence('medium');
        setAnalystNotes('');
        setAttribution('');
        setFolderId(defaultFolderId || '');
      }
    }
  }, [open, editingIOC, defaultFolderId]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit({
      ...editingIOC,
      type,
      value: value.trim(),
      confidence,
      analystNotes: analystNotes.trim() || undefined,
      attribution: attribution.trim() || undefined,
      folderId: folderId || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">{editingIOC ? 'Edit IOC' : 'New Standalone IOC'}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-800 text-gray-500">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as IOCType)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-accent"
            >
              {IOC_TYPES.map((t) => (
                <option key={t} value={t}>{IOC_TYPE_LABELS[t].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Confidence</label>
            <select
              value={confidence}
              onChange={(e) => setConfidence(e.target.value as ConfidenceLevel)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-accent"
            >
              {CONF_LEVELS.map((c) => (
                <option key={c} value={c}>{CONFIDENCE_LEVELS[c].label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Value</label>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 192.168.1.1, evil.com, abc123..."
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 font-mono focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Attribution</label>
          <input
            value={attribution}
            onChange={(e) => setAttribution(e.target.value)}
            placeholder="e.g. APT-29, Lazarus Group..."
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Investigation</label>
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-accent"
          >
            <option value="">No investigation</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Analyst Notes</label>
          <textarea
            value={analystNotes}
            onChange={(e) => setAnalystNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes..."
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-accent resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            className="px-3 py-1.5 text-sm rounded-lg bg-accent/15 text-accent hover:bg-accent/25 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {editingIOC ? 'Save' : 'Create IOC'}
          </button>
        </div>
      </form>
    </div>
  );
}
