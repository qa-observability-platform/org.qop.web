'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { tokenStorage } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface ApplicationSummary {
  applicationId: string;
  applicationName: string;
  appKey: string;
  runnerType: string;
  projectKey: string;
  uniqueTestCount: number;
  totalRuns: number;
  lastRunAt: string | null;
  isRunning?: boolean;
  runningTestCount?: number;
  stats: {
    totalExecutions: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
  };
}

interface DashboardData {
  applications: ApplicationSummary[];
  summary: {
    totalApplications: number;
    totalUniqueTests: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedApp, setSelectedApp] = useState<ApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadDashboardData(true);

    // Poll for running status every 5 seconds
    const interval = setInterval(() => {
      loadDashboardData(false); // Don't show loading spinner on refresh
    }, 5000);

    return () => clearInterval(interval);
  }, [days]);

  // Auto-select first application when data loads
  useEffect(() => {
    if (data && data.applications.length > 0 && !selectedApp) {
      setSelectedApp(data.applications[0]);
    }
  }, [data, selectedApp]);

  const loadDashboardData = async (isInitialLoad = true) => {
    // Only show loading spinner on initial load to prevent flickering
    if (isInitialLoad) {
      setLoading(true);
    }
    setError(null);

    try {
      const accessToken = tokenStorage.getAccessToken();

      // Fetch dashboard data
      const res = await fetch(`${API_BASE}/dashboard/app-summary?days=${days}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const result = await res.json();

      // Fetch live executions to get running status
      const liveRes = await fetch(`${API_BASE}/live-executions`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      let liveExecutions: any[] = [];
      if (liveRes.ok) {
        const liveData = await liveRes.json();
        liveExecutions = liveData.liveExecutions || [];
      }

      // Merge running status into application data
      const appsWithRunningStatus = result.applications.map((app: ApplicationSummary) => {
        const runningExecution = liveExecutions.find(
          (exec: any) => exec.applicationId === app.applicationId
        );
        return {
          ...app,
          isRunning: !!runningExecution,
          runningTestCount: runningExecution?.runningTests || 0,
        };
      });

      setData({
        ...result,
        applications: appsWithRunningStatus,
      });
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const getFrameworkIcon = (runnerType: string) => {
    switch (runnerType) {
      case 'playwright':
        return '🎭';
      case 'selenium':
        return '🌐';
      case 'api':
        return '🔌';
      default:
        return '🔧';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const today = new Date();

    // Reset time to start of day for accurate day comparison
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = todayDay.getTime() - dateDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Format time
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    if (diffDays === 0) return `Today at ${timeStr}`;
    if (diffDays === 1) return `Yesterday at ${timeStr}`;
    if (diffDays < 7) return `${diffDays} days ago at ${timeStr}`;
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading dashboard...</p>
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
          <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <div className="text-red-400 font-medium mb-2">Error Loading Dashboard</div>
            <div className="text-gray-300">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.applications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
            <div className="text-gray-400 text-lg">No applications found</div>
            <p className="text-gray-500 text-sm mt-2">Create an application to get started</p>
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
            <h1 className="text-3xl font-bold mb-2">Test Execution Dashboard</h1>
            <p className="text-gray-400">Application-level test analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/live-execution"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live Executions
            </Link>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-lg p-6">
            <div className="text-blue-400 text-sm mb-1 font-medium">Total Applications</div>
            <div className="text-4xl font-bold">{data.summary.totalApplications}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-lg p-6">
            <div className="text-purple-400 text-sm mb-1 font-medium">Unique Test Cases</div>
            <div className="text-4xl font-bold">{data.summary.totalUniqueTests}</div>
            <div className="text-xs text-gray-500 mt-1">Across all applications</div>
          </div>
        </div>

        {/* Application List and Detail View */}
        <div className="grid grid-cols-12 gap-6">
          {/* Application List */}
          <div className="col-span-4 space-y-2">
            <h2 className="text-lg font-bold mb-3">Applications</h2>
            {data.applications.map((app) => (
              <button
                key={app.applicationId}
                onClick={() => setSelectedApp(app)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedApp?.applicationId === app.applicationId
                    ? 'bg-blue-600/20 border-blue-500/50'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getFrameworkIcon(app.runnerType)}</span>
                    <div>
                      <div className="font-semibold text-sm">{app.applicationName}</div>
                      <div className="text-xs text-gray-500 font-mono">{app.appKey}</div>
                    </div>
                  </div>
                  {app.isRunning && (
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/50 animate-pulse">
                        RUNNING
                      </span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Tests:</span>
                    <span className="ml-1 font-bold">{app.uniqueTestCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Runs:</span>
                    <span className="ml-1 font-bold">{app.totalRuns}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Selected Application Detail */}
          {selectedApp && (
            <div className="col-span-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{getFrameworkIcon(selectedApp.runnerType)}</span>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold">{selectedApp.applicationName}</h2>
                        {selectedApp.isRunning && (
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/50 animate-pulse">
                              RUNNING
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 font-mono">{selectedApp.appKey}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Last run: {formatDate(selectedApp.lastRunAt)}
                  </div>
                </div>
                <Link
                  href={`/applications/${selectedApp.applicationId}/details`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  View Details →
                </Link>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-750 border border-gray-600 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-400">{selectedApp.uniqueTestCount}</div>
                  <div className="text-xs text-gray-500 mt-1">Unique Tests</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">{selectedApp.stats.passed}</div>
                  <div className="text-xs text-gray-500 mt-1">Passed</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-400">{selectedApp.stats.failed}</div>
                  <div className="text-xs text-gray-500 mt-1">Failed</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-emerald-400">{selectedApp.stats.passRate}%</div>
                  <div className="text-xs text-gray-500 mt-1">Pass Rate</div>
                </div>
              </div>

              {/* Summary Section */}
              <div className="bg-gray-750 border border-gray-600 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Summary (Last {days} days)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Runs:</span>
                    <span className="font-semibold">{selectedApp.totalRuns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Test Executions:</span>
                    <span className="font-semibold">{selectedApp.stats.totalExecutions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Framework:</span>
                    <span className="font-semibold capitalize">{selectedApp.runnerType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Project:</span>
                    <span className="font-semibold font-mono">{selectedApp.projectKey}</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-gray-400">Overall Pass Rate</span>
                  <span className="font-semibold">{selectedApp.stats.passRate}%</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                    style={{ width: `${selectedApp.stats.passRate}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
