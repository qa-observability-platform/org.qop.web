// src/app/organizations/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { api, type Organization } from '@/lib/api';
import Link from 'next/link';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrganizations() {
      try {
        setLoading(true);
        const orgs = await api.organizations.list();
        setOrganizations(orgs);
      } catch (err) {
        console.error('Failed to load organizations:', err);
        setError('Failed to load organizations');
      } finally {
        setLoading(false);
      }
    }

    loadOrganizations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading organizations...</div>
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
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Organizations</h1>
        <p className="text-slate-400 mt-2">
          Select an organization to view its projects and applications
        </p>
      </div>

      {organizations.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
          <p className="text-slate-400">No organizations found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <Link
              key={org.id}
              href={`/organizations/${org.id}/projects`}
              className="block p-6 bg-slate-900 rounded-lg border border-slate-800 hover:border-emerald-500 transition-colors"
            >
              <h2 className="text-xl font-semibold text-slate-100 mb-3">
                {org.name}
              </h2>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Projects</div>
                  <div className="text-slate-100 font-semibold text-lg">
                    {org.projectCount ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Apps</div>
                  <div className="text-slate-100 font-semibold text-lg">
                    {org.applicationCount ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Runs</div>
                  <div className="text-slate-100 font-semibold text-lg">
                    {org.totalRuns ?? 0}
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
