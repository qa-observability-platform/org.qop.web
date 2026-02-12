// src/app/projects/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Project } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/PermissionGuard';

export default function ProjectsPage() {
  const { getCurrentOrgId } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const orgId = getCurrentOrgId();
      if (!orgId) {
        setError('No organization found for user');
        return;
      }
      const data = await api.projects.list(orgId);
      setProjects(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md p-6 rounded-xl border border-rose-800 bg-rose-900/20">
          <h3 className="text-lg font-medium text-rose-300 mb-2">
            ⚠️ Failed to Load Projects
          </h3>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <button
            onClick={loadProjects}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm w-full"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-slate-400">
            Manage your test automation projects
          </p>
        </div>
        <PermissionGuard permission="PROJECT_CREATE">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
          >
            + Create Project
          </button>
        </PermissionGuard>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <div className="text-slate-500">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-lg mb-2">No projects yet</p>
            <p className="text-sm mb-6">
              Create your first project to organize your test applications
            </p>
            <PermissionGuard permission="PROJECT_CREATE">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors"
              >
                Create Your First Project
              </button>
            </PermissionGuard>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadProjects();
          }}
        />
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const passRate =
    project.totalRuns && project.totalRuns > 0
      ? Math.round(((project.totalRuns - 0) / project.totalRuns) * 100)
      : 0;

  return (
    <Link
      href={`/projects/${project.projectKey}`}
      className="block rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 hover:bg-slate-900/80 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{project.name}</h3>
          <p className="text-xs text-slate-500 font-mono">{project.projectKey}</p>
        </div>
        <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 text-xs">
          Active
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 text-center text-xs mb-4">
        <div className="p-2 rounded bg-slate-800/50">
          <div className="font-semibold text-lg text-slate-200">
            {project.applicationCount || 0}
          </div>
          <div className="text-slate-500">Apps</div>
        </div>
        <div className="p-2 rounded bg-slate-800/50">
          <div className="font-semibold text-lg text-slate-200">
            {project.totalRuns || 0}
          </div>
          <div className="text-slate-500">Runs</div>
        </div>
        <div className="p-2 rounded bg-slate-800/50">
          <div className="font-semibold text-lg text-emerald-300">
            {passRate}%
          </div>
          <div className="text-slate-500">Pass</div>
        </div>
      </div>

      {project.lastRunAt && (
        <div className="text-xs text-slate-500">
          Last run:{' '}
          {new Date(project.lastRunAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      )}
    </Link>
  );
}

function CreateProjectModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { getCurrentOrgId } = useAuth();
  const [formData, setFormData] = useState({
    projectKey: '',
    name: '',
    description: '',
    repoUrl: '',
    defaultBranch: 'main',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const orgId = getCurrentOrgId();
      if (!orgId) {
        setError('No organization found for user');
        return;
      }
      await api.projects.create(orgId, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectKeyChange = (value: string) => {
    // Auto-generate project key from name
    const key = value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setFormData({ ...formData, projectKey: key, name: value });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create New Project</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleProjectKeyChange(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
              placeholder="My E-commerce App"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Project Key</label>
            <input
              type="text"
              value={formData.projectKey}
              onChange={(e) =>
                setFormData({ ...formData, projectKey: e.target.value })
              }
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none font-mono text-sm"
              placeholder="my-ecommerce-app"
              pattern="^[a-z0-9-]+$"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
              placeholder="Test automation for our e-commerce platform"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Repository URL (optional)
            </label>
            <input
              type="url"
              value={formData.repoUrl}
              onChange={(e) =>
                setFormData({ ...formData, repoUrl: e.target.value })
              }
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
              placeholder="https://github.com/org/repo"
            />
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
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}