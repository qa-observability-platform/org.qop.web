'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { tokenStorage } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface PatternStatistics {
  totalPatterns: number;
  activeSolutions: number;
  deprecatedSolutions: number;
  cacheHitRate: number;
  avgAccuracy: number;
}

interface TopPattern {
  id: string;
  patternType: string;
  errorMessagePattern: string;
  occurrenceCount: number;
  successRate: number;
  timesSuccessful: number;
  timesFailed: number;
  confidenceScore: number;
  avgResponseTime: number;
}

interface LearningProgress {
  periodStart: string;
  periodEnd: string;
  cachedResponsesUsed: number;
  cachedSolutionsSuccessful: number;
  aiApiCallsSaved: number;
  patternAccuracyRate: number;
  costSavings: number;
}

interface CostMetrics {
  totalApiCallsSaved: number;
  estimatedCostSavings: number;
  avgCachedResponseTime: number;
  avgAiResponseTime: number;
  timeEfficiencyGain: number;
}

export default function PatternInsightsPage() {
  const params = useParams();
  const appId = params.appId as string;

  const [statistics, setStatistics] = useState<PatternStatistics | null>(null);
  const [topPatterns, setTopPatterns] = useState<TopPattern[]>([]);
  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>([]);
  const [costMetrics, setCostMetrics] = useState<CostMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    loadPatternInsights();
  }, [appId, timeRange]);

  const loadPatternInsights = async () => {
    setLoading(true);
    try {
      const accessToken = tokenStorage.getAccessToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };

      // Load all data in parallel
      const [statsRes, patternsRes, progressRes, costRes] = await Promise.all([
        fetch(`${API_BASE}/api/pattern-learning/statistics/${appId}?timeRange=${timeRange}`, { headers }),
        fetch(`${API_BASE}/api/pattern-learning/top-patterns/${appId}?limit=10`, { headers }),
        fetch(`${API_BASE}/api/pattern-learning/progress/${appId}?timeRange=${timeRange}`, { headers }),
        fetch(`${API_BASE}/api/pattern-learning/cost-metrics/${appId}?timeRange=${timeRange}`, { headers }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStatistics(data);
      }

      if (patternsRes.ok) {
        const data = await patternsRes.json();
        setTopPatterns(data.patterns || []);
      }

      if (progressRes.ok) {
        const data = await progressRes.json();
        setLearningProgress(data.progress || []);
      }

      if (costRes.ok) {
        const data = await costRes.json();
        setCostMetrics(data);
      }

      setError(null);
    } catch (err: any) {
      console.error('Error loading pattern insights:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getPatternTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      timeout: 'bg-red-500/10 text-red-300 border-red-500/30',
      selector_not_found: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
      assertion_failed: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
      network_error: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      null_reference: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      navigation_error: 'bg-pink-500/10 text-pink-300 border-pink-500/30',
      unknown: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
    };
    return colors[type] || colors.unknown;
  };

  const triggerJob = async (jobType: 'link-outcomes' | 'aggregate-analytics' | 'deprecate' | 'run-all') => {
    setTriggeringJob(jobType);
    setJobResult(null);

    try {
      const endpoint = jobType === 'link-outcomes' ? '/api/pattern-learning-jobs/link-outcomes' :
                      jobType === 'aggregate-analytics' ? '/api/pattern-learning-jobs/aggregate-analytics' :
                      jobType === 'deprecate' ? '/api/pattern-learning-jobs/deprecate-underperforming' :
                      '/api/pattern-learning-jobs/run-all';

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: appId,
          ...(jobType === 'aggregate-analytics' && { periodType: 'weekly' })
        })
      });

      const data = await res.json();

      if (data.success) {
        setJobResult({ type: 'success', message: data.message || 'Job completed successfully' });
        // Reload data after job completes
        setTimeout(() => loadPatternInsights(), 1000);
      } else {
        setJobResult({ type: 'error', message: data.error || 'Job failed' });
      }
    } catch (err: any) {
      setJobResult({ type: 'error', message: err.message || 'Failed to trigger job' });
    } finally {
      setTriggeringJob(null);
      // Clear result after 5 seconds
      setTimeout(() => setJobResult(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading pattern insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-900/50 border-b border-gray-700/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/applications/${appId}/details`}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Pattern Learning Insights
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Self-improving AI that learns from every fix
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
                className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button
                onClick={loadPatternInsights}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-red-300 font-semibold">Error loading insights</p>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Pattern Learning Controls */}
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Pattern Learning Controls
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Manually trigger pattern learning jobs on-demand
              </p>
            </div>
          </div>

          {/* Job Result Notification */}
          {jobResult && (
            <div className={`mb-4 p-3 rounded-lg border flex items-center gap-2 ${
              jobResult.type === 'success'
                ? 'bg-emerald-900/20 border-emerald-700 text-emerald-300'
                : 'bg-red-900/20 border-red-700 text-red-300'
            }`}>
              {jobResult.type === 'success' ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">{jobResult.message}</span>
            </div>
          )}

          {/* Control Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => triggerJob('link-outcomes')}
              disabled={triggeringJob !== null}
              className="group relative px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-blue-500/50 disabled:shadow-none disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 justify-center">
                {triggeringJob === 'link-outcomes' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-sm">Link Outcomes</span>
                  </>
                )}
              </div>
              <div className="text-xs text-blue-100 mt-1 opacity-80">Connect results to patterns</div>
            </button>

            <button
              onClick={() => triggerJob('aggregate-analytics')}
              disabled={triggeringJob !== null}
              className="group relative px-4 py-3 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-gray-700 disabled:to-gray-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-purple-500/50 disabled:shadow-none disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 justify-center">
                {triggeringJob === 'aggregate-analytics' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-sm">Update Analytics</span>
                  </>
                )}
              </div>
              <div className="text-xs text-purple-100 mt-1 opacity-80">Refresh dashboard metrics</div>
            </button>

            <button
              onClick={() => triggerJob('deprecate')}
              disabled={triggeringJob !== null}
              className="group relative px-4 py-3 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 disabled:from-gray-700 disabled:to-gray-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-orange-500/50 disabled:shadow-none disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 justify-center">
                {triggeringJob === 'deprecate' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="text-sm">Clean Patterns</span>
                  </>
                )}
              </div>
              <div className="text-xs text-orange-100 mt-1 opacity-80">Remove underperforming</div>
            </button>

            <button
              onClick={() => triggerJob('run-all')}
              disabled={triggeringJob !== null}
              className="group relative px-4 py-3 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-gray-700 disabled:to-gray-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-emerald-500/50 disabled:shadow-none disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 justify-center">
                {triggeringJob === 'run-all' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm">Run All Jobs</span>
                  </>
                )}
              </div>
              <div className="text-xs text-emerald-100 mt-1 opacity-80">Execute all in sequence</div>
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="font-semibold text-gray-300">💡 Tip:</span> Use these controls to manually trigger pattern learning jobs on-demand.
              <span className="text-purple-400 font-medium"> Run All Jobs</span> is perfect for testing after deployment or before viewing updated analytics.
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Total Patterns</span>
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-white">{statistics.totalPatterns}</p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Active Solutions</span>
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-white">{statistics.activeSolutions}</p>
              <p className="text-xs text-gray-500 mt-1">{statistics.deprecatedSolutions} deprecated</p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Cache Hit Rate</span>
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-white">{statistics.cacheHitRate.toFixed(1)}%</p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Avg Accuracy</span>
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-white">{statistics.avgAccuracy.toFixed(1)}%</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-900/30 to-blue-900/30 border border-emerald-700/50 rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-emerald-300 font-semibold">Learning Status</span>
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-emerald-300">Active</p>
              <p className="text-xs text-emerald-400/70 mt-1">Getting smarter every day</p>
            </div>
          </div>
        )}

        {/* Cost Savings Metrics */}
        {costMetrics && (
          <div className="bg-gradient-to-r from-emerald-900/20 to-blue-900/20 border border-gray-700 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cost Savings & Performance
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-1">AI Calls Saved</p>
                  <p className="text-3xl font-bold text-emerald-400">{costMetrics.totalApiCallsSaved.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Pattern cache hits</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Est. Cost Savings</p>
                  <p className="text-3xl font-bold text-emerald-400">${costMetrics.estimatedCostSavings.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">@$0.01 per AI call</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Cached Response Time</p>
                  <p className="text-3xl font-bold text-blue-400">{costMetrics.avgCachedResponseTime.toFixed(0)}ms</p>
                  <p className="text-xs text-gray-500 mt-1">Lightning fast ⚡</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Time Efficiency Gain</p>
                  <p className="text-3xl font-bold text-purple-400">{costMetrics.timeEfficiencyGain.toFixed(0)}x</p>
                  <p className="text-xs text-gray-500 mt-1">Faster than AI calls</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Learning Progress Chart */}
        {learningProgress.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-800/70 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Learning Progress Over Time
              </h2>
              <p className="text-sm text-gray-400 mt-1">Accuracy improves as the system learns from outcomes</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {learningProgress.map((period, idx) => (
                  <div key={idx} className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-300">
                          {formatDate(period.periodStart)} - {formatDate(period.periodEnd)}
                        </p>
                        <p className="text-xs text-gray-500">Week {idx + 1}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-400">
                          {period.patternAccuracyRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-400">Accuracy</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Cached Responses</p>
                        <p className="text-white font-semibold">{period.cachedResponsesUsed}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Successful</p>
                        <p className="text-emerald-400 font-semibold">{period.cachedSolutionsSuccessful}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Cost Saved</p>
                        <p className="text-blue-400 font-semibold">${period.costSavings.toFixed(2)}</p>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ${
                            period.patternAccuracyRate >= 85 ? 'bg-emerald-500' :
                            period.patternAccuracyRate >= 70 ? 'bg-blue-500' :
                            period.patternAccuracyRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${period.patternAccuracyRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top Performing Patterns */}
        {topPatterns.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-800/70 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Top Performing Patterns
              </h2>
              <p className="text-sm text-gray-400 mt-1">Most reliable error patterns with proven solutions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Pattern</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Occurrences</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Success Rate</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Confidence</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {topPatterns.map((pattern, idx) => (
                    <tr key={pattern.id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-300 font-mono max-w-md truncate" title={pattern.errorMessagePattern}>
                          {pattern.errorMessagePattern}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border ${getPatternTypeColor(pattern.patternType)}`}>
                          {pattern.patternType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-semibold text-white">{pattern.occurrenceCount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`text-sm font-semibold ${
                            pattern.successRate >= 85 ? 'text-emerald-400' :
                            pattern.successRate >= 70 ? 'text-blue-400' :
                            pattern.successRate >= 50 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {pattern.successRate.toFixed(0)}%
                          </span>
                          <span className="text-xs text-gray-500">
                            ({pattern.timesSuccessful}/{pattern.timesSuccessful + pattern.timesFailed})
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 bg-gray-700/30 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${
                                pattern.confidenceScore >= 85 ? 'bg-emerald-500' :
                                pattern.confidenceScore >= 70 ? 'bg-blue-500' :
                                pattern.confidenceScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${pattern.confidenceScore}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-10 text-right">{pattern.confidenceScore.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-blue-400 font-mono">
                          {pattern.avgResponseTime < 200 ? '⚡ ' : ''}{pattern.avgResponseTime.toFixed(0)}ms
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && topPatterns.length === 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Pattern Data Yet</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              The pattern learning system is active and collecting data. Check back after a few test failures have been analyzed to see insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
