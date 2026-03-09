// src/app/projects/[projectKey]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, type Project, type Application, type TestRun } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectKey = params.projectKey as string;
  const { getCurrentOrgId } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateAppModal, setShowCreateAppModal] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, [projectKey]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const orgId = getCurrentOrgId();
      if (!orgId) {
        setError('No organization found for user');
        return;
      }

      const [projectData, appsData, runsData] = await Promise.all([
        api.projects.get(orgId, projectKey),
        api.applications.list(projectKey, orgId),
        api.runs.list({ projectKey, limit: 10 }),
      ]);

      setProject(projectData);
      setApplications(appsData);
      setRecentRuns(runsData);
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
          <p className="text-sm text-slate-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md p-6 rounded-xl border border-rose-800 bg-rose-900/20">
          <h3 className="text-lg font-medium text-rose-300 mb-2">
            ⚠️ Project Not Found
          </h3>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <Link
            href="/projects"
            className="block px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm text-center"
          >
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const totalTests = recentRuns.reduce((sum, run) => sum + 10, 0); // TODO: Get from summary
  const passedTests = recentRuns.reduce((sum, run) => sum + 8, 0);
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/projects"
              className="text-slate-400 hover:text-slate-300"
            >
              ← Projects
            </Link>
            <span className="text-slate-600">/</span>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
          </div>
          <p className="text-sm text-slate-400 font-mono">{project.projectKey}</p>
          {project.description && (
            <p className="text-sm text-slate-400 mt-2">{project.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowCreateAppModal(true)}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
        >
          + Add Application
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Applications" value={applications.length} />
        <StatCard label="Total Runs" value={project.totalRuns || 0} />
        <StatCard label="Pass Rate" value={`${passRate}%`} color="emerald" />
        <StatCard
          label="Last Run"
          value={
            project.lastRunAt
              ? new Date(project.lastRunAt).toLocaleDateString()
              : 'Never'
          }
        />
      </div>

      {/* Applications */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Applications</h2>
        {applications.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
            <div className="text-slate-500">
              <p className="text-lg mb-2">No applications yet</p>
              <p className="text-sm mb-4">
                Add your first test application to this project
              </p>
              <button
                onClick={() => setShowCreateAppModal(true)}
                className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors"
              >
                Add Application
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {applications.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                projectKey={projectKey}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Runs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Runs</h2>
          <Link
            href={`/projects/${projectKey}/runs`}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            View All →
          </Link>
        </div>
        {recentRuns.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-500 text-sm">
            No test runs yet
          </div>
        ) : (
          <div className="space-y-2">
            {recentRuns.slice(0, 5).map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>

      {showCreateAppModal && (
        <CreateApplicationModal
          projectKey={projectKey}
          onClose={() => setShowCreateAppModal(false)}
          onSuccess={() => {
            setShowCreateAppModal(false);
            loadProjectData();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = 'slate',
}: {
  label: string;
  value: string | number;
  color?: 'slate' | 'emerald';
}) {
  const colors = {
    slate: 'bg-slate-500/10 text-slate-300 border-slate-500/40',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function ApplicationCard({
  app,
  projectKey,
}: {
  app: Application;
  projectKey: string;
}) {
  const runnerIcons = {
    playwright: '🎭',
    selenium: '🌐',
    api: '⚡',
  };

  return (
    <Link
      href={`/projects/${projectKey}/applications/${app.appKey}`}
      className="block rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 hover:bg-slate-900/80 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{app.name}</h3>
          <p className="text-xs text-slate-500 font-mono">{app.appKey}</p>
        </div>
        <div className="text-2xl">{runnerIcons[app.runnerType]}</div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">
          {app.runnerType}
        </span>
        {app.frameworkVersion && (
          <span className="text-slate-500">{app.frameworkVersion}</span>
        )}
      </div>
    </Link>
  );
}

function RunRow({ run }: { run: TestRun }) {
  return (
    <Link
      href={`/runs/${run.id}`}
      className="block rounded-lg border border-slate-800 bg-slate-900/60 p-3 hover:border-slate-700 hover:bg-slate-900/80 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-slate-300 truncate">
              {run.runId}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                run.status === 'running'
                  ? 'bg-sky-500/10 text-sky-300'
                  : run.status === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-slate-500/10 text-slate-300'
              }`}
            >
              {run.status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{run.applicationName}</span>
            {run.branch && <span>• {run.branch}</span>}
            <span>• {new Date(run.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <span className="text-slate-400">→</span>
      </div>
    </Link>
  );
}

function CreateApplicationModal({
  projectKey,
  onClose,
  onSuccess,
}: {
  projectKey: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { getCurrentOrgId } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    appKey: '',
    runnerType: 'playwright' as 'playwright' | 'selenium' | 'api',
    repoUrl: '',
    frameworkVersion: '',
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
      await api.applications.create(projectKey, orgId, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (value: string) => {
    const key = value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setFormData({ ...formData, name: value, appKey: key });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Add Application</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Application Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
              placeholder="Web Tests"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">App Key</label>
            <input
              type="text"
              value={formData.appKey}
              onChange={(e) =>
                setFormData({ ...formData, appKey: e.target.value })
              }
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none font-mono text-sm"
              placeholder="web-tests"
              pattern="^[a-z0-9-]+$"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Runner Type</label>
            <select
              value={formData.runnerType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  runnerType: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="playwright">🎭 Playwright</option>
              <option value="selenium">🌐 Selenium</option>
              <option value="api">⚡ API Tests</option>
            </select>
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
              {loading ? 'Creating...' : 'Add Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}