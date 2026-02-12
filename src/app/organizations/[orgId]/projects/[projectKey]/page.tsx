// src/app/organizations/[orgId]/projects/[projectKey]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api, type Application, type Project, type Organization } from '@/lib/api';
import Link from 'next/link';

export default function ProjectDetailPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectKey = params.projectKey as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [org, proj, apps] = await Promise.all([
          api.organizations.get(orgId),
          api.projects.get(orgId, projectKey),
          api.applications.list(projectKey, orgId),
        ]);
        setOrganization(org);
        setProject(proj);
        setApplications(apps);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load project data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orgId, projectKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading project...</div>
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
        <span className="text-slate-100">{project?.name}</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-100">{project?.name}</h1>
        <p className="text-slate-500 text-sm mt-1">{projectKey}</p>
        {project?.description && (
          <p className="text-slate-400 mt-2">{project.description}</p>
        )}
      </div>

      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">
          Applications
        </h2>
        {applications.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No applications found in this project
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/organizations/${orgId}/projects/${projectKey}/applications/${app.appKey}`}
                className="block p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-emerald-500 transition-colors"
              >
                <h3 className="text-lg font-semibold text-slate-100 mb-1">
                  {app.name}
                </h3>
                <div className="text-sm text-slate-500 mb-2">{app.appKey}</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-slate-700 rounded text-slate-300">
                    {app.runnerType}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
