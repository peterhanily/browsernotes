import { useState, useRef } from 'react';
import { Trash2, Settings2, Power, AlertCircle, Check, ExternalLink, Clock, Plus, Search, Upload } from 'lucide-react';
import { useIntegrations } from '../../hooks/useIntegrations';
import type { IntegrationTemplate, InstalledIntegration, IntegrationRun, IntegrationConfigField, IntegrationCategory } from '../../types/integration-types';

type SubTab = 'installed' | 'catalog' | 'history';

const CATEGORY_COLORS: Record<IntegrationCategory, string> = {
  enrichment: '#3b82f6',
  'threat-feed': '#f59e0b',
  'siem-soar': '#8b5cf6',
  notification: '#10b981',
  export: '#6366f1',
  pipeline: '#ec4899',
  utility: '#6b7280',
};

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  enrichment: 'Enrichment',
  'threat-feed': 'Threat Feed',
  'siem-soar': 'SIEM/SOAR',
  notification: 'Notification',
  export: 'Export',
  pipeline: 'Pipeline',
  utility: 'Utility',
};

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

function CategoryBadge({ category }: { category: IntegrationCategory }) {
  const color = CATEGORY_COLORS[category] || '#6b7280';
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-medium border"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
    >
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

function TemplateIcon({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
      style={{ backgroundColor: color || '#6b7280' }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// --- Config Form ---

function ConfigForm({
  fields,
  values,
  onSave,
  onCancel,
}: {
  fields: IntegrationConfigField[];
  values: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [formValues, setFormValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of fields) {
      initial[field.key] = values[field.key] ?? field.default ?? '';
    }
    return initial;
  });
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const updateField = (key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="border border-gray-700 rounded-lg p-3 space-y-3 bg-gray-800/50 mt-2">
      {fields.map((field) => (
        <div key={field.key} className="space-y-1">
          <label className="text-xs text-gray-400">
            {field.label}
            {field.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          {field.description && (
            <p className="text-[10px] text-gray-600">{field.description}</p>
          )}

          {field.type === 'boolean' ? (
            <button
              onClick={() => updateField(field.key, !formValues[field.key])}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                formValues[field.key] ? 'bg-accent' : 'bg-gray-600'
              }`}
              role="switch"
              aria-checked={!!formValues[field.key]}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  formValues[field.key] ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
          ) : field.type === 'select' || field.type === 'multi-select' ? (
            <select
              value={String(formValues[field.key] || '')}
              onChange={(e) => updateField(field.key, e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-accent"
            >
              <option value="">Select...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.type === 'password' ? (
            <div className="relative">
              <input
                type={showPasswords[field.key] ? 'text' : 'password'}
                value={String(formValues[field.key] || '')}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent pr-16"
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 hover:text-gray-300"
              >
                {showPasswords[field.key] ? 'Hide' : 'Show'}
              </button>
            </div>
          ) : field.type === 'number' ? (
            <input
              type="number"
              value={String(formValues[field.key] || '')}
              onChange={(e) => updateField(field.key, e.target.value ? Number(e.target.value) : '')}
              placeholder={field.placeholder}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent"
            />
          ) : (
            <input
              type="text"
              value={String(formValues[field.key] || '')}
              onChange={(e) => updateField(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent"
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onSave(formValues)}
          className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-gray-400 text-xs font-medium hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- Installed Tab ---

function InstalledTab({
  installations,
  templates,
  onToggle,
  onConfigure,
  onDelete,
  onInstall,
}: {
  installations: InstalledIntegration[];
  templates: IntegrationTemplate[];
  onToggle: (id: string, enabled: boolean) => void;
  onConfigure: (id: string, config: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onInstall: (templateId: string) => void;
}) {
  const [configuringId, setConfiguringId] = useState<string | null>(null);

  const installedTemplateIds = new Set(installations.map((i) => i.templateId));
  const availableTemplates = templates.filter((t) => !installedTemplateIds.has(t.id));

  return (
    <div className="space-y-6">
      {/* Installed list */}
      {installations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">No integrations installed. Browse the catalog to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {installations.map((inst) => {
            const template = templates.find((t) => t.id === inst.templateId);
            const isConfiguring = configuringId === inst.id;

            return (
              <div key={inst.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <TemplateIcon
                    name={template?.name || inst.name}
                    color={template?.color || '#6b7280'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200 truncate">
                        {template?.name || inst.name}
                      </span>
                      {template && <CategoryBadge category={template.category} />}
                    </div>
                    {inst.lastRunAt && (
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        Last run {formatRelativeTime(inst.lastRunAt)}
                        {inst.runCount > 0 && ` \u00b7 ${inst.runCount} runs`}
                        {inst.errorCount > 0 && (
                          <span className="text-red-400"> \u00b7 {inst.errorCount} errors</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Enable/disable toggle */}
                  <button
                    onClick={() => onToggle(inst.id, !inst.enabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                      inst.enabled ? 'bg-accent' : 'bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={inst.enabled}
                    title={inst.enabled ? 'Disable' : 'Enable'}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        inst.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                      }`}
                    />
                  </button>

                  {/* Configure */}
                  <button
                    onClick={() => setConfiguringId(isConfiguring ? null : inst.id)}
                    className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
                      isConfiguring ? 'text-accent' : 'text-gray-500 hover:text-gray-300'
                    }`}
                    title="Configure"
                  >
                    <Settings2 size={14} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => onDelete(inst.id)}
                    className="p-1.5 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Inline config form */}
                {isConfiguring && template && (
                  <ConfigForm
                    fields={template.configSchema}
                    values={inst.config}
                    onSave={(config) => {
                      onConfigure(inst.id, config);
                      setConfiguringId(null);
                    }}
                    onCancel={() => setConfiguringId(null)}
                  />
                )}
                {isConfiguring && template && template.configSchema.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2 italic">
                    This integration has no configurable options.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Available integrations */}
      {availableTemplates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Available Integrations
          </h4>
          <div className="space-y-2">
            {availableTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center gap-3"
              >
                <TemplateIcon name={template.name} color={template.color} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {template.name}
                    </span>
                    <CategoryBadge category={template.category} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {template.description}
                  </p>
                </div>
                <button
                  onClick={() => onInstall(template.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors shrink-0"
                >
                  <Plus size={12} />
                  Install
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Catalog Tab ---

function CatalogTab({
  templates,
  installedTemplateIds,
  onInstall,
  onImportJson,
}: {
  templates: IntegrationTemplate[];
  installedTemplateIds: Set<string>;
  onInstall: (templateId: string) => void;
  onImportJson: (json: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pasteJson, setPasteJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Group templates by category
  const categories = Array.from(new Set(templates.map((t) => t.category)));
  const filtered = searchQuery
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : templates;

  const grouped = categories
    .map((cat) => ({
      category: cat,
      templates: filtered.filter((t) => t.category === cat),
    }))
    .filter((g) => g.templates.length > 0);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImportJson(reader.result as string);
        setImportError(null);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Invalid JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteImport = () => {
    if (!pasteJson.trim()) return;
    try {
      onImportJson(pasteJson);
      setPasteJson('');
      setImportError(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search integrations..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent"
        />
      </div>

      {/* Template groups */}
      {grouped.map(({ category, templates: catTemplates }) => (
        <div key={category} className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[category] }}
            />
            {CATEGORY_LABELS[category]}
          </h4>

          {catTemplates.map((template) => {
            const isInstalled = installedTemplateIds.has(template.id);
            const isExpanded = expandedId === template.id;

            return (
              <div
                key={template.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start gap-3">
                  <TemplateIcon name={template.name} color={template.color} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-200">
                        {template.name}
                      </span>
                      <span className="text-[10px] text-gray-600">v{template.version}</span>
                      <span className="text-[10px] text-gray-600">by {template.author}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>

                    {/* Tags */}
                    {template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-gray-700/50 text-gray-400 border border-gray-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Required domains */}
                    {template.requiredDomains.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {template.requiredDomains.map((domain) => (
                          <span
                            key={domain}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1"
                          >
                            <ExternalLink size={8} />
                            {domain}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isInstalled ? (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20">
                        <Check size={12} />
                        Installed
                      </span>
                    ) : (
                      <button
                        onClick={() => onInstall(template.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
                      >
                        <Plus size={12} />
                        Install
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : template.id)}
                      className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap"
                    >
                      {isExpanded ? 'Hide JSON' : 'View JSON'}
                    </button>
                  </div>
                </div>

                {/* Raw JSON */}
                {isExpanded && (
                  <pre className="bg-gray-900 border border-gray-700 rounded p-2 text-[10px] text-gray-400 overflow-x-auto max-h-60 overflow-y-auto font-mono">
                    {JSON.stringify(template, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {filtered.length === 0 && searchQuery && (
        <p className="text-sm text-gray-500 text-center py-4">No templates match your search.</p>
      )}

      {/* Import section */}
      <div className="border-t border-gray-700 pt-4 space-y-3">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Import Custom Template
        </h4>

        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFileImport}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium transition-colors"
        >
          <Upload size={14} />
          Import JSON File
        </button>

        <div className="space-y-2">
          <textarea
            value={pasteJson}
            onChange={(e) => setPasteJson(e.target.value)}
            placeholder="Or paste template JSON here..."
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent font-mono resize-y"
          />
          <button
            onClick={handlePasteImport}
            disabled={!pasteJson.trim()}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import from Paste
          </button>
        </div>

        {importError && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertCircle size={12} />
            {importError}
          </div>
        )}
      </div>
    </div>
  );
}

// --- History Tab ---

function HistoryTab({
  runs,
  templates,
  installations,
}: {
  runs: IntegrationRun[];
  templates: IntegrationTemplate[];
  installations: InstalledIntegration[];
}) {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  if (runs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No integration runs yet.</p>
      </div>
    );
  }

  const getIntegrationName = (run: IntegrationRun): string => {
    const installation = installations.find((i) => i.id === run.integrationId);
    const template = templates.find((t) => t.id === run.templateId);
    return template?.name || installation?.name || 'Unknown Integration';
  };

  const statusIcon = (status: IntegrationRun['status']) => {
    switch (status) {
      case 'success':
        return <Check size={14} className="text-green-400" />;
      case 'error':
      case 'timeout':
      case 'cancelled':
        return <AlertCircle size={14} className="text-red-400" />;
      case 'running':
        return <Clock size={14} className="text-yellow-400 animate-pulse" />;
      default:
        return <Clock size={14} className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const isExpanded = expandedRunId === run.id;

        return (
          <div key={run.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <button
              onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
              className="flex items-center gap-3 w-full text-left"
            >
              {statusIcon(run.status)}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-200 truncate block">
                  {getIntegrationName(run)}
                </span>
                <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                  <span>{formatDuration(run.durationMs)}</span>
                  <span>{run.apiCallsMade} API call{run.apiCallsMade !== 1 ? 's' : ''}</span>
                  {(run.entitiesCreated > 0 || run.entitiesUpdated > 0) && (
                    <span>
                      {run.entitiesCreated > 0 && `${run.entitiesCreated} created`}
                      {run.entitiesCreated > 0 && run.entitiesUpdated > 0 && ', '}
                      {run.entitiesUpdated > 0 && `${run.entitiesUpdated} updated`}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-gray-600 shrink-0">
                {formatRelativeTime(run.createdAt)}
              </span>
            </button>

            {/* Error message */}
            {run.error && (
              <p className="text-xs text-red-400 mt-2 flex items-start gap-1.5">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                {run.error}
              </p>
            )}

            {/* Expanded step log */}
            {isExpanded && run.log.length > 0 && (
              <div className="mt-3 border-t border-gray-700 pt-2 space-y-1">
                {run.log.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-[10px] font-mono"
                  >
                    <span className="text-gray-600 shrink-0 w-16 text-right">
                      {entry.durationMs != null ? formatDuration(entry.durationMs) : ''}
                    </span>
                    <span
                      className={
                        entry.type === 'step-error'
                          ? 'text-red-400'
                          : entry.type === 'step-complete'
                            ? 'text-green-400'
                            : entry.type === 'entity-created'
                              ? 'text-blue-400'
                              : 'text-gray-400'
                      }
                    >
                      [{entry.type}]
                    </span>
                    <span className="text-gray-300">{entry.stepLabel}</span>
                    {entry.detail && (
                      <span className="text-gray-600 truncate">{entry.detail}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isExpanded && run.log.length === 0 && (
              <p className="text-[10px] text-gray-600 mt-2 italic">No step log recorded.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Main Panel ---

export function IntegrationPanel() {
  const {
    templates,
    installations,
    runs,
    importTemplate,
    createInstallation,
    updateInstallation,
    deleteInstallation,
    loading,
  } = useIntegrations();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('installed');
  const installedTemplateIds = new Set(installations.map((i) => i.templateId));

  const handleInstall = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    await createInstallation(templateId, {});
    // If the template has config fields, switch to installed tab so the user can configure
    if (template && template.configSchema.length > 0) {
      setActiveSubTab('installed');
    }
  };

  const handleImportJson = async (json: string) => {
    await importTemplate(json);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Power size={16} />
          Integrations
        </h3>
        <p className="text-sm text-gray-500">Loading integrations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Power size={16} />
          Integrations
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Connect to threat intelligence feeds, enrichment APIs, and export pipelines.
        </p>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1 border-b border-gray-700 pb-px">
        {(
          [
            { key: 'installed', label: 'Installed', count: installations.length },
            { key: 'catalog', label: 'Catalog', count: templates.length },
            { key: 'history', label: 'History', count: runs.length },
          ] as { key: SubTab; label: string; count: number }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
              activeSubTab === tab.key
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-[10px] text-gray-600">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeSubTab === 'installed' && (
        <InstalledTab
          installations={installations}
          templates={templates}
          onToggle={(id, enabled) => updateInstallation(id, { enabled })}
          onConfigure={(id, config) => updateInstallation(id, { config })}
          onDelete={deleteInstallation}
          onInstall={handleInstall}
        />
      )}

      {activeSubTab === 'catalog' && (
        <CatalogTab
          templates={templates}
          installedTemplateIds={installedTemplateIds}
          onInstall={handleInstall}
          onImportJson={handleImportJson}
        />
      )}

      {activeSubTab === 'history' && (
        <HistoryTab
          runs={runs}
          templates={templates}
          installations={installations}
        />
      )}
    </div>
  );
}
