'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { tokenStorage } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_QOP_API_URL || 'http://localhost:4000';

type Run = {
  id: string;
  runId: string;
  status: string;
  jobNumber: number | null;
  jobPrefix: string | null;
  branch: string | null;
  startedAt: string | null;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  runningTests: number;
  skippedTests: number;
};

type ApplicationDetail = {
  applicationId: string;
  applicationName: string;
  appKey: string;
  projectKey: string;
  runnerType: string;
  runs: Run[];
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const applicationId = params.applicationId as string;

  const [appDetail, setAppDetail] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplicationRuns();
    const interval = setInterval(loadApplicationRuns, 5000);
    return () => clearInterval(interval);
  }, [applicationId]);

  const loadApplicationRuns = async () => {
    try {
      const accessToken = tokenStorage.getAccessToken();
      const url = `${API_BASE}/live-executions?_t=${Date.now()}`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      // Filter executions for this application (only running)
      const appRuns = data.liveExecutions.filter(
        (exec: any) =>
          exec.applicationId === applicationId &&
          (exec.status === 'running' || exec.status === 'in_progress')
      );

      console.log('[ApplicationDetail] Active runs for app:', appRuns.length);

      if (appRuns.length === 0) {
        // All runs completed - redirect or show message
        console.log('[ApplicationDetail] No active runs, all completed');
        setError('All runs have completed. Redirecting to overview...');
        setTimeout(() => {
          window.location.href = '/live-execution';
        }, 3000);
        setLoading(false);
        return;
      }

      const firstRun = appRuns[0];
      setAppDetail({
        applicationId: firstRun.applicationId,
        applicationName: firstRun.applicationName,
        appKey: firstRun.appKey,
        projectKey: firstRun.projectKey,
        runnerType: firstRun.runnerType || 'unknown',
        runs: appRuns.map((exec: any) => ({
          id: exec.id,
          runId: exec.runId,
          status: exec.status,
          jobNumber: exec.jobNumber,
          jobPrefix: exec.jobPrefix,
          branch: exec.branch,
          startedAt: exec.startedAt,
          totalTests: exec.totalTests || 0,
          passedTests: exec.passedTests || 0,
          failedTests: exec.failedTests || 0,
          runningTests: exec.runningTests || 0,
          skippedTests: exec.skippedTests || 0,
        })),
      });

      setLoading(false);
    } catch (err: any) {
      console.error('[ApplicationDetail] Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
      case 'in_progress':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'passed':
      case 'completed':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'failed':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading application runs...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !appDetail) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Link
              href="/live-execution"
              className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
            >
              ← Back to Live Executions
            </Link>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <div className="text-red-400 font-medium mb-2">Error</div>
            <div className="text-gray-300">{error || 'Application not found'}</div>
          </div>
        </div>
      </div>
    );
  }

  const totalTests = appDetail.runs.reduce((sum, run) => sum + run.totalTests, 0);
  const totalRunning = appDetail.runs.reduce((sum, run) => sum + run.runningTests, 0);
  const totalPassed = appDetail.runs.reduce((sum, run) => sum + run.passedTests, 0);
  const totalFailed = appDetail.runs.reduce((sum, run) => sum + run.failedTests, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/live-execution"
            className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-4"
          >
            ← Back to Live Executions
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{appDetail.applicationName}</h1>
              <p className="text-gray-400">
                {appDetail.runs.length} active run{appDetail.runs.length !== 1 ? 's' : ''} • {appDetail.runnerType.toUpperCase()}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-medium transition-colors"
            >
              View Dashboard
            </Link>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Total Tests</div>
            <div className="text-3xl font-bold">{totalTests}</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="text-blue-400 text-sm mb-1">Running</div>
            <div className="text-3xl font-bold text-blue-400">{totalRunning}</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="text-green-400 text-sm mb-1">Passed</div>
            <div className="text-3xl font-bold text-green-400">{totalPassed}</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="text-red-400 text-sm mb-1">Failed</div>
            <div className="text-3xl font-bold text-red-400">{totalFailed}</div>
          </div>
        </div>

        {/* Runs Table */}
        <div className="overflow-x-auto">
          <table className="w-full bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-gray-750 border-b border-gray-700">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400">Run</th>
                <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400">Status</th>
                <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400">Started</th>
                <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400">Total</th>
                <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400">Running</th>
                <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400">Passed</th>
                <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400">Failed</th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {appDetail.runs.map((run) => (
                <tr
                  key={run.id}
                  className="hover:bg-gray-750 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div>
                      {run.jobNumber && (
                        <div className="font-semibold text-white mb-1">
                          {run.jobPrefix} #{run.jobNumber}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 font-mono">{run.runId}</div>
                      {run.branch && (
                        <div className="text-xs text-gray-400 mt-1">
                          Branch: {run.branch}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(run.status)}`}>
                      {run.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-sm text-gray-400">
                    {formatDate(run.startedAt)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-lg font-semibold">{run.totalTests}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-lg font-semibold text-blue-400">{run.runningTests}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-lg font-semibold text-green-400">{run.passedTests}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-lg font-semibold text-red-400">{run.failedTests}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link
                      href={`/live-execution/${applicationId}/${run.runId}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors inline-block"
                    >
                      View Tests
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
