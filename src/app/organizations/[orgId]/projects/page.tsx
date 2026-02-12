// src/app/organizations/[orgId]/projects/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api, type Project, type Organization } from '@/lib/api';
import Link from 'next/link';

export default function ProjectsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [org, projectsList] = await Promise.all([
          api.organizations.get(orgId),
          api.projects.list(orgId),
        ]);
        setOrganization(org);
        setProjects(projectsList);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load projects');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading projects...</div>
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
        <span className="text-slate-100">{organization?.name}</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-100">
          {organization?.name} - Projects
        </h1>
        <p className="text-slate-400 mt-2">
          Manage and monitor projects in this organization
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
          <p className="text-slate-400">No projects found in this organization</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/organizations/${orgId}/projects/${project.projectKey}`}
              className="block p-6 bg-slate-900 rounded-lg border border-slate-800 hover:border-emerald-500 transition-colors"
            >
              <h2 className="text-xl font-semibold text-slate-100 mb-2">
                {project.name}
              </h2>
              <div className="text-sm text-slate-500 mb-4">
                {project.projectKey}
              </div>
              {project.description && (
                <p className="text-sm text-slate-400 mb-4">
                  {project.description}
                </p>
              )}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Apps</div>
                  <div className="text-slate-100 font-semibold">
                    {project.applicationCount ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Runs</div>
                  <div className="text-slate-100 font-semibold">
                    {project.totalRuns ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Branch</div>
                  <div className="text-slate-100 font-semibold text-xs">
                    {project.defaultBranch}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
