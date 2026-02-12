'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { tokenStorage } from '@/lib/api';
import { JobNumberBadge } from '@/components/JobNumberBadge';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface TestRun {
  runId: string;
  runIdentifier: string;
  status: string;
  branch: string | null;
  commitSha: string | null;
  ciBuildNumber: string | null;
  environment: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
}

interface Job {
  jobPrefix: string;
  jobNumber: number;
  jobId: string;
  runs: TestRun[];
}

interface DateGroup {
  date: string;
  jobs: Job[];
}

interface Framework {
  runnerType: string;
  dates: DateGroup[];
}

interface Application {
  applicationId: string;
  applicationName: string;
  appKey: string;
  projectKey: string;
  frameworks: Framework[];
}

interface DashboardData {
  applications: Application[];
}

interface DayStats {
  date: string;
  totalJobs: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number;
  frameworks: { [key: string]: number };
}

interface AppSummary {
  applicationName: string;
  applicationId: string;
  totalRuns: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number;
  frameworks: { [key: string]: number };
  lastRunDate: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  useEffect(() => {
    loadDashboardData();
  }, [days]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(`${API_BASE}/dashboard/grouped-runs?days=${days}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const result = await res.json();
      setData(result);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    if (!data) return null;

    let totalRuns = 0;
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    let totalApplications = data.applications.length;
    const frameworkCounts: { [key: string]: number } = {};

    data.applications.forEach((app) => {
      app.frameworks.forEach((fw) => {
        frameworkCounts[fw.runnerType] = (frameworkCounts[fw.runnerType] || 0) + 1;
        fw.dates.forEach((dateGroup) => {
          dateGroup.jobs.forEach((job) => {
            job.runs.forEach((run) => {
              totalRuns++;
              totalTests += run.totalTests;
              passedTests += run.passedTests;
              failedTests += run.failedTests;
              skippedTests += run.skippedTests;
            });
          });
        });
      });
    });

    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    return {
      totalApplications,
      totalRuns,
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      passRate,
      frameworkCounts,
    };
  }, [data]);

  // Calculate application summaries
  const appSummaries = useMemo((): AppSummary[] => {
    if (!data) return [];

    return data.applications.map((app) => {
      let totalRuns = 0;
      let totalTests = 0;
      let passedTests = 0;
      let failedTests = 0;
      let skippedTests = 0;
      const frameworks: { [key: string]: number } = {};
      let lastRunDate = '';

      app.frameworks.forEach((fw) => {
        fw.dates.forEach((dateGroup) => {
          dateGroup.jobs.forEach((job) => {
            frameworks[fw.runnerType] = (frameworks[fw.runnerType] || 0) + job.runs.length;
            job.runs.forEach((run) => {
              totalRuns++;
              totalTests += run.totalTests;
              passedTests += run.passedTests;
              failedTests += run.failedTests;
              skippedTests += run.skippedTests;

              if (!lastRunDate || run.createdAt > lastRunDate) {
                lastRunDate = run.createdAt;
              }
            });
          });
        });
      });

      const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

      return {
        applicationName: app.applicationName,
        applicationId: app.applicationId,
        totalRuns,
        totalTests,
        passedTests,
        failedTests,
        skippedTests,
        passRate,
        frameworks,
        lastRunDate,
      };
    }).sort((a, b) => b.totalRuns - a.totalRuns);
  }, [data]);

  // Calculate day-wise statistics
  const dayWiseStats = useMemo((): DayStats[] => {
    if (!data) return [];

    const statsMap: { [date: string]: DayStats } = {};

    data.applications.forEach((app) => {
      app.frameworks.forEach((fw) => {
        fw.dates.forEach((dateGroup) => {
          if (!statsMap[dateGroup.date]) {
            statsMap[dateGroup.date] = {
              date: dateGroup.date,
              totalJobs: 0,
              totalTests: 0,
              passedTests: 0,
              failedTests: 0,
              skippedTests: 0,
              passRate: 0,
              frameworks: {},
            };
          }

          const stats = statsMap[dateGroup.date];
          stats.totalJobs += dateGroup.jobs.length;
          stats.frameworks[fw.runnerType] = (stats.frameworks[fw.runnerType] || 0) + dateGroup.jobs.length;

          dateGroup.jobs.forEach((job) => {
            job.runs.forEach((run) => {
              stats.totalTests += run.totalTests;
              stats.passedTests += run.passedTests;
              stats.failedTests += run.failedTests;
              stats.skippedTests += run.skippedTests;
            });
          });
        });
      });
    });

    // Calculate pass rates
    Object.values(statsMap).forEach((stats) => {
      stats.passRate = stats.totalTests > 0 ? Math.round((stats.passedTests / stats.totalTests) * 100) : 0;
    });

    return Object.values(statsMap).sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
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

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs rounded-md font-medium';
    switch (status) {
      case 'passed':
      case 'success':
        return `${baseClasses} bg-green-500/10 text-green-400 border border-green-500/30`;
      case 'failed':
        return `${baseClasses} bg-red-500/10 text-red-400 border border-red-500/30`;
      case 'running':
      case 'in_progress':
        return `${baseClasses} bg-blue-500/10 text-blue-400 border border-blue-500/30`;
      default:
        return `${baseClasses} bg-gray-500/10 text-gray-400 border border-gray-500/30`;
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return null;
    if (!selectedApp && !selectedFramework) return data;

    return {
      applications: data.applications
        .filter((app) => !selectedApp || app.applicationId === selectedApp)
        .map((app) => ({
          ...app,
          frameworks: app.frameworks.filter((fw) => !selectedFramework || fw.runnerType === selectedFramework),
        }))
        .filter((app) => app.frameworks.length > 0),
    };
  }, [data, selectedApp, selectedFramework]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading dashboard analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-[1800px] mx-auto">
          <h1 className="text-3xl font-bold mb-6">Test Execution Dashboard</h1>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <div className="text-red-400 font-medium mb-2">Error Loading Dashboard</div>
            <div className="text-gray-300">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Test Execution Dashboard</h1>
            <p className="text-gray-400">
              Comprehensive analytics and insights for automated test executions
            </p>
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

        {!data?.applications || data.applications.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
            <div className="text-gray-400 text-lg">No test runs found in the selected time range</div>
          </div>
        ) : (
          <>
            {/* Overall Statistics */}
            <div className="grid grid-cols-6 gap-4">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-lg p-4">
                <div className="text-blue-400 text-sm mb-1 font-medium">Applications</div>
                <div className="text-3xl font-bold">{overallStats?.totalApplications || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                <div className="text-purple-400 text-sm mb-1 font-medium">Total Runs</div>
                <div className="text-3xl font-bold">{overallStats?.totalRuns || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 border border-gray-500/30 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1 font-medium">Total Tests</div>
                <div className="text-3xl font-bold">{overallStats?.totalTests.toLocaleString() || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-lg p-4">
                <div className="text-green-400 text-sm mb-1 font-medium">Passed</div>
                <div className="text-3xl font-bold text-green-400">{overallStats?.passedTests.toLocaleString() || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/30 rounded-lg p-4">
                <div className="text-red-400 text-sm mb-1 font-medium">Failed</div>
                <div className="text-3xl font-bold text-red-400">{overallStats?.failedTests.toLocaleString() || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-lg p-4">
                <div className="text-emerald-400 text-sm mb-1 font-medium">Pass Rate</div>
                <div className="text-3xl font-bold text-emerald-400">{overallStats?.passRate || 0}%</div>
              </div>
            </div>

            {/* View Mode Toggle and Filters */}
            <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 font-medium">View:</span>
                <button
                  onClick={() => setViewMode('overview')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'overview'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'detailed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Detailed
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 font-medium">Filters:</span>
                <select
                  value={selectedApp || ''}
                  onChange={(e) => setSelectedApp(e.target.value || null)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Applications</option>
                  {data.applications.map((app) => (
                    <option key={app.applicationId} value={app.applicationId}>
                      {app.applicationName}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedFramework || ''}
                  onChange={(e) => setSelectedFramework(e.target.value || null)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Frameworks</option>
                  <option value="playwright">🎭 Playwright</option>
                  <option value="selenium">🌐 Selenium</option>
                  <option value="api">🔌 API</option>
                </select>
                {(selectedApp || selectedFramework) && (
                  <button
                    onClick={() => {
                      setSelectedApp(null);
                      setSelectedFramework(null);
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {viewMode === 'overview' ? (
              <>
                {/* Application Summary Cards */}
                <div>
                  <h2 className="text-xl font-bold mb-4">Applications Overview</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {appSummaries.map((app) => (
                      <div
                        key={app.applicationId}
                        className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold mb-1">{app.applicationName}</h3>
                            <div className="text-sm text-gray-400">
                              Last run: {formatDate(app.lastRunDate.split('T')[0])}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-emerald-400">{app.passRate}%</div>
                            <div className="text-xs text-gray-500">Pass Rate</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3 mb-4">
                          <div className="text-center">
                            <div className="text-xl font-bold">{app.totalRuns}</div>
                            <div className="text-xs text-gray-500">Runs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold">{app.totalTests}</div>
                            <div className="text-xs text-gray-500">Tests</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-green-400">{app.passedTests}</div>
                            <div className="text-xs text-gray-500">Passed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-red-400">{app.failedTests}</div>
                            <div className="text-xs text-gray-500">Failed</div>
                          </div>
                        </div>

                        {/* Framework breakdown */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {Object.entries(app.frameworks).map(([framework, count]) => (
                            <span
                              key={framework}
                              className="px-3 py-1 bg-gray-700 rounded-full text-xs font-medium flex items-center gap-1"
                            >
                              {getFrameworkIcon(framework)}
                              <span className="capitalize">{framework}</span>
                              <span className="text-gray-400">({count})</span>
                            </span>
                          ))}
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                            style={{ width: `${app.passRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day-wise Statistics */}
                <div>
                  <h2 className="text-xl font-bold mb-4">Day-wise Execution Summary</h2>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-750 border-b border-gray-700">
                          <tr>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Date</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">Jobs</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">Total Tests</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">Passed</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">Failed</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">Skipped</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">Pass Rate</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Frameworks</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">Trend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {dayWiseStats.map((dayStat, index) => (
                            <tr key={dayStat.date} className="hover:bg-gray-750 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-medium">{formatDate(dayStat.date)}</div>
                                <div className="text-xs text-gray-500">{dayStat.date}</div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm font-semibold">
                                  {dayStat.totalJobs}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center font-mono text-sm">
                                {dayStat.totalTests.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-center font-mono text-sm text-green-400">
                                {dayStat.passedTests.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-center font-mono text-sm text-red-400">
                                {dayStat.failedTests.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-center font-mono text-sm text-yellow-400">
                                {dayStat.skippedTests.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-green-500"
                                      style={{ width: `${dayStat.passRate}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-semibold text-emerald-400 w-10">
                                    {dayStat.passRate}%
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {Object.entries(dayStat.frameworks).map(([framework, count]) => (
                                    <span
                                      key={framework}
                                      className="text-xs px-2 py-1 bg-gray-700 rounded flex items-center gap-1"
                                    >
                                      {getFrameworkIcon(framework)}
                                      <span className="text-gray-400">{count}</span>
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {index < dayWiseStats.length - 1 && (
                                  <>
                                    {dayStat.passRate > dayWiseStats[index + 1].passRate ? (
                                      <span className="text-green-400">↑</span>
                                    ) : dayStat.passRate < dayWiseStats[index + 1].passRate ? (
                                      <span className="text-red-400">↓</span>
                                    ) : (
                                      <span className="text-gray-500">→</span>
                                    )}
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Pass Rate Trend Graph */}
                <div>
                  <h2 className="text-xl font-bold mb-4">Pass Rate Trend</h2>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <div className="h-64 flex items-end justify-between gap-2">
                      {dayWiseStats.slice().reverse().map((stat, index) => {
                        const maxTests = Math.max(...dayWiseStats.map((s) => s.totalTests));
                        const height = (stat.totalTests / maxTests) * 100;
                        const isWeekend = new Date(stat.date).getDay() === 0 || new Date(stat.date).getDay() === 6;

                        return (
                          <div key={stat.date} className="flex-1 flex flex-col items-center gap-2">
                            <div className="text-xs text-gray-500 font-medium text-center">
                              {stat.passRate}%
                            </div>
                            <div className="w-full flex flex-col items-center justify-end h-48">
                              <div
                                className={`w-full rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer ${
                                  stat.passRate >= 90
                                    ? 'bg-gradient-to-t from-green-500 to-green-400'
                                    : stat.passRate >= 70
                                    ? 'bg-gradient-to-t from-yellow-500 to-yellow-400'
                                    : 'bg-gradient-to-t from-red-500 to-red-400'
                                }`}
                                style={{ height: `${height}%` }}
                                title={`${stat.date}: ${stat.totalTests} tests, ${stat.passRate}% passed`}
                              />
                            </div>
                            <div className={`text-xs text-center ${isWeekend ? 'text-blue-400' : 'text-gray-500'}`}>
                              {formatDate(stat.date).split(',')[0]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-center gap-6 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded" />
                        <span className="text-gray-400">≥90% Pass Rate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded" />
                        <span className="text-gray-400">70-89% Pass Rate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded" />
                        <span className="text-gray-400">&lt;70% Pass Rate</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Detailed View - Original Hierarchical Structure */
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Detailed Execution History</h2>
                {filteredData?.applications.map((app) => (
                  <ApplicationDetailView key={app.applicationId} app={app} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Detailed view component for hierarchical drill-down
function ApplicationDetailView({ app }: { app: Application }) {
  const [expandedFrameworks, setExpandedFrameworks] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  const toggleExpanded = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const newSet = new Set(set);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setter(newSet);
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (startedAt: string | null, finishedAt: string | null) => {
    if (!startedAt) return 'N/A';
    const start = new Date(startedAt).getTime();
    const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
    const durationMs = end - start;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs rounded-md font-medium';
    switch (status) {
      case 'passed':
      case 'success':
        return `${baseClasses} bg-green-500/10 text-green-400 border border-green-500/30`;
      case 'failed':
        return `${baseClasses} bg-red-500/10 text-red-400 border border-red-500/30`;
      default:
        return `${baseClasses} bg-gray-500/10 text-gray-400 border border-gray-500/30`;
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 bg-gray-750 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">{app.applicationName}</h3>
            <div className="text-sm text-gray-400">
              {app.projectKey} / {app.appKey}
            </div>
          </div>
          <div className="text-sm text-gray-400">{app.frameworks.length} framework(s)</div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {app.frameworks.map((framework) => {
          const fwKey = `${app.applicationId}-${framework.runnerType}`;
          const isFwExpanded = expandedFrameworks.has(fwKey);

          return (
            <div key={fwKey} className="bg-gray-750 border border-gray-600 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleExpanded(expandedFrameworks, setExpandedFrameworks, fwKey)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{isFwExpanded ? '▼' : '▶'}</span>
                  <span className="text-lg">{getFrameworkIcon(framework.runnerType)}</span>
                  <div className="font-semibold capitalize">{framework.runnerType}</div>
                </div>
                <div className="text-sm text-gray-400">{framework.dates.length} date(s)</div>
              </button>

              {isFwExpanded && (
                <div className="px-4 pb-3 space-y-2">
                  {framework.dates.map((dateGroup) => {
                    const dateKey = `${fwKey}-${dateGroup.date}`;
                    const isDateExpanded = expandedDates.has(dateKey);

                    return (
                      <div key={dateKey} className="bg-gray-800 border border-gray-600 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleExpanded(expandedDates, setExpandedDates, dateKey)}
                          className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-750 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span>{isDateExpanded ? '▼' : '▶'}</span>
                            <div className="font-medium">{formatDate(dateGroup.date)}</div>
                            <div className="text-sm text-gray-500">{dateGroup.date}</div>
                          </div>
                          <div className="text-sm text-gray-400">{dateGroup.jobs.length} job(s)</div>
                        </button>

                        {isDateExpanded && (
                          <div className="px-4 pb-2 space-y-2">
                            {dateGroup.jobs.map((job) => {
                              const jobKey = `${dateKey}-${job.jobId}`;
                              const isJobExpanded = expandedJobs.has(jobKey);

                              return (
                                <div
                                  key={jobKey}
                                  className="bg-gray-850 border border-gray-600 rounded-lg overflow-hidden"
                                >
                                  <button
                                    onClick={() => toggleExpanded(expandedJobs, setExpandedJobs, jobKey)}
                                    className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-800 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm">{isJobExpanded ? '▼' : '▶'}</span>
                                      <JobNumberBadge
                                        jobPrefix={job.jobPrefix}
                                        jobNumber={job.jobNumber}
                                        runnerType={framework.runnerType}
                                        size="md"
                                      />
                                    </div>
                                    <div className="text-sm text-gray-400">{job.runs.length} run(s)</div>
                                  </button>

                                  {isJobExpanded && (
                                    <div className="px-4 pb-2">
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="border-b border-gray-700">
                                              <th className="text-left py-2 px-2 text-gray-400 font-medium">
                                                Status
                                              </th>
                                              <th className="text-left py-2 px-2 text-gray-400 font-medium">
                                                Tests
                                              </th>
                                              <th className="text-left py-2 px-2 text-gray-400 font-medium">
                                                Branch
                                              </th>
                                              <th className="text-left py-2 px-2 text-gray-400 font-medium">
                                                Started
                                              </th>
                                              <th className="text-left py-2 px-2 text-gray-400 font-medium">
                                                Duration
                                              </th>
                                              <th className="text-left py-2 px-2 text-gray-400 font-medium">
                                                Actions
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {job.runs.map((run) => (
                                              <tr
                                                key={run.runId}
                                                className="border-b border-gray-700/50 hover:bg-gray-800/50"
                                              >
                                                <td className="py-3 px-2">
                                                  <span className={getStatusBadge(run.status)}>
                                                    {run.status.toUpperCase()}
                                                  </span>
                                                </td>
                                                <td className="py-3 px-2">
                                                  <div className="flex items-center gap-2 font-mono text-xs">
                                                    <span className="text-green-400">{run.passedTests} ✓</span>
                                                    <span className="text-red-400">{run.failedTests} ✗</span>
                                                    <span className="text-gray-500">/ {run.totalTests}</span>
                                                  </div>
                                                </td>
                                                <td className="py-3 px-2">
                                                  <span className="font-mono text-xs text-gray-300">
                                                    {run.branch || 'N/A'}
                                                  </span>
                                                </td>
                                                <td className="py-3 px-2">
                                                  <span className="font-mono text-xs text-gray-400">
                                                    {formatTime(run.startedAt)}
                                                  </span>
                                                </td>
                                                <td className="py-3 px-2">
                                                  <span className="font-mono text-xs text-gray-400">
                                                    {calculateDuration(run.startedAt, run.finishedAt)}
                                                  </span>
                                                </td>
                                                <td className="py-3 px-2">
                                                  <Link
                                                    href={`/runs/${run.runId}`}
                                                    className="text-blue-400 hover:text-blue-300 text-xs underline"
                                                  >
                                                    Details
                                                  </Link>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
