'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { tokenStorage } from '@/lib/api';
import LiveBrowserViewer from '@/components/LiveBrowserViewer';
import { getApiBase, getWsBase } from '@/lib/config';

const API_BASE = getApiBase();
const WS_BASE = getWsBase();

type AIAnalysis = {
  category: string;
  rootCause?: string;
  recommendation?: string;
  severity?: string;
  confidence?: number;
  isFlaky?: boolean;
};

type TestCase = {
  key: string;
  status: 'yet_to_load' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  sequence: number;
  timestamp?: number;
  aiAnalysis?: AIAnalysis;
};

type RunDetail = {
  id: string;
  runId: string;
  applicationId: string;
  applicationName: string;
  appKey: string;
  projectKey: string;
  status: string;
  runnerType: string | null;
  jobNumber: number | null;
  jobPrefix: string | null;
  branch: string | null;
  startedAt: string | null;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  runningTests: number;
  skippedTests: number;
  tests: TestCase[];
};

export default function RunDetailPage() {
  const params = useParams();
  const applicationId = params.applicationId as string;
  const runId = params.runId as string;

  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [runCompleted, setRunCompleted] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadRunDetail();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [runId]);

  const loadRunDetail = async () => {
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

      // Find the specific run
      const run = data.liveExecutions.find(
        (exec: any) => exec.runId === runId
      );

      if (!run) {
        console.log('[RunDetail] Run not found - may be completed');
        setRunCompleted(true);
        setLoading(false);
        // Don't redirect - stay on page to show completed state
        return;
      }

      // Double-check run is still active
      if (run.status !== 'running' && run.status !== 'in_progress') {
        console.log('[RunDetail] Run completed with status:', run.status);
        setRunCompleted(true);
        // Don't redirect - stay on page to show results
      }

      // Fetch existing test executions from database
      let existingTests: TestCase[] = [];
      try {
        const testsRes = await fetch(`${API_BASE}/runs/${run.id}/executions`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });

        if (testsRes.ok) {
          const testsData = await testsRes.json();
          existingTests = testsData.executions.map((exec: any, index: number) => ({
            key: exec.testKey || exec.testName || `Test ${index + 1}`,
            status: exec.status || 'yet_to_load',
            duration: exec.durationMs,
            error: exec.errorMessage,
            sequence: index + 1,
            timestamp: exec.startedAt ? new Date(exec.startedAt).getTime() : Date.now(),
          }));
          console.log('[RunDetail] Loaded existing tests:', existingTests.length);
        }
      } catch (testErr) {
        console.warn('[RunDetail] Could not load existing tests:', testErr);
      }

      setRunDetail({
        ...run,
        tests: existingTests,
      });

      setLoading(false);

      // Connect WebSocket for real-time updates
      connectWebSocket();
    } catch (err: any) {
      console.error('[RunDetail] Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    const wsUrl = `${WS_BASE}/ws/live?runId=${runId}`;
    console.log('[RunDetail] Connecting WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[RunDetail] WebSocket connected');
      setWsConnected(true);
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      console.log('[RunDetail] Message:', msg);

      if (msg.type === 'connected') {
        console.log('[RunDetail] Connection confirmed');
      } else if (msg.type === 'ai_analysis') {
        // Handle AI analysis result
        console.log('[RunDetail] AI Analysis received:', msg.analysis);
        setRunDetail((prev) => {
          if (!prev) return prev;

          const existingTests = prev.tests || [];
          const testIndex = existingTests.findIndex((t) => t.key === msg.testKey);

          if (testIndex >= 0) {
            const updatedTests = [...existingTests];
            updatedTests[testIndex] = {
              ...updatedTests[testIndex],
              aiAnalysis: msg.analysis,
            };

            return {
              ...prev,
              tests: updatedTests,
            };
          }

          return prev;
        });
      } else if (msg.type === 'ui_update') {
        setRunDetail((prev) => {
          if (!prev) return prev;

          const existingTests = prev.tests || [];
          const testIndex = existingTests.findIndex((t) => t.key === msg.testKey);

          let updatedTests: TestCase[];

          if (testIndex >= 0) {
            // Update existing test
            updatedTests = [...existingTests];
            updatedTests[testIndex] = {
              ...updatedTests[testIndex],
              status: msg.status,
              duration: msg.durationMs,
              error: msg.errorMessage,
              timestamp: Date.now(),
            };
          } else {
            // Add new test
            updatedTests = [
              ...existingTests,
              {
                key: msg.testKey,
                status: msg.status,
                duration: msg.durationMs,
                error: msg.errorMessage,
                sequence: existingTests.length + 1,
                timestamp: Date.now(),
              },
            ];
          }

          // Recalculate stats
          const stats = updatedTests.reduce(
            (acc, test) => {
              if (test.status === 'passed') acc.passed++;
              else if (test.status === 'failed') acc.failed++;
              else if (test.status === 'skipped') acc.skipped++;
              else if (test.status === 'running') acc.running++;
              return acc;
            },
            { passed: 0, failed: 0, skipped: 0, running: 0 }
          );

          return {
            ...prev,
            tests: updatedTests,
            totalTests: updatedTests.length,
            passedTests: stats.passed,
            failedTests: stats.failed,
            skippedTests: stats.skipped,
            runningTests: stats.running,
          };
        });
      } else if (msg.type === 'run_summary') {
        console.log('[RunDetail] Run completed via WebSocket - redirecting to home');
        setWsConnected(false);
        setRunCompleted(true);

        // Redirect immediately to home to catch next test
        setTimeout(() => {
          window.location.href = `/live-execution`;
        }, 1000);
      }
    };

    ws.onerror = (err) => {
      console.error('[RunDetail] WebSocket error:', err);
    };

    ws.onclose = () => {
      console.log('[RunDetail] WebSocket closed');
      setWsConnected(false);
    };

    wsRef.current = ws;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'running':
        return 'text-blue-400';
      case 'skipped':
        return 'text-yellow-400';
      case 'yet_to_load':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-500/10';
      case 'failed':
        return 'bg-red-500/10';
      case 'running':
        return 'bg-blue-500/10';
      case 'skipped':
        return 'bg-yellow-500/10';
      case 'yet_to_load':
        return 'bg-gray-800';
      default:
        return 'bg-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        {/* Completion Banner */}
        {runCompleted && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-green-400 font-semibold text-sm">Run Completed!</p>
                <p className="text-green-300 text-xs">Redirecting to application page in 5 seconds...</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/live-execution/${applicationId}`}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-2 text-sm"
            >
              ← Back to {runDetail?.applicationName || 'Application'}
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-3">
                {runDetail?.jobPrefix && runDetail?.jobNumber && (
                  <span>{runDetail.jobPrefix} #{runDetail.jobNumber}</span>
                )}
                {wsConnected && (
                  <span className="flex items-center gap-2 text-xs text-green-400 font-normal">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    Live
                  </span>
                )}
              </h1>
              <p className="text-gray-400 font-mono text-xs">{runId}</p>
              {runDetail?.branch && (
                <p className="text-gray-500 text-xs">Branch: {runDetail.branch}</p>
              )}
            </div>
          </div>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-sm font-medium transition-colors"
          >
            Dashboard
          </Link>
        </div>

        {/* Summary Stats - Compact */}
        <div className="grid grid-cols-5 gap-3 mt-4">
          <div className="bg-gray-700 border border-gray-600 rounded p-2">
            <div className="text-gray-400 text-xs mb-0.5">Total</div>
            <div className="text-xl font-bold">{runDetail?.totalTests ?? 0}</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
            <div className="text-blue-400 text-xs mb-0.5 flex items-center gap-1">
              Running
              {(runDetail?.runningTests ?? 0) > 0 && (
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              )}
            </div>
            <div className="text-xl font-bold text-blue-400">{runDetail?.runningTests ?? 0}</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
            <div className="text-green-400 text-xs mb-0.5">Passed</div>
            <div className="text-xl font-bold text-green-400">{runDetail?.passedTests ?? 0}</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
            <div className="text-red-400 text-xs mb-0.5">Failed</div>
            <div className="text-xl font-bold text-red-400">{runDetail?.failedTests ?? 0}</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
            <div className="text-yellow-400 text-xs mb-0.5">Skipped</div>
            <div className="text-xl font-bold text-yellow-400">{runDetail?.skippedTests ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="text-red-400 font-medium text-sm mb-1">Error loading run details</div>
          <div className="text-gray-300 text-xs">{error}</div>
        </div>
      )}

      {/* Split View Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Live Browser View (65%) */}
        <div className="w-[65%] border-r border-gray-700 flex flex-col">
          <LiveBrowserViewer runId={runId} />
        </div>

        {/* Right: Test Cases List (35%) */}
        <div className="w-[35%] flex flex-col bg-gray-900">
          <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-white">Test Execution</h2>
          </div>

          {/* Test Cases List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 text-xs">Loading tests...</p>
                </div>
              </div>
            ) : (
            <table className="w-full">
              <thead className="bg-gray-750 border-b border-gray-700 sticky top-0">
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 w-10">#</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Test</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {(runDetail?.tests ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-500 text-xs">
                      Waiting for test execution to begin...
                    </td>
                  </tr>
                ) : (
                  (runDetail?.tests ?? [])
                    .sort((a, b) => a.sequence - b.sequence)
                    .map((test) => (
                      <tr
                        key={test.key}
                        className={`${getStatusBg(test.status)} transition-colors ${
                          test.status === 'running' ? 'animate-pulse' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-xs text-gray-500 font-mono">{test.sequence}</td>
                        <td className="py-2 px-3">
                          <div className="font-mono text-xs text-gray-300 truncate" title={test.key}>
                            {test.key.split('::').pop() || test.key}
                          </div>
                          {test.aiAnalysis?.isFlaky && (
                            <div className="mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded border border-orange-500/30">
                                Flaky
                              </span>
                            </div>
                          )}
                          {test.error && (
                            <div className="text-[10px] text-red-400 truncate mt-1" title={test.error}>
                              {test.error}
                            </div>
                          )}
                          {test.aiAnalysis && (
                            <div className="mt-1">
                              <details className="text-[10px]">
                                <summary className="cursor-pointer text-purple-400 hover:text-purple-300">
                                  AI Analysis
                                </summary>
                                <div className="mt-2 p-2 bg-gray-800/50 rounded border border-gray-700 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded border ${
                                      test.aiAnalysis.severity === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                      test.aiAnalysis.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                      test.aiAnalysis.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                      'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                    }`}>
                                      {test.aiAnalysis.severity?.toUpperCase() || 'INFO'}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded">
                                      {test.aiAnalysis.category}
                                    </span>
                                  </div>
                                  {test.aiAnalysis.rootCause && (
                                    <div className="text-gray-300">
                                      <span className="text-gray-400 font-semibold">Root Cause:</span> {test.aiAnalysis.rootCause}
                                    </div>
                                  )}
                                  {test.aiAnalysis.recommendation && (
                                    <div className="text-blue-300">
                                      <span className="text-blue-400 font-semibold">Fix:</span> {test.aiAnalysis.recommendation}
                                    </div>
                                  )}
                                </div>
                              </details>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[10px] font-semibold uppercase ${getStatusColor(test.status)}`}>
                            {test.status === 'yet_to_load' ? 'Pending' : test.status}
                          </span>
                          {test.duration !== undefined && (
                            <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                              {test.duration}ms
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
