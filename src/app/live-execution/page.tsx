'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { tokenStorage } from '@/lib/api';

const API_BASE = 'http://localhost:4000';

type ApplicationSummary = {
  applicationId: string;
  applicationName: string;
  appKey: string;
  projectKey: string;
  runnerType: string;
  activeRuns: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  runningTests: number;
  skippedTests: number;
  runs: Array<{
    id: string;
    runId: string;
    jobNumber: number | null;
    branch: string | null;
    startedAt: string | null;
  }>;
};

export default function LiveExecutionOverviewPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasNavigated = useRef(false);

  useEffect(() => {
    console.log('[LiveExecution] Loading applications...');
    loadLiveExecutions();

    // Refresh every 5 seconds (reduced polling)
    const interval = setInterval(loadLiveExecutions, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadLiveExecutions = async () => {
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
      console.log('[LiveExecution] Loaded:', data.count, 'live executions');

      // Filter only running executions (API should already do this, but double-check)
      const runningExecutions = data.liveExecutions.filter(
        (exec: any) => exec.status === 'running' || exec.status === 'in_progress'
      );

      console.log('[LiveExecution] Filtered to running:', runningExecutions.length);

      // Group by applicationId
      const appMap = new Map<string, ApplicationSummary>();

      runningExecutions.forEach((exec: any) => {
        const appId = exec.applicationId;

        if (!appMap.has(appId)) {
          appMap.set(appId, {
            applicationId: appId,
            applicationName: exec.applicationName,
            appKey: exec.appKey,
            projectKey: exec.projectKey,
            runnerType: exec.runnerType || 'unknown',
            activeRuns: 0,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            runningTests: 0,
            skippedTests: 0,
            runs: [],
          });
        }

        const app = appMap.get(appId)!;
        app.activeRuns++;
        app.totalTests += exec.totalTests || 0;
        app.passedTests += exec.passedTests || 0;
        app.failedTests += exec.failedTests || 0;
        app.runningTests += exec.runningTests || 0;
        app.skippedTests += exec.skippedTests || 0;
        app.runs.push({
          id: exec.id,
          runId: exec.runId,
          jobNumber: exec.jobNumber,
          branch: exec.branch,
          startedAt: exec.startedAt,
        });
      });

      // Keep all applications (including recently completed for 2 minutes)
      const appList = Array.from(appMap.values());
      console.log('[LiveExecution] Applications with active/recent runs:', appList.length);

      // Show all running tests on the overview page
      // Only auto-navigate if there's exactly ONE running test
      if (appList.length === 1 && appList[0].runningTests > 0 && appList[0].runs.length > 0) {
        // Single test running - auto-navigate to it
        const sortedRuns = [...appList[0].runs].sort((a, b) => {
          const timeA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
          const timeB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
          return timeB - timeA; // Newest first
        });

        const latestRun = sortedRuns[0];
        console.log('[LiveExecution] Single test running - auto-navigating to:', latestRun.runId);
        hasNavigated.current = true;
        router.push(`/live-execution/${appList[0].applicationId}/${latestRun.runId}`);
        return;
      }

      // Multiple tests running in parallel - show overview
      if (appList.length > 1) {
        console.log('[LiveExecution] Multiple tests running in parallel - showing overview');
      }

      setApplications(appList);
      setLoading(false);
    } catch (err: any) {
      console.error('[LiveExecution] Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const getRunnerBadgeColor = (runnerType: string) => {
    switch (runnerType.toLowerCase()) {
      case 'playwright':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'cypress':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      case 'selenium':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'puppeteer':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading live executions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Live Executions</h1>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-medium transition-colors"
            >
              View Dashboard
            </Link>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <div className="text-red-400 font-medium mb-2">Connection Failed</div>
            <div className="text-gray-300">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Live Executions</h1>
            <p className="text-gray-400">Active test runs grouped by application</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-medium transition-colors"
          >
            View Dashboard
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-3 text-gray-300">No live executions running now</h2>
              <p className="text-gray-400 mb-6">Start a test run to see real-time results here</p>
              <Link
                href="/dashboard"
                className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-lg transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Live Execution Message */}
            {applications.some(app => app.runningTests > 0) && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <p className="text-blue-400 font-medium">Live execution in progress - watching test results in real-time</p>
                </div>
              </div>
            )}

            {/* Applications Table */}
            <div className="overflow-x-auto">
              <table className="w-full bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-gray-750 border-b border-gray-700">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400">Application</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400">Framework</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400">Active Runs</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400">Total Tests</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400">Running</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400">Passed</th>
                    <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400">Failed</th>
                    <th className="text-right py-4 px-6 text-xs font-semibold text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {applications.map((app) => (
                    <tr
                      key={app.applicationId}
                      onClick={() => router.push(`/live-execution/${app.applicationId}/${app.runs[0]?.runId}`)}
                      className="hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-semibold text-white">{app.applicationName}</div>
                          <div className="text-xs text-gray-500 font-mono">{app.appKey}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRunnerBadgeColor(app.runnerType)}`}>
                            {app.runnerType.toUpperCase()}
                          </span>
                          {app.runningTests > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/50 animate-pulse">
                              RUNNING
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-2xl font-bold text-blue-400">{app.activeRuns}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-lg font-semibold">{app.totalTests}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {app.runningTests > 0 && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                          )}
                          <span className="text-lg font-semibold text-blue-400">{app.runningTests}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-lg font-semibold text-green-400">{app.passedTests}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-lg font-semibold text-red-400">{app.failedTests}</span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm text-gray-400">Click to view live browser</span>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
