// src/app/page.tsx
import Link from 'next/link';

const API_BASE =
  process.env.NEXT_PUBLIC_QOP_API_URL ?? 'http://localhost:4000';

type HealthResponse = { status: string };

type AppsResponse = {
  applications: {
    id: string;
    orgId: string;
    name: string;
    appKey: string;
  }[];
};

type RunsResponse = {
  runs: {
    id: string;
    applicationId: string;
    applicationName: string;
    appKey: string;
    runId: string;
    status: string;
    branch: string | null;
    commitSha: string | null;
    ciBuildNumber: string | null;
    environment: string | null;
    createdAt: string;
  }[];
};

async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchApps(): Promise<AppsResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/apps`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchRuns(): Promise<RunsResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/runs?limit=20`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  let classes =
    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border';

  if (normalized === 'running') {
    classes += ' bg-sky-500/10 text-sky-300 border-sky-500/40';
  } else if (normalized === 'passed' || normalized === 'completed') {
    classes += ' bg-emerald-500/10 text-emerald-300 border-emerald-500/40';
  } else if (normalized === 'failed') {
    classes += ' bg-rose-500/10 text-rose-300 border-rose-500/40';
  } else {
    classes += ' bg-slate-700/40 text-slate-200 border-slate-600';
  }

  return <span className={classes}>{status}</span>;
}

export default async function DashboardPage() {
  const [health, apps, runs] = await Promise.all([
    fetchHealth(),
    fetchApps(),
    fetchRuns(),
  ]);

  const status = health?.status ?? 'unknown';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-400">
            Sprint 3 – Live real-time test execution monitoring
          </p>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            status === 'ok'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
              : 'bg-amber-500/10 text-amber-300 border border-amber-500/40'
          }`}
        >
          API: {status}
        </div>
      </header>

      {/* Applications card */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Applications</h2>
          <span className="text-xs text-slate-500">
            {apps?.applications.length || 0} apps
          </span>
        </div>

        {!apps || apps.applications.length === 0 ? (
          <p className="text-sm text-slate-400">
            No applications found. Insert at least one row into{' '}
            <code className="text-emerald-300">applications</code> in qop_db.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">App Key</th>
                  <th className="text-left py-2">Org ID</th>
                </tr>
              </thead>
              <tbody>
                {apps.applications.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-slate-900/60 hover:bg-slate-900/80"
                  >
                    <td className="py-2">{app.name}</td>
                    <td className="py-2 text-emerald-300">{app.appKey}</td>
                    <td className="py-2 text-xs text-slate-400">
                      {app.orgId.slice(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Runs card */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Recent Runs</h2>
          <span className="text-xs text-slate-500">
            {runs?.runs.length || 0} runs
          </span>
        </div>

        {!runs || runs.runs.length === 0 ? (
          <p className="text-sm text-slate-400">
            No runs yet. Trigger a Playwright suite with the QOP WS reporter
            enabled to see live runs.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left py-2">Run ID</th>
                  <th className="text-left py-2">Application</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Branch</th>
                  <th className="text-left py-2">Env</th>
                  <th className="text-left py-2">Created</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.runs.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-slate-900/60 hover:bg-slate-900/80"
                  >
                    <td className="py-2">
                      <div className="font-mono text-xs">{run.runId}</div>
                      <div className="text-[10px] text-slate-500">
                        {run.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="py-2">
                      <div>{run.applicationName}</div>
                      <div className="text-xs text-emerald-300">
                        {run.appKey}
                      </div>
                    </td>
                    <td className="py-2">{statusBadge(run.status)}</td>
                    <td className="py-2 text-xs text-slate-300">
                      {run.branch ?? '-'}
                    </td>
                    <td className="py-2 text-xs text-slate-300">
                      {run.environment ?? '-'}
                    </td>
                    <td className="py-2 text-xs text-slate-400">
                      {new Date(run.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/runs/${run.id}`}
                        className="text-xs text-emerald-300 hover:text-emerald-200 transition-colors"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}