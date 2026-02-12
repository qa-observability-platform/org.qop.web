// src/app/settings/api-keys/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, type Project, type ApiKey } from '@/lib/api';
import { usePermission } from '@/components/PermissionGuard';

export default function ApiKeysPage() {
  const { getCurrentOrgId } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectKey, setSelectedProjectKey] = useState<string>('');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState<{ key: string; label: string } | null>(null);

  const canView = usePermission('API_KEY_VIEW');
  const canCreate = usePermission('API_KEY_CREATE');
  const canDelete = usePermission('API_KEY_DELETE');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectKey) {
      loadApiKeys();
    }
  }, [selectedProjectKey]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const orgId = getCurrentOrgId();
      if (!orgId) {
        setError('No organization found');
        return;
      }

      const data = await api.projects.list(orgId);
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectKey(data[0].projectKey);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    if (!selectedProjectKey) return;

    try {
      const orgId = getCurrentOrgId();
      if (!orgId) return;

      const keys = await api.projects.listApiKeys(orgId, selectedProjectKey);
      setApiKeys(keys);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await api.projects.revokeApiKey(keyId);
      setSuccess('API key revoked successfully');
      loadApiKeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading API keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-1">API Keys</h2>
          <p className="text-sm text-slate-400">
            Manage API keys for your automation test runners
          </p>
        </div>
        {canCreate && selectedProjectKey && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
          >
            + Create API Key
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          {success}
        </div>
      )}

      {/* Project Selection */}
      {projects.length > 0 ? (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Select Project</label>
            <select
              value={selectedProjectKey}
              onChange={(e) => setSelectedProjectKey(e.target.value)}
              className="w-full max-w-md px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              {projects.map((project) => (
                <option key={project.projectKey} value={project.projectKey}>
                  {project.name} ({project.projectKey})
                </option>
              ))}
            </select>
          </div>

          {/* API Keys List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">API Keys for {selectedProjectKey}</h3>

            {apiKeys.length === 0 ? (
              <div className="p-8 rounded-lg border border-slate-800 bg-slate-900/60 text-center text-slate-500">
                No API keys created yet
              </div>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{key.label}</div>
                        {key.revokedAt && (
                          <span className="px-2 py-0.5 rounded text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Revoked
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400 font-mono mt-1">
                        {key.id.substring(0, 8)}...
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Created: {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt && ` • Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                      </div>
                    </div>

                    {!key.revokedAt && canDelete && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-sm transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-8 rounded-lg border border-slate-800 bg-slate-900/60 text-center">
          <p className="text-slate-400 mb-4">No projects found. Create a project first to manage API keys.</p>
        </div>
      )}

      {/* Create API Key Modal */}
      {showCreateModal && (
        <CreateApiKeyModal
          projectKey={selectedProjectKey}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(key, label) => {
            setShowCreateModal(false);
            setNewApiKey({ key, label });
            loadApiKeys();
          }}
        />
      )}

      {/* Show New API Key Modal (one-time display) */}
      {newApiKey && (
        <ShowApiKeyModal
          apiKey={newApiKey.key}
          label={newApiKey.label}
          onClose={() => setNewApiKey(null)}
          onCopy={() => copyToClipboard(newApiKey.key)}
        />
      )}
    </div>
  );
}

function CreateApiKeyModal({
  projectKey,
  onClose,
  onSuccess,
}: {
  projectKey: string;
  onClose: () => void;
  onSuccess: (key: string, label: string) => void;
}) {
  const { getCurrentOrgId } = useAuth();
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const orgId = getCurrentOrgId();
      if (!orgId) {
        setError('No organization found');
        return;
      }

      const result = await api.projects.createApiKey(orgId, projectKey, { label });
      onSuccess(result.plainKey, label);
    } catch (err: any) {
      setError(err.message || 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create API Key</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
              placeholder="CI/CD Pipeline"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              A descriptive name to identify this API key
            </p>
          </div>

          <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm text-amber-300">
              ⚠️ The API key will only be shown once. Make sure to copy it immediately.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create API Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ShowApiKeyModal({
  apiKey,
  label,
  onClose,
  onCopy,
}: {
  apiKey: string;
  label: string;
  onClose: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl border border-emerald-800 p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold text-emerald-300 mb-4">API Key Created!</h2>

        <div className="space-y-4">
          <div className="p-4 rounded bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-sm text-emerald-300 mb-2">
              ✓ API key <strong>{label}</strong> created successfully
            </p>
            <p className="text-xs text-emerald-400/70">
              Copy this key now - it won't be shown again!
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Your API Key</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiKey}
                readOnly
                className="flex-1 px-3 py-2 rounded bg-slate-800 border border-slate-700 font-mono text-sm"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="p-4 rounded bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm text-amber-300">
              <strong>Important:</strong> Store this key securely. For security reasons, we cannot
              show it again. If you lose it, you'll need to create a new one.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
          >
            I've Saved My Key
          </button>
        </div>
      </div>
    </div>
  );
}
