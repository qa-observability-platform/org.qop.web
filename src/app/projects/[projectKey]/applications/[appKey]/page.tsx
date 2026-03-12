// src/app/projects/[projectKey]/applications/[appKey]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, type Application, type TestRun } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ApplicationDetailPage() {
  const params = useParams();
  const projectKey = params.projectKey as string;
  const appKey = params.appKey as string;
  const { getCurrentOrgId } = useAuth();

  const [application, setApplication] = useState<Application | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadApplicationData = useCallback(async () => {
    try {
      setLoading(true);
      const orgId = getCurrentOrgId();
      if (!orgId) {
        setError('No organization found for user');
        setLoading(false);
        return;
      }
      const [appData, runsData] = await Promise.all([
        api.applications.get(projectKey, appKey, orgId),
        api.runs.list({ projectKey, appKey, limit: 50 }),
      ]);

      setApplication(appData);
      setRuns(runsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectKey, appKey]);

  useEffect(() => {
    loadApplicationData();
  }, [loadApplicationData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md p-6 rounded-xl border border-rose-800 bg-rose-900/20">
          <h3 className="text-lg font-medium text-rose-300 mb-2">
            ⚠️ Application Not Found
          </h3>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <Link
            href={`/projects/${projectKey}`}
            className="block px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm text-center"
          >
            ← Back to Project
          </Link>
        </div>
      </div>
    );
  }

  const filteredRuns = runs.filter(
    (run) => filterStatus === 'all' || run.status === filterStatus
  );

  const totalRuns = runs.length;
  const completedRuns = runs.filter((r) => r.status === 'completed').length;
  const failedRuns = runs.filter((r) => r.status === 'failed').length;
  const runningRuns = runs.filter((r) => r.status === 'running').length;

  const runnerIcons: Record<string, string> = {
    playwright: '🎭',
    selenium: '🌐',
    api: '⚡',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2 text-sm">
            <Link
              href="/projects"
              className="text-slate-400 hover:text-slate-300"
            >
              Projects
            </Link>
            <span className="text-slate-600">/</span>
            <Link
              href={`/projects/${projectKey}`}
              className="text-slate-400 hover:text-slate-300"
            >
              {projectKey}
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300">Applications</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{runnerIcons[application.runnerType]}</span>
            <div>
              <h1 className="text-2xl font-semibold">{application.name}</h1>
              <p className="text-sm text-slate-400 font-mono">{application.appKey}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-sm">
            {application.runnerType}
          </span>
          {application.frameworkVersion && (
            <span className="px-3 py-1 rounded bg-slate-800 text-slate-400 text-sm">
              v{application.frameworkVersion}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Runs" value={totalRuns} />
        <StatCard label="Completed" value={completedRuns} color="emerald" />
        <StatCard label="Failed" value={failedRuns} color="rose" />
        <StatCard label="Running" value={runningRuns} color="sky" pulse={runningRuns > 0} />
      </div>

      {/* Repository Info */}
      {application.repoUrl && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-sm text-slate-400 mb-1">Repository</div>
          <a
            href={application.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 font-mono text-sm">
            {application.repoUrl} →
          </a>
        </div>
      )}

      {/* Test Runs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Test Runs</h2>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-sm"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {filteredRuns.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
            <div className="text-slate-500">
              <div className="text-5xl mb-4">🎯</div>
              <p className="text-lg mb-2">
                {filterStatus === 'all' ? 'No test runs yet' : `No ${filterStatus} runs`}
              </p>
              {filterStatus === 'all' && (
                <>
                  <p className="text-sm mb-4">
                    Run your tests with the QOP reporter to see them here
                  </p>
                  <div className="inline-block text-left bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-xs text-slate-400 mb-2">
                      Environment variables:
                    </div>
                    <code className="block text-xs font-mono text-slate-300">
                      export QOP_PROJECT_KEY=&quot;{projectKey}&quot;
                      <br />
                      export QOP_APP_KEY=&quot;{appKey}&quot;
                      <br />
                      export QOP_API_KEY=&quot;your-api-key&quot;
                    </code>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRuns.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = 'slate',
  pulse = false,
}: {
  label: string;
  value: string | number;
  color?: 'slate' | 'emerald' | 'rose' | 'sky';
  pulse?: boolean;
}) {
  const colors = {
    slate: 'bg-slate-500/10 text-slate-300 border-slate-500/40',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/40',
    sky: 'bg-sky-500/10 text-sky-300 border-sky-500/40',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        {pulse && <div className="w-2 h-2 rounded-full bg-current animate-pulse" />}
      </div>
      <div className="text-3xl font-semibold">{value}</div>
    </div>
  );
}

function RunCard({ run }: { run: TestRun }) {
  return (
    <Link
      href={`/runs/${run.id}`}
      className="block rounded-lg border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 hover:bg-slate-900/80 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm text-slate-300 truncate">
              {run.runId}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                run.status === 'running'
                  ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                  : run.status === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : run.status === 'failed'
                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  : 'bg-slate-500/10 text-slate-300 border border-slate-500/30'
              }`}
            >
              {run.status}
            </span>
            {run.runnerType && (
              <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
                {run.runnerType}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-500">
            {run.branch && (
              <div>
                <span className="text-slate-600">Branch:</span> {run.branch}
              </div>
            )}
            {run.commitSha && (
              <div>
                <span className="text-slate-600">Commit:</span>{' '}
                {run.commitSha.substring(0, 7)}
              </div>
            )}
            {run.environment && (
              <div>
                <span className="text-slate-600">Env:</span> {run.environment}
              </div>
            )}
            <div>
              <span className="text-slate-600">Started:</span>{' '}
              {new Date(run.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>

        <span className="text-slate-400 text-xl">→</span>
      </div>
    </Link>
  );
}