'use client';

import { useEffect, useState } from 'react';
import { tokenStorage } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

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

export default function DayWiseExecutionSummary() {
  const [dayWiseStats, setDayWiseStats] = useState<DayStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadDayWiseStats();
  }, [days]);

  const loadDayWiseStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(`${API_BASE}/dashboard/day-wise-summary?days=${days}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const result = await res.json();
      setDayWiseStats(result.dayWiseStats || []);
    } catch (err: any) {
      console.error('Failed to load day-wise summary:', err);
      setError(err.message || 'Failed to load day-wise summary');
    } finally {
      setLoading(false);
    }
  };

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
      case 'puppeteer':
        return '🎪';
      case 'api':
        return '🔌';
      default:
        return '🔧';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading day-wise execution summary...</p>
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
          <h1 className="text-3xl font-bold mb-6">Day-wise Execution Summary</h1>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <div className="text-red-400 font-medium mb-2">Error Loading Summary</div>
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
            <h1 className="text-3xl font-bold mb-2">Day-wise Execution Summary</h1>
            <p className="text-gray-400">
              Daily test execution statistics and trends
            </p>
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

        {dayWiseStats.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
            <div className="text-gray-400 text-lg">No test execution data found in the selected time range</div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
