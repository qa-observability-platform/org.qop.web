'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { tokenStorage } from '@/lib/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface ApplicationAnalytics {
  application: {
    id: string;
    name: string;
    appKey: string;
    runnerType: string;
    projectKey: string;
    uniqueTestCount: number;
  };
  latestExecution: {
    runId: string;
    status: string;
    jobNumber: number | null;
    jobPrefix: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
  } | null;
  trend: Array<{
    date: string;
    runs: number;
    totalExecutions: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
  }>;
}

interface JobExecution {
  id: string;
  runId: string;
  jobNumber: number;
  jobPrefix: string;
  status: string;
  branch: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  runnerType: string;
}

export default function ApplicationDetailsPage() {
  const params = useParams();
  const appId = params.appId as string;

  const [analytics, setAnalytics] = useState<ApplicationAnalytics | null>(null);
  const [jobs, setJobs] = useState<JobExecution[]>([]);
  const [selectedRun, setSelectedRun] = useState<JobExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadApplicationDetails(true);

    // Poll every 5 seconds to update running status
    const interval = setInterval(() => {
      loadApplicationDetails(false); // Don't show loading spinner on refresh
    }, 5000);

    return () => clearInterval(interval);
  }, [appId, days]);

  const loadApplicationDetails = async (isInitialLoad = true) => {
    // Only show loading spinner on initial load to prevent flickering
    if (isInitialLoad) {
      setLoading(true);
    }
    setError(null);

    try {
      const accessToken = tokenStorage.getAccessToken();

      // Load analytics
      const analyticsRes = await fetch(`${API_BASE}/applications/${appId}/analytics?days=${days}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        cache: 'no-store',
      });

      if (!analyticsRes.ok) {
        throw new Error('Failed to load application analytics');
      }

      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);

      // Load job executions (runs for this app) - already sorted recent to old by API
      const runsRes = await fetch(`${API_BASE}/runs?appKey=${analyticsData.application.appKey}&limit=50`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        cache: 'no-store',
      });

      if (runsRes.ok) {
        const runsData = await runsRes.json();
        const runsList = runsData.runs || [];

        // Sort by created_at DESC (recent to old) - API already does this, but ensure it
        const sortedRuns = [...runsList].sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeB - timeA; // Most recent first
        });

        setJobs(sortedRuns);

        // Auto-select the RUNNING test if exists, otherwise the latest run
        const runningJob = sortedRuns.find(job => job.status === 'running' || job.status === 'in_progress');
        if (runningJob) {
          setSelectedRun(runningJob);
        } else if (sortedRuns.length > 0) {
          setSelectedRun(sortedRuns[0]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load application details:', err);
      setError(err.message || 'Failed to load application details');
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
      case 'cypress':
        return '🌲';
      case 'puppeteer':
        return '🤖';
      default:
        return '🔧';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDuration = (startedAt: string | null, finishedAt: string | null) => {
    if (!startedAt) return 'N/A';
    const start = new Date(startedAt).getTime();
    const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
    const durationMs = end - start;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading application details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Application Details</h1>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <div className="text-red-400 font-medium mb-2">Error</div>
            <div className="text-gray-300">{error || 'Application not found'}</div>
            <Link href="/dashboard" className="text-blue-400 hover:underline mt-4 inline-block">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { application } = analytics;
  // Use selectedRun for displaying card data
  const displayRun = selectedRun;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link href="/dashboard" className="text-blue-400 hover:underline text-sm mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{getFrameworkIcon(application.runnerType)}</span>
              <div>
                <h1 className="text-3xl font-bold">{application.name}</h1>
                <div className="text-sm text-gray-400">
                  <span className="font-mono">{application.appKey}</span>
                  <span className="mx-2">•</span>
                  <span className="font-mono">{application.projectKey}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
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

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
            <div className="text-blue-400 text-sm mb-1 font-medium">
              {selectedRun?.id === jobs[0]?.id ? 'Latest Run: Total Tests' : 'Selected Run: Total Tests'}
            </div>
            <div className="text-4xl font-bold">{displayRun?.totalTests || application.uniqueTestCount}</div>
            <div className="text-xs text-gray-500 mt-1">
              {displayRun ? `Job #${displayRun.jobNumber || 'N/A'}` : 'In test suite'}
            </div>
          </div>
          {displayRun ? (
            <>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                <div className="text-green-400 text-sm mb-1 font-medium">
                  {selectedRun?.id === jobs[0]?.id ? 'Latest Run: Passed' : 'Selected Run: Passed'}
                </div>
                <div className="text-4xl font-bold text-green-400">{displayRun.passedTests}</div>
                <div className="text-xs text-gray-500 mt-1">
                  of {displayRun.totalTests} tests
                </div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                <div className="text-red-400 text-sm mb-1 font-medium">
                  {selectedRun?.id === jobs[0]?.id ? 'Latest Run: Failed' : 'Selected Run: Failed'}
                </div>
                <div className="text-4xl font-bold text-red-400">{displayRun.failedTests}</div>
                <div className="text-xs text-gray-500 mt-1">
                  of {displayRun.totalTests} tests
                </div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
                <div className="text-emerald-400 text-sm mb-1 font-medium">
                  {selectedRun?.id === jobs[0]?.id ? 'Latest Pass Rate' : 'Selected Pass Rate'}
                </div>
                <div className="text-4xl font-bold text-emerald-400">
                  {displayRun.totalTests > 0
                    ? Math.round((displayRun.passedTests / displayRun.totalTests) * 100)
                    : 0}
                  %
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Job #{displayRun.jobNumber || 'N/A'}
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-3 bg-gray-800 border border-gray-700 rounded-lg p-6 flex items-center justify-center">
              <p className="text-gray-500">No runs available. Run tests to see data.</p>
            </div>
          )}
        </div>

        {/* Flakiness Overview Card */}
        <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">🔬 Flaky Test Detection</h3>
              <p className="text-gray-400 text-sm mb-4">
                AI-powered detection of unstable tests that fail intermittently
              </p>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-gray-400">Flaky Tests: </span>
                  <span className="text-orange-400 font-semibold">Auto-detected</span>
                </div>
                <div>
                  <span className="text-gray-400">Root Causes: </span>
                  <span className="text-blue-400 font-semibold">Identified</span>
                </div>
                <div>
                  <span className="text-gray-400">Quarantine: </span>
                  <span className="text-purple-400 font-semibold">Automatic</span>
                </div>
              </div>
            </div>
            <Link
              href={`/applications/${appId}/flaky`}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition"
            >
              View Flaky Tests →
            </Link>
          </div>
        </div>

        {/* Pattern Learning Insights Card */}
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">🧠 Pattern Learning Insights</h3>
              <p className="text-gray-400 text-sm mb-4">
                Self-improving AI that learns from every fix and gets smarter over time
              </p>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-gray-400">Cache Hit Rate: </span>
                  <span className="text-purple-400 font-semibold">Real-time</span>
                </div>
                <div>
                  <span className="text-gray-400">Pattern Accuracy: </span>
                  <span className="text-blue-400 font-semibold">Evolving</span>
                </div>
                <div>
                  <span className="text-gray-400">Cost Savings: </span>
                  <span className="text-green-400 font-semibold">Tracked</span>
                </div>
              </div>
            </div>
            <Link
              href={`/applications/${appId}/pattern-insights`}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
            >
              View Pattern Insights →
            </Link>
          </div>
        </div>

        {/* Trend Report (Allure-like visualization) */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Execution Trend</h2>
          {jobs.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[...jobs].reverse().map((job, index) => ({
                    name: `Run #${index + 1}`,
                    runNumber: index + 1,
                    passed: job.passedTests,
                    failed: job.failedTests,
                    skipped: job.skippedTests,
                    total: job.totalTests,
                    jobNumber: job.jobNumber
                  }))}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Test Runs', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                    domain={[0, Math.max(...jobs.map(job => job.totalTests), 1)]}
                    label={{ value: 'Test Cases', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#E5E7EB' }}
                    itemStyle={{ color: '#E5E7EB' }}
                    cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 2 }}
                    formatter={(value: any, name: string, props: any) => {
                      const total = props.payload.total;
                      return [
                        `${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
                        name
                      ];
                    }}
                    labelFormatter={(label: string, payload: any) => {
                      if (payload && payload.length > 0) {
                        return `${label} (Job #${payload[0].payload.jobNumber || 'N/A'})`;
                      }
                      return label;
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <defs>
                    <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSkipped" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EAB308" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="passed"
                    stackId="1"
                    stroke="#10B981"
                    fill="url(#colorPassed)"
                    name="Passed"
                  />
                  <Area
                    type="monotone"
                    dataKey="skipped"
                    stackId="1"
                    stroke="#EAB308"
                    fill="url(#colorSkipped)"
                    name="Skipped"
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    stackId="1"
                    stroke="#EF4444"
                    fill="url(#colorFailed)"
                    name="Failed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              No execution data available. Run tests to see the trend.
            </div>
          )}
        </div>

        {/* Job-wise Execution History */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Job-wise Execution History</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-700">
                <tr className="text-left">
                  <th onClick={()=>console.log("run ****** ")} className="py-3 px-4 text-sm font-semibold text-gray-400">Run #</th>

                  <th className="py-3 px-4 text-sm font-semibold text-gray-400">Job #</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-400">Type</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-400">Status</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-400">Tests</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-400">Passed</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-400">Failed</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-400">Pass Rate</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-400">Branch</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-400">Duration</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-gray-500">
                      No job executions found
                    </td>
                  </tr>
                ) : (
                  jobs.map((job, index) => {
                    const passRate = job.totalTests > 0 ? Math.round((job.passedTests / job.totalTests) * 100) : 0;
                    const isSelected = selectedRun?.id === job.id;
                    const isRunning = job.status === 'running' || job.status === 'in_progress';
                    const runNumber = jobs.length - index; // Reverse numbering so latest is highest
                    console.log("Run nnumber %%%%% ", runNumber);  
                    return (
                      <tr
                        key={job.id}
                        className={`transition-colors cursor-pointer ${
                          isRunning
                            ? 'bg-green-500/10 border-l-4 border-green-500 animate-pulse'
                            : isSelected
                            ? 'bg-blue-500/20 border-l-4 border-blue-500'
                            : 'hover:bg-gray-750 border-l-4 border-transparent'
                          }`}
                        onClick={() => setSelectedRun(job)}
                      >
                        <td className="py-3 px-4">
                          <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-sm font-semibold font-mono">
                            #{runNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm font-semibold font-mono">
                            #{job.jobNumber || '?'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getFrameworkIcon(job.runnerType)}</span>
                            <span className="text-sm text-gray-300 capitalize">{job.runnerType || 'unknown'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 text-xs rounded-md font-medium ${
                                isRunning
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/50 animate-pulse'
                                  : job.status === 'completed'
                                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                  : job.status === 'failed'
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                                }`}
                            >
                              {job.status.toUpperCase()}
                            </span>
                            {isRunning && (
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-sm">{job.totalTests}</td>
                        <td className="py-3 px-4 font-mono text-sm text-green-400">{job.passedTests}</td>
                        <td className="py-3 px-4 font-mono text-sm text-red-400">{job.failedTests}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500"
                                style={{ width: `${passRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-emerald-400 w-10">{passRate}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-sm text-gray-400">{job.branch || 'N/A'}</td>
                        <td className="py-3 px-4 font-mono text-xs text-gray-500">
                          {formatDuration(job.startedAt, job.finishedAt)}
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/run-details/${job.id}`}
                            className="text-blue-400 hover:text-blue-300 text-xs underline"
                          >
                            View Tests
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
