'use client';

import { useState, useEffect } from 'react';
import { tokenStorage } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface Job {
  id: string;
  run_id: string;
  job_number: number;
  job_prefix: string;
  status: string;
  branch: string | null;
  started_at: string;
  finished_at: string | null;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  pass_rate: number;
}

interface ComparisonResult {
  currentRun: {
    id: string;
    runId: string;
    jobNumber: number;
    branch: string | null;
    status: string;
    metrics: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      skippedTests: number;
      passRate: string;
    };
  };
  compareRun: {
    id: string;
    runId: string;
    jobNumber: number;
    branch: string | null;
    status: string;
    metrics: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      skippedTests: number;
      passRate: string;
    };
  };
  changes: {
    regressions: number;
    fixes: number;
    newTests: number;
    removedTests: number;
    stillFailing: number;
    stillPassing: number;
  };
  regressions: Array<{
    testId: string;
    testName: string;
    testKey: string;
    currentError: string;
    previousStatus: string;
  }>;
  fixes: Array<{
    testId: string;
    testName: string;
    testKey: string;
  }>;
  newTests: Array<{
    testId: string;
    testName: string;
    testKey: string;
    status: string;
  }>;
  aiInsights: {
    available: boolean;
    summary?: string;
    rootCause?: string;
    categories?: string;
    recommendations?: string;
    confidence?: number;
    comparisonMetrics?: {
      passRateDelta: number;
      failureIncrease: number;
      regressionCount: number;
    };
    // NEW FEATURES
    failureClusters?: Array<{
      cluster_id: number;
      count: number;
      common_pattern: string;
      failures: string[];
      error_sample: string;
    }>;
    riskScore?: {
      score: number;
      level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      recommendation: string;
      factors: {
        passRate?: { penalty: number; detail: string };
        passRateDelta?: { penalty: number; detail: string };
        regressions?: { penalty: number; detail: string };
        criticalPath?: { penalty: number; detail: string };
      };
      breakdown: string;
    };
    visualDiff?: {
      regressions: any[];
      fixes: number;
      stillFailing: number;
      stillPassing: number;
    };
  };
}

interface ComparisonHistoryItem {
  id: string;
  currentRun: {
    id: string;
    runNumber: string;
    jobNumber: number;
    branch: string | null;
  };
  compareRun: {
    id: string;
    runNumber: string;
    jobNumber: number;
    branch: string | null;
  };
  name: string | null;
  isBookmarked: boolean;
  notes: string | null;
  riskScore: any;
  tags: string[];
  createdAt: string;
  viewCount: number;
}

interface ExistingComparison {
  exists: boolean;
  comparison: {
    id: string;
    name: string | null;
    isBookmarked: boolean;
    createdAt: string;
    viewCount: number;
    riskScore: any;
  } | null;
}

interface ComparativeAnalysisProps {
  currentRunId: string;
  applicationId: string;
}

