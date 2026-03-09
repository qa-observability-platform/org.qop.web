// src/app/settings/organization/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, type Organization } from '@/lib/api';
export default function OrganizationSettingsPage() {
  const { getCurrentOrgId } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      const orgId = getCurrentOrgId();
      if (!orgId) {
        setError('No organization found');
        return;
      }
      const data = await api.organizations.get(orgId);
      setOrganization(data);
      setFormData({
        name: data.name,
        description: data.description || '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.organizations.update(organization.id, formData);
      setSuccess('Organization updated successfully');
      setIsEditing(false);
      loadOrganization();
    } catch (err: any) {
      setError(err.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
        {error || 'Organization not found'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Organization Settings</h2>
        <p className="text-sm text-slate-400">
          Manage your organization details and members
        </p>
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

      {/* Organization Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Organization Details</h3>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">
              Organization Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!isEditing}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={!isEditing}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              rows={3}
              placeholder="Brief description of your organization"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">
              Organization ID
            </label>
            <input
              type="text"
              value={organization.id}
              disabled
              className="w-full px-3 py-2 rounded bg-slate-800/50 border border-slate-700 text-slate-400 cursor-not-allowed font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">
              Created
            </label>
            <input
              type="text"
              value={new Date(organization.createdAt).toLocaleString()}
              disabled
              className="w-full px-3 py-2 rounded bg-slate-800/50 border border-slate-700 text-slate-400 cursor-not-allowed"
            />
          </div>

          <div className="flex gap-3">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
                >
                  Edit Organization
                </button>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: organization.name,
                        description: organization.description || '',
                      });
                    }}
                    disabled={saving}
                    className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
        </form>
      </div>

      {/* Statistics */}
      <div className="pt-6 border-t border-slate-800">
        <h3 className="text-lg font-medium mb-4">Statistics</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-2xl font-semibold text-emerald-400">
              {organization.projectCount || 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">Projects</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-2xl font-semibold text-emerald-400">
              {organization.applicationCount || 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">Applications</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-2xl font-semibold text-emerald-400">
              {organization.totalRuns || 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">Test Runs</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-2xl font-semibold text-emerald-400">
              {organization.memberCount || 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">Members</div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-6 border-t border-rose-800/50">
        <h3 className="text-lg font-medium text-rose-300 mb-4">Danger Zone</h3>
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-rose-300">Delete Organization</h4>
              <p className="text-sm text-slate-400 mt-1">
                Permanently delete this organization and all associated data. This action
                cannot be undone.
              </p>
            </div>
            <button className="px-4 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition-colors ml-4">
              Delete Organization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
