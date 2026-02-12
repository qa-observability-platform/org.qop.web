'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tokenStorage } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface TestRun {
  id: string;
  runId: string;
  runnerType: string;
  jobNumber: number;
  jobPrefix: string;
  jobLabel: string;
  status: string;
  branch: string | null;
  commitSha: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  totalTests: number;
  failedTests: number;
  passedTests: number;
  skippedTests: number;
}

interface TrendData {
  executionNumber: number;
  runId: string;
  runLabel: string;
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  broken: number;
}

interface TrendMeta {
  xAxis: string;
  yAxis: string;
  totalExecutions: number;
}

export default function ApplicationRunsPage() {
  const params = useParams();
  const router = useRouter();
  const appKey = params?.appKey as string;

  const [runs, setRuns] = useState<TestRun[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [trendMeta, setTrendMeta] = useState<TrendMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appKey) {
      loadRunsData();
      loadTrendsData();
    }
  }, [appKey]);

  const loadRunsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(`${API_BASE}/applications/${appKey}/runs`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch runs data');
      }

      const json = await res.json();
      setRuns(json.runs);
    } catch (err: any) {
      console.error('Runs error:', err);
      setError(err.message || 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  };

  const loadTrendsData = async () => {
    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(`${API_BASE}/applications/${appKey}/trends?limit=20`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch trends data');
      }

      const json = await res.json();
      setTrends(json.trends);
      setTrendMeta(json.meta);
    } catch (err: any) {
      console.error('Trends error:', err);
    }
  };

  const handleViewDetails = (runId: string) => {
    router.push(`/run-details/${runId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRunnerTypeColor = (runnerType: string) => {
    switch (runnerType?.toLowerCase()) {
      case 'playwright':
        return 'bg-purple-100 text-purple-800';
      case 'selenium':
        return 'bg-orange-100 text-orange-800';
      case 'api':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getExecutionStatus = (run: TestRun) => {
    if (run.failedTests === 0 && run.passedTests > 0) return 'Success';
    if (run.failedTests > 0 && run.passedTests > 0) return 'Partial';
    if (run.failedTests > 0) return 'Failed';
    return 'Unknown';
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'Success':
        return 'text-green-700 bg-green-100';
      case 'Partial':
        return 'text-yellow-700 bg-yellow-100';
      case 'Failed':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  // Calculate max value for Y-axis scaling
  const maxTestCount = trends.length > 0
    ? Math.max(...trends.map(t => t.total), 1)
    : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Execution Runs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold text-lg mb-2">Error Loading Runs</h2>
          <p className="text-red-600">{error}</p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={loadRunsData}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/dashboard-clean')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard-clean')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Execution Runs
          </h1>
          <p className="text-gray-600">Application: <span className="font-semibold">{appKey}</span></p>
          <p className="text-sm text-gray-500 mt-1">Total Runs: {runs.length}</p>
        </div>

        {/* XY Trend Analysis */}
        {trends.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Trend Analysis</h2>
            <p className="text-sm text-gray-500 mb-6">
              {trendMeta?.xAxis} vs {trendMeta?.yAxis} (Last {trendMeta?.totalExecutions} Executions)
            </p>

            {/* XY Line Chart */}
            <div className="relative" style={{ height: '400px' }}>
              {/* Y-Axis Label */}
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -rotate-90 origin-center">
                <span className="text-sm font-semibold text-gray-700">Number of Test Cases</span>
              </div>

              {/* Chart Area */}
              <div className="ml-16 mr-4 h-full flex flex-col">
                {/* Y-Axis with Grid Lines */}
                <div className="flex-1 relative border-l-2 border-b-2 border-gray-300">
                  {/* Y-Axis Grid Lines and Labels */}
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const value = Math.round((maxTestCount / 5) * (5 - i));
                    const yPos = `${(i / 5) * 100}%`;
                    return (
                      <div key={i} className="absolute left-0 right-0" style={{ top: yPos }}>
                        <div className="border-t border-gray-200 relative">
                          <span className="absolute -left-12 -top-2 text-xs text-gray-600">{value}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* SVG for Lines */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <defs>
                      {/* Passed Line */}
                      <linearGradient id="passedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0" />
                      </linearGradient>
                      {/* Failed Line */}
                      <linearGradient id="failedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0" />
                      </linearGradient>
                      {/* Skipped Line */}
                      <linearGradient id="skippedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgb(234, 179, 8)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="rgb(234, 179, 8)" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Passed Line */}
                    <polyline
                      fill="none"
                      stroke="rgb(34, 197, 94)"
                      strokeWidth="3"
                      points={trends.map((trend, index) => {
                        const x = (index / (trends.length - 1)) * 100;
                        const y = 100 - ((trend.passed / maxTestCount) * 100);
                        return `${x},${y}`;
                      }).join(' ')}
                    />

                    {/* Failed Line */}
                    <polyline
                      fill="none"
                      stroke="rgb(239, 68, 68)"
                      strokeWidth="3"
                      points={trends.map((trend, index) => {
                        const x = (index / (trends.length - 1)) * 100;
                        const y = 100 - ((trend.failed / maxTestCount) * 100);
                        return `${x},${y}`;
                      }).join(' ')}
                    />

                    {/* Skipped Line */}
                    <polyline
                      fill="none"
                      stroke="rgb(234, 179, 8)"
                      strokeWidth="3"
                      points={trends.map((trend, index) => {
                        const x = (index / (trends.length - 1)) * 100;
                        const y = 100 - ((trend.skipped / maxTestCount) * 100);
                        return `${x},${y}`;
                      }).join(' ')}
                    />

                    {/* Data Points */}
                    {trends.map((trend, index) => {
                      const x = (index / (trends.length - 1)) * 100;
                      const yPassed = 100 - ((trend.passed / maxTestCount) * 100);
                      const yFailed = 100 - ((trend.failed / maxTestCount) * 100);
                      const ySkipped = 100 - ((trend.skipped / maxTestCount) * 100);

                      return (
                        <g key={index}>
                          <circle cx={`${x}%`} cy={`${yPassed}%`} r="4" fill="rgb(34, 197, 94)" />
                          <circle cx={`${x}%`} cy={`${yFailed}%`} r="4" fill="rgb(239, 68, 68)" />
                          <circle cx={`${x}%`} cy={`${ySkipped}%`} r="4" fill="rgb(234, 179, 8)" />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Tooltips on Hover (simplified) */}
                  <div className="absolute inset-0 flex">
                    {trends.map((trend, index) => (
                      <div
                        key={index}
                        className="flex-1 relative group cursor-pointer"
                        title={`${trend.runLabel}\nPassed: ${trend.passed}\nFailed: ${trend.failed}\nSkipped: ${trend.skipped}`}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-10">
                          <div className="font-semibold">{trend.runLabel}</div>
                          <div className="text-green-400">Passed: {trend.passed}</div>
                          <div className="text-red-400">Failed: {trend.failed}</div>
                          <div className="text-yellow-400">Skipped: {trend.skipped}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* X-Axis Labels */}
                <div className="flex mt-2 ml-0.5">
                  {trends.map((trend, index) => (
                    <div key={index} className="flex-1 text-center">
                      <span className="text-xs text-gray-600 transform -rotate-45 inline-block origin-top-left">
                        {trend.runLabel}
                      </span>
                    </div>
                  ))}
                </div>

                {/* X-Axis Label */}
                <div className="text-center mt-6">
                  <span className="text-sm font-semibold text-gray-700">Execution Runs</span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-8 flex gap-8 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-green-500 rounded"></div>
                <span>Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-red-500 rounded"></div>
                <span>Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-yellow-500 rounded"></div>
                <span>Skipped</span>
              </div>
            </div>

            {/* Axis Information */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm text-gray-600">
                <div><strong>X-Axis:</strong> {trendMeta?.xAxis}</div>
                <div><strong>Y-Axis:</strong> {trendMeta?.yAxis}</div>
              </div>
            </div>
          </div>
        )}

        {/* Execution Runs Table (Persistent History) */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-800">
            <h2 className="text-2xl font-bold text-white">
              Execution History
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Run ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Execution Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Total Tests
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Passed
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Failed
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Skipped
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {runs.map((run) => {
                  const execStatus = getExecutionStatus(run);
                  return (
                    <tr key={run.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {run.jobLabel}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRunnerTypeColor(run.runnerType)}`}>
                          {run.runnerType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{formatDate(run.createdAt)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-gray-700">{run.totalTests}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-green-600">{run.passedTests}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-semibold ${run.failedTests > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {run.failedTests}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-yellow-600">{run.skippedTests}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getExecutionStatusColor(execStatus)}`}>
                          {execStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleViewDetails(run.id)}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm hover:underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {runs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No execution runs found for this application.</p>
          </div>
        )}
      </div>
    </div>
  );
}