export default function ComparativeAnalysis({ currentRunId, applicationId }: ComparativeAnalysisProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Comparison History State
  const [existingComparison, setExistingComparison] = useState<ExistingComparison | null>(null);
  const [comparisonHistory, setComparisonHistory] = useState<ComparisonHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [savingComparison, setSavingComparison] = useState(false);
  const [currentComparisonId, setCurrentComparisonId] = useState<string | null>(null);

  // Load available jobs for comparison
  useEffect(() => {
    loadJobs();
    loadComparisonHistory();
  }, [applicationId]);

  // Check if comparison exists when job is selected
  useEffect(() => {
    if (selectedJobId && currentRunId) {
      checkExistingComparison();
    }
  }, [selectedJobId, currentRunId]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(`${API_BASE}/api/comparative-analysis/jobs/${applicationId}?limit=50`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        // Filter out current run
        const availableJobs = data.jobs.filter((j: Job) => j.id !== currentRunId);
        setJobs(availableJobs);

        // Auto-select most recent completed job
        const recentCompleted = availableJobs.find((j: Job) =>
          j.status === 'completed' && parseFloat(j.pass_rate.toString()) === 100
        );
        if (recentCompleted) {
          setSelectedJobId(recentCompleted.id);
        } else if (availableJobs.length > 0) {
          setSelectedJobId(availableJobs[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const runComparison = async () => {
    if (!selectedJobId) {
      setError('Please select a job to compare');
      return;
    }

    setAnalyzing(true);
    setError(null);
    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(`${API_BASE}/api/comparative-analysis/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          currentRunId: currentRunId,
          compareRunId: selectedJobId,
          applicationId: applicationId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComparison(data);
        setShowModal(true);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to run comparison');
      }
    } catch (err) {
      console.error('Error running comparison:', err);
      setError('Failed to run comparison');
    } finally {
      setAnalyzing(false);
    }
  };

  const checkExistingComparison = async () => {
    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(
        `${API_BASE}/api/comparison-history/check/${currentRunId}/${selectedJobId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setExistingComparison(data);
        if (data.exists) {
          setCurrentComparisonId(data.comparison.id);
        } else {
          setCurrentComparisonId(null);
        }
      }
    } catch (err) {
      console.error('Error checking existing comparison:', err);
    }
  };

  const loadComparisonHistory = async () => {
    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(`${API_BASE}/api/comparison-history/${applicationId}?limit=20`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setComparisonHistory(data.comparisons || []);
      }
    } catch (err) {
      console.error('Error loading comparison history:', err);
    }
  };

  const saveComparison = async () => {
    if (!comparison) return;

    setSavingComparison(true);
    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(`${API_BASE}/api/comparison-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          currentRunId: currentRunId,
          compareRunId: selectedJobId,
          applicationId: applicationId,
          comparisonResult: comparison,
          riskScoreData: comparison.aiInsights?.riskScore,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentComparisonId(data.comparisonId);
        await loadComparisonHistory();
        await checkExistingComparison();
      } else {
        const errorData = await res.json();
        if (errorData.comparisonId) {
          // Comparison already exists
          setCurrentComparisonId(errorData.comparisonId);
        } else {
          setError(errorData.error || 'Failed to save comparison');
        }
      }
    } catch (err) {
      console.error('Error saving comparison:', err);
      setError('Failed to save comparison');
    } finally {
      setSavingComparison(false);
    }
  };

  const toggleBookmark = async (comparisonId: string, currentBookmarkStatus: boolean) => {
    try {
      const accessToken = tokenStorage.getAccessToken();
      await fetch(`${API_BASE}/api/comparison-history/${comparisonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          isBookmarked: !currentBookmarkStatus,
        }),
      });

      await loadComparisonHistory();
      if (existingComparison?.comparison?.id === comparisonId) {
        await checkExistingComparison();
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  const loadSavedComparison = async (comparisonId: string) => {
    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(`${API_BASE}/api/comparison-history/detail/${comparisonId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setComparison(data.comparison.comparisonResult);
        setCurrentComparisonId(comparisonId);
        setShowModal(true);
      }
    } catch (err) {
      console.error('Error loading saved comparison:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* Trigger Button */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Comparative Analysis
            </h3>
            <p className="text-sm text-gray-400">
              Compare this run with a previous job to understand failures
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Existing Comparison Badge */}
            {existingComparison?.exists && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 border border-green-700 rounded-lg text-sm">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-300">Already Compared</span>
                {existingComparison.comparison?.isBookmarked && (
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
                <button
                  onClick={() => existingComparison.comparison && loadSavedComparison(existingComparison.comparison.id)}
                  className="text-xs text-green-400 hover:text-green-300 underline"
                >
                  View
                </button>
              </div>
            )}

            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              disabled={loading || analyzing}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
            >
              <option value="">Select job to compare...</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  Job #{job.job_number} — {job.total_tests} tests, {job.pass_rate}% pass ({formatDate(job.started_at)})
                </option>
              ))}
            </select>

            <button
              onClick={runComparison}
              disabled={!selectedJobId || analyzing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{existingComparison?.exists ? 'Compare Again' : 'Compare'}</span>
                </>
              )}
            </button>

            {/* History Button */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              title="View comparison history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>History ({comparisonHistory.length})</span>
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 p-2 bg-red-900/20 border border-red-700 rounded text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Comparison History Section */}
      {showHistory && comparisonHistory.length > 0 && (
        <div className="mt-4 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Comparisons
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {comparisonHistory.map((item) => (
              <div
                key={item.id}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        Job #{item.currentRun.jobNumber} vs Job #{item.compareRun.jobNumber}
                      </span>
                      {item.isBookmarked && (
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex gap-1">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-blue-900/50 border border-blue-700 text-blue-300 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{formatDate(item.createdAt)}</span>
                      {item.viewCount > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {item.viewCount}
                        </span>
                      )}
                      {item.riskScore && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          item.riskScore.level === 'CRITICAL' ? 'bg-red-900/50 text-red-300' :
                          item.riskScore.level === 'HIGH' ? 'bg-orange-900/50 text-orange-300' :
                          item.riskScore.level === 'MEDIUM' ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-green-900/50 text-green-300'
                        }`}>
                          {item.riskScore.level} RISK
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <p className="mt-1 text-xs text-gray-400 italic line-clamp-2">{item.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => loadSavedComparison(item.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => toggleBookmark(item.id, item.isBookmarked)}
                      className={`p-1.5 rounded transition-colors ${
                        item.isBookmarked
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
                      }`}
                      title={item.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                    >
                      <svg className="w-4 h-4" fill={item.isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Results Modal */}
      {showModal && comparison && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Comparative Analysis Results
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Job #{comparison.currentRun.jobNumber} vs Job #{comparison.compareRun.jobNumber}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Save Button */}
                {!currentComparisonId && (
                  <button
                    onClick={saveComparison}
                    disabled={savingComparison}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
                  >
                    {savingComparison ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        <span>Save Comparison</span>
                      </>
                    )}
                  </button>
                )}

                {/* Bookmark Button (if already saved) */}
                {currentComparisonId && (
                  <button
                    onClick={() => toggleBookmark(currentComparisonId, existingComparison?.comparison?.isBookmarked || false)}
                    className={`p-2 rounded-lg transition-colors ${
                      existingComparison?.comparison?.isBookmarked
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
                    }`}
                    title={existingComparison?.comparison?.isBookmarked ? 'Remove bookmark' : 'Bookmark this comparison'}
                  >
                    <svg className="w-5 h-5" fill={existingComparison?.comparison?.isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                )}

                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Metrics Comparison */}
              {(() => {
                const cur = comparison.currentRun.metrics;
                const prev = comparison.compareRun.metrics;
                const totalDiff = cur.totalTests - prev.totalTests;
                const passedDiff = cur.passedTests - prev.passedTests;
                const failedDiff = cur.failedTests - prev.failedTests;
                const rateDiff = parseFloat(cur.passRate) - parseFloat(prev.passRate);
                const countMismatch = cur.totalTests !== prev.totalTests;

                const delta = (val: number, invert = false) => {
                  if (val === 0) return <span className="text-gray-500 text-xs ml-1">(no change)</span>;
                  const positive = invert ? val < 0 : val > 0;
                  return (
                    <span className={`text-xs ml-1 font-medium ${positive ? 'text-green-400' : 'text-red-400'}`}>
                      {val > 0 ? '+' : ''}{val}
                    </span>
                  );
                };

                return (
                  <>
                    {/* Test count mismatch warning */}
                    {countMismatch && (
                      <div className="flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg text-sm">
                        <svg className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        <span className="text-yellow-300">
                          <strong>Test count differs:</strong> current run has <strong>{cur.totalTests}</strong> tests vs previous run&apos;s <strong>{prev.totalTests}</strong> ({totalDiff > 0 ? '+' : ''}{totalDiff} tests). Pass rate % comparison may be misleading — check the Changes Summary below for added/removed tests.
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {/* Current Run */}
                      <div className="bg-slate-800/60 border border-slate-600 rounded-lg p-4">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                          Current Run — Job #{comparison.currentRun.jobNumber}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Total Tests</span>
                            <span className="text-white font-bold">{cur.totalTests}{countMismatch && delta(totalDiff)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Pass Rate</span>
                            <span className={`font-bold ${parseFloat(cur.passRate) >= parseFloat(prev.passRate) ? 'text-green-400' : 'text-red-400'}`}>
                              {cur.passRate}%{delta(parseFloat(rateDiff.toFixed(1)))}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Passed</span>
                            <span className="text-green-400 font-semibold">{cur.passedTests}{delta(passedDiff)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Failed</span>
                            <span className="text-red-400 font-semibold">{cur.failedTests}{delta(failedDiff, true)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Previous Run */}
                      <div className="bg-slate-800/60 border border-slate-600 rounded-lg p-4">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                          Previous Run — Job #{comparison.compareRun.jobNumber}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Total Tests</span>
                            <span className="text-white font-bold">{prev.totalTests}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Pass Rate</span>
                            <span className="text-white font-bold">{prev.passRate}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Passed</span>
                            <span className="text-green-400 font-semibold">{prev.passedTests}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Failed</span>
                            <span className="text-red-400 font-semibold">{prev.failedTests}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Changes Summary */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Changes Summary</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-red-900/20 border border-red-700/50 rounded p-3">
                    <div className="text-red-300 font-semibold text-xl">{comparison.changes.regressions}</div>
                    <div className="text-gray-400 text-xs">Regressions (passed → failed)</div>
                  </div>
                  <div className="bg-green-900/20 border border-green-700/50 rounded p-3">
                    <div className="text-green-300 font-semibold text-xl">{comparison.changes.fixes}</div>
                    <div className="text-gray-400 text-xs">Fixes (failed → passed)</div>
                  </div>
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3">
                    <div className="text-blue-300 font-semibold text-xl">{comparison.changes.newTests}</div>
                    <div className="text-gray-400 text-xs">New Tests</div>
                  </div>
                </div>
              </div>

              {/* Risk Score */}
              {comparison.aiInsights?.riskScore && (
                <div className={`border-2 rounded-lg p-5 ${
                  comparison.aiInsights.riskScore.level === 'CRITICAL' ? 'bg-red-950/30 border-red-600' :
                  comparison.aiInsights.riskScore.level === 'HIGH' ? 'bg-orange-950/30 border-orange-600' :
                  comparison.aiInsights.riskScore.level === 'MEDIUM' ? 'bg-yellow-950/30 border-yellow-600' :
                  'bg-green-950/30 border-green-600'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Release Risk Score
                    </h3>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${
                        comparison.aiInsights.riskScore.level === 'CRITICAL' ? 'text-red-400' :
                        comparison.aiInsights.riskScore.level === 'HIGH' ? 'text-orange-400' :
                        comparison.aiInsights.riskScore.level === 'MEDIUM' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {comparison.aiInsights.riskScore.score}/100
                      </div>
                      <div className={`text-sm font-semibold ${
                        comparison.aiInsights.riskScore.level === 'CRITICAL' ? 'text-red-300' :
                        comparison.aiInsights.riskScore.level === 'HIGH' ? 'text-orange-300' :
                        comparison.aiInsights.riskScore.level === 'MEDIUM' ? 'text-yellow-300' :
                        'text-green-300'
                      }`}>
                        {comparison.aiInsights.riskScore.level} RISK
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          comparison.aiInsights.riskScore.level === 'CRITICAL' ? 'bg-red-600' :
                          comparison.aiInsights.riskScore.level === 'HIGH' ? 'bg-orange-600' :
                          comparison.aiInsights.riskScore.level === 'MEDIUM' ? 'bg-yellow-600' :
                          'bg-green-600'
                        }`}
                        style={{ width: `${comparison.aiInsights.riskScore.score}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Recommendation</div>
                    <div className="text-white font-medium">{comparison.aiInsights.riskScore.recommendation}</div>
                  </div>

                  {/* Score Breakdown */}
                  <div>
                    <div className="text-sm font-semibold text-gray-300 mb-2">Score Breakdown:</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {comparison.aiInsights.riskScore.factors.passRate && (
                        <div className="bg-gray-900/50 rounded p-2">
                          <div className="text-red-400 font-semibold">-{comparison.aiInsights.riskScore.factors.passRate.penalty} pts</div>
                          <div className="text-gray-400 text-xs">{comparison.aiInsights.riskScore.factors.passRate.detail}</div>
                        </div>
                      )}
                      {comparison.aiInsights.riskScore.factors.passRateDelta && comparison.aiInsights.riskScore.factors.passRateDelta.penalty > 0 && (
                        <div className="bg-gray-900/50 rounded p-2">
                          <div className="text-red-400 font-semibold">-{comparison.aiInsights.riskScore.factors.passRateDelta.penalty} pts</div>
                          <div className="text-gray-400 text-xs">{comparison.aiInsights.riskScore.factors.passRateDelta.detail}</div>
                        </div>
                      )}
                      {comparison.aiInsights.riskScore.factors.regressions && (
                        <div className="bg-gray-900/50 rounded p-2">
                          <div className="text-red-400 font-semibold">-{comparison.aiInsights.riskScore.factors.regressions.penalty} pts</div>
                          <div className="text-gray-400 text-xs">{comparison.aiInsights.riskScore.factors.regressions.detail}</div>
                        </div>
                      )}
                      {comparison.aiInsights.riskScore.factors.criticalPath && comparison.aiInsights.riskScore.factors.criticalPath.penalty > 0 && (
                        <div className="bg-gray-900/50 rounded p-2">
                          <div className="text-red-400 font-semibold">-{comparison.aiInsights.riskScore.factors.criticalPath.penalty} pts</div>
                          <div className="text-gray-400 text-xs">{comparison.aiInsights.riskScore.factors.criticalPath.detail}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Failure Clusters */}
              {comparison.aiInsights?.failureClusters && comparison.aiInsights.failureClusters.length > 0 && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Failure Clusters ({comparison.aiInsights.failureClusters.length})
                  </h3>
                  <div className="space-y-3">
                    {comparison.aiInsights.failureClusters.map((cluster) => (
                      <div key={cluster.cluster_id} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-sm font-semibold text-orange-400">{cluster.common_pattern}</div>
                            <div className="text-xs text-gray-400 mt-1">{cluster.count} test(s) affected</div>
                          </div>
                          <div className="bg-orange-900/30 border border-orange-700 rounded px-2 py-1">
                            <span className="text-xs font-semibold text-orange-300">Cluster #{cluster.cluster_id}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mb-2">
                          <span className="font-semibold">Tests:</span> {cluster.failures.join(', ')}
                        </div>
                        <div className="text-xs text-gray-500 bg-gray-950 rounded p-2 font-mono">
                          {cluster.error_sample}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Insights */}
              {comparison.aiInsights?.available && (
                <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-700/50 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI-Powered Insights
                    </h3>
                    {comparison.aiInsights.confidence && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Confidence:</span>
                        <div className="flex items-center gap-1">
                          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                              style={{ width: `${comparison.aiInsights.confidence}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-purple-300">{comparison.aiInsights.confidence}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {comparison.aiInsights.summary && (
                    <div className="mb-4">
                      <div className="text-sm font-semibold text-purple-300 mb-2">Summary</div>
                      <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {comparison.aiInsights.summary}
                      </div>
                    </div>
                  )}

                  {comparison.aiInsights.rootCause && (
                    <div className="mb-4">
                      <div className="text-sm font-semibold text-blue-300 mb-2">Root Cause Analysis</div>
                      <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap bg-gray-900/50 rounded p-3">
                        {comparison.aiInsights.rootCause}
                      </div>
                    </div>
                  )}

                  {comparison.aiInsights.recommendations && (
                    <div>
                      <div className="text-sm font-semibold text-green-300 mb-2">Recommendations</div>
                      <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap bg-gray-900/50 rounded p-3">
                        {comparison.aiInsights.recommendations}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Regressions List */}
              {comparison.regressions.length > 0 && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
                      {comparison.regressions.length}
                    </span>
                    Critical Regressions
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {comparison.regressions.slice(0, 10).map((regression, idx) => (
                      <div key={regression.testId} className="bg-red-900/10 border border-red-700/30 rounded p-3">
                        <div className="text-sm font-mono text-white mb-1">{regression.testName}</div>
                        {regression.currentError && (
                          <div className="text-xs text-gray-400 font-mono truncate">{regression.currentError}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
