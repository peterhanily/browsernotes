import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../Common/Modal';
import { cn } from '../../lib/utils';

export interface CreateInvestigationModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, options?: { playbook?: string; color?: string; icon?: string }) => void;
}

type TabId = 'quick' | 'name-gen' | 'playbook';

const TABS: { id: TabId; label: string }[] = [
  { id: 'quick',    label: 'Quick Create' },
  { id: 'name-gen', label: 'Name Generator' },
  { id: 'playbook', label: 'From Playbook' },
];

export function CreateInvestigationModal({ open, onClose, onCreate }: CreateInvestigationModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('quick');
  const [name, setName] = useState('');

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
    onClose();
  };

  const handleClose = () => {
    setName('');
    setActiveTab('quick');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="New Investigation">
      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 bg-bg-deep rounded-lg mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-bg-active text-text-primary'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'quick' && (
        <div>
          <label htmlFor="inv-name" className="block text-xs font-medium text-text-secondary mb-1.5">
            Investigation name
          </label>
          <input
            id="inv-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="e.g. Operation Midnight Storm"
            className="w-full bg-bg-deep border border-border-medium rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-purple transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className={cn(
              'mt-4 w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              name.trim()
                ? 'bg-purple text-white hover:brightness-110'
                : 'bg-bg-deep text-text-muted cursor-not-allowed',
            )}
          >
            <Plus size={16} />
            Create Investigation
          </button>
        </div>
      )}

      {activeTab === 'name-gen' && (
        <div className="flex items-center justify-center py-10 rounded-lg border border-dashed border-border-subtle bg-bg-deep/30">
          <p className="text-sm text-text-muted">Operation name generator will be moved here</p>
        </div>
      )}

      {activeTab === 'playbook' && (
        <div className="flex items-center justify-center py-10 rounded-lg border border-dashed border-border-subtle bg-bg-deep/30">
          <p className="text-sm text-text-muted">Playbook templates will be moved here</p>
        </div>
      )}
    </Modal>
  );
}
