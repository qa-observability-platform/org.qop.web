// src/app/organizations/[orgId]/projects/[projectKey]/applications/[appKey]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api, type Application, type Project, type Organization, type TestRun } from '@/lib/api';
import Link from 'next/link';

export default function ApplicationDetailPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectKey = params.projectKey as string;
  const appKey = params.appKey as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [org, proj, app, runsList] = await Promise.all([
          api.organizations.get(orgId),
          api.projects.get(orgId, projectKey),
          api.applications.get(projectKey, appKey, orgId),
          api.runs.list({ projectKey, appKey, limit: 50 }),
        ]);
        setOrganization(org);
        setProject(proj);
        setApplication(app);
        setRuns(runsList);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load application data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orgId, projectKey, appKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading application...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'passed':
        return 'text-emerald-400';
      case 'failed':
        return 'text-red-400';
      case 'running':
        return 'text-blue-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'passed':
        return 'bg-emerald-900/30 border-emerald-700';
      case 'failed':
        return 'bg-red-900/30 border-red-700';
      case 'running':
        return 'bg-blue-900/30 border-blue-700';
      default:
        return 'bg-slate-900/30 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-400">
        <Link href="/organizations" className="hover:text-slate-300">
          Organizations
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/organizations/${orgId}/projects`}
          className="hover:text-slate-300"
        >
          {organization?.name}
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/organizations/${orgId}/projects/${projectKey}`}
          className="hover:text-slate-300"
        >
          {project?.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-100">{application?.name}</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-100">
          {application?.name}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{appKey}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-1 bg-slate-700 rounded text-slate-300 text-sm">
            {application?.runnerType}
          </span>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">
          Test Runs
        </h2>
        {runs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No test runs found for this application
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/runs/${run.runId}`}
                className={`block p-4 rounded-lg border ${getStatusBgColor(
                  run.status
                )} hover:border-emerald-500 transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-semibold ${getStatusColor(
                          run.status
                        )}`}
                      >
                        {run.status.toUpperCase()}
                      </span>
                      <span className="text-slate-400 text-sm">
                        Run: {run.runId}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      {run.branch && <span>Branch: {run.branch}</span>}
                      {run.commitSha && (
                        <span>Commit: {run.commitSha.substring(0, 7)}</span>
                      )}
                      {run.ciBuildNumber && (
                        <span>Build: {run.ciBuildNumber}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    {new Date(run.createdAt).toLocaleString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
