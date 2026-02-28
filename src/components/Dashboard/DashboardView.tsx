import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { QuickLink } from '../../types';
import { QuickLinkForm } from './QuickLinkForm';
import { ConfirmDialog } from '../Common/ConfirmDialog';

interface DashboardViewProps {
  links: QuickLink[];
  onUpdateLinks: (links: QuickLink[]) => void;
}

export function DashboardView({ links, onUpdateLinks }: DashboardViewProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = (data: Partial<QuickLink>) => {
    const newLink: QuickLink = {
      id: nanoid(),
      title: data.title || '',
      url: data.url || '',
      description: data.description,
      color: data.color,
      icon: data.icon,
    };
    onUpdateLinks([...links, newLink]);
    setFormOpen(false);
  };

  const handleEdit = (data: Partial<QuickLink>) => {
    if (!editingLink) return;
    onUpdateLinks(links.map((l) =>
      l.id === editingLink.id ? { ...l, ...data } : l
    ));
    setEditingLink(undefined);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    onUpdateLinks(links.filter((l) => l.id !== deletingId));
    setDeletingId(null);
  };

  const handlePanelClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="dashboard">{'\uD83C\uDFE0'}</span>
          <h2 className="text-lg font-semibold text-gray-100">Quick Links</h2>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover text-white transition-colors"
        >
          <Plus size={16} />
          Add Link
        </button>
      </div>

      {/* Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {links.map((link) => (
            <div
              key={link.id}
              role="button"
              tabIndex={0}
              onClick={() => handlePanelClick(link.url)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePanelClick(link.url); } }}
              className="group relative rounded-lg border border-gray-800 bg-gray-900/50 p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-gray-700"
              style={{
                borderLeftWidth: '4px',
                borderLeftColor: link.color || '#3b82f6',
                background: link.color ? `linear-gradient(135deg, ${link.color}08, transparent)` : undefined,
              }}
            >
              {/* Hover actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingLink(link); }}
                  className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300"
                  aria-label={`Edit ${link.title}`}
                  title="Edit link"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeletingId(link.id); }}
                  className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400"
                  aria-label={`Delete ${link.title}`}
                  title="Delete link"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Icon */}
              {link.icon && (
                <span className="text-2xl block mb-2" role="img" aria-hidden="true">
                  {link.icon}
                </span>
              )}

              {/* Title */}
              <h3 className="text-sm font-semibold text-gray-200 truncate">{link.title}</h3>

              {/* Description */}
              {link.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{link.description}</p>
              )}
            </div>
          ))}
        </div>

        {links.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <span className="text-4xl mb-3">{'\uD83D\uDD17'}</span>
            <p className="text-lg font-medium">No quick links</p>
            <p className="text-sm mt-1">Add links to your favorite threat intel tools</p>
          </div>
        )}
      </div>

      {/* Add form */}
      {formOpen && (
        <QuickLinkForm
          onSave={handleAdd}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {/* Edit form */}
      {editingLink && (
        <QuickLinkForm
          link={editingLink}
          onSave={handleEdit}
          onCancel={() => setEditingLink(undefined)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Link"
        message="Remove this quick link from the dashboard?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
