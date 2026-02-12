// src/app/runs/[id]/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { AIExecutiveSummary } from '@/components/AIExecutiveSummary';

const API_BASE = process.env.NEXT_PUBLIC_QOP_API_URL ?? 'http://localhost:4000';
const WS_BASE = process.env.NEXT_PUBLIC_QOP_WS_URL ?? 'ws://localhost:4000';

type Run = {
  id: string;
  applicationId: string;
  applicationName: string;
  appKey: string;
  runId: string;
  status: string;
  branch: string | null;
  commitSha: string | null;
  ciBuildNumber: string | null;
  environment: string | null;
  createdAt: string;
};

type TestExecution = {
  id: string;
  testKey: string;
  status: 'running' | 'passed' | 'failed' | 'skipped';
  durationMs: number | null;
  errorMessage: string | null;
  aiAnalysis?: {
    rootCause: string | null;
    suggestedFix: string | null;
    category: string | null;
    severity: string | null;
    confidence: number | null;
    isFlaky: boolean;
  } | null;
};

type Summary = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  running: number;
};

export default function RunDetailPage({ params }: { params: { id: string } }) {
  const [run, setRun] = useState<Run | null>(null);
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, passed: 0, failed: 0, skipped: 0, running: 0 });
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [runRes, execRes, summaryRes] = await Promise.all([
          fetch(`${API_BASE}/runs/${params.id}`, { cache: 'no-store' }),
          fetch(`${API_BASE}/runs/${params.id}/executions`, { cache: 'no-store' }),
          fetch(`${API_BASE}/runs/${params.id}/summary`, { cache: 'no-store' }),
        ]);

        if (!runRes.ok) {
          setError('Run not found');
          setLoading(false);
          return;
        }

        const runData = await runRes.json();
        const execData = execRes.ok ? await execRes.json() : { executions: [] };
        const summaryData = summaryRes.ok ? await summaryRes.json() : { summary: { total: 0, passed: 0, failed: 0, skipped: 0, running: 0 } };

        setRun(runData.run);
        setExecutions(execData.executions);
        setSummary(summaryData.summary);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch run data');
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  // WebSocket connection for live updates
  useEffect(() => {
    if (!run) return;

    const ws = new WebSocket(`${WS_BASE}/ws/live?runId=${run.runId}`);
    let reconnectTimeout: NodeJS.Timeout;

    ws.onopen = () => {
      setWsStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'ui_update') {
          setExecutions(prev => {
            const index = prev.findIndex(e => e.testKey === data.testKey);
            const newExec = {
              id: data.testCaseExecutionId,
              testKey: data.testKey,
              status: data.status,
              durationMs: data.durationMs ?? null,
              errorMessage: data.errorMessage ?? null,
            };

            if (index >= 0) {
              const updated = [...prev];
              updated[index] = newExec;
              return updated;
            }
            return [...prev, newExec];
          });

          // Update summary
          setSummary(prev => {
            const newSummary = { ...prev };
            if (data.status === 'passed') {
              newSummary.passed++;
              newSummary.running = Math.max(0, newSummary.running - 1);
            } else if (data.status === 'failed') {
              newSummary.failed++;
              newSummary.running = Math.max(0, newSummary.running - 1);
            } else if (data.status === 'running') {
              newSummary.running++;
            }
            newSummary.total = newSummary.passed + newSummary.failed + newSummary.skipped + newSummary.running;
            return newSummary;
          });
        } else if (data.type === 'run_summary') {
          setSummary({
            total: data.totalTests,
            passed: data.passedTests,
            failed: data.failedTests,
            skipped: 0,
            running: 0,
          });
          if (run) {
            setRun({ ...run, status: data.status });
          }
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = () => {
      setWsStatus('disconnected');
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      // Auto-reconnect after 3 seconds
      reconnectTimeout = setTimeout(() => {
        setWsStatus('connecting');
      }, 3000);
    };

    return () => {
      clearTimeout(reconnectTimeout);
      ws.close();
    };
  }, [run]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading run details...</p>
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Run not found</h1>
        <p className="text-sm text-slate-400">
          No run exists with ID <code className="text-rose-300">{params.id}</code>
        </p>
        <Link href="/" className="text-sm text-emerald-300 hover:underline inline-flex items-center gap-1">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
  const isRunning = run.status === 'running';

  // Calculate AI metrics and insights
  const aiMetrics = useMemo(() => {
    const failedTests = executions.filter(e => e.status === 'failed');
    const aiAnalyzedCount = failedTests.filter(e => e.aiAnalysis?.rootCause).length;
    const autoFixableCount = failedTests.filter(e =>
      e.aiAnalysis?.confidence && e.aiAnalysis.confidence > 85
    ).length;

    // Business impact calculation (senior SDET rate: $265/hr, avg 2 hrs per failure)
    const engineeringCost = failedTests.length * 265 * 2;

    // Calculate health score (simplified)
    const healthScore = Math.max(0, Math.min(100, Math.round(
      (passRate * 0.5) + // 50% weight on pass rate
      (autoFixableCount / Math.max(failedTests.length, 1) * 100 * 0.3) + // 30% weight on auto-fixable
      ((100 - (failedTests.filter(e => e.aiAnalysis?.isFlaky).length / Math.max(failedTests.length, 1) * 100)) * 0.2) // 20% weight on flakiness
    )));

    // Generate insights
    const insights = [];

    // Critical failures
    const criticalFailures = failedTests.filter(e =>
      e.aiAnalysis?.severity === 'critical'
    );
    if (criticalFailures.length > 0) {
      insights.push({
        type: 'critical' as const,
        message: `${criticalFailures.length} critical test${criticalFailures.length > 1 ? 's' : ''} failing (blocks deployment)`,
        action: 'View Critical',
        estimatedTime: '30 min'
      });
    }

    // Auto-fixable tests
    if (autoFixableCount > 0) {
      insights.push({
        type: 'success' as const,
        message: `${autoFixableCount} test${autoFixableCount > 1 ? 's can' : ' can'} be auto-fixed with high confidence`,
        action: 'Apply Fixes',
        estimatedTime: '5 min'
      });
    }

    // Flaky tests
    const flakyCount = failedTests.filter(e => e.aiAnalysis?.isFlaky).length;
    if (flakyCount > 0) {
      insights.push({
        type: 'warning' as const,
        message: `${flakyCount} flaky test${flakyCount > 1 ? 's' : ''} detected - add retry strategies or fix root cause`,
        action: 'View Flaky',
        estimatedTime: '1 hour'
      });
    }

    // Timeout issues
    const timeoutCount = failedTests.filter(e =>
      e.aiAnalysis?.category === 'timeout'
    ).length;
    if (timeoutCount >= 3) {
      insights.push({
        type: 'info' as const,
        message: `${timeoutCount} timeout failures - consider increasing wait times or optimizing performance`,
        action: 'Review',
        estimatedTime: '20 min'
      });
    }

    return {
      aiAnalyzedCount,
      autoFixableCount,
      healthScore,
      engineeringCost,
      insights: insights.slice(0, 3) // Top 3 insights
    };
  }, [executions, passRate]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold">{run.applicationName}</h1>
            {statusBadge(run.status)}
            {wsStatus === 'connected' && isRunning && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 font-mono">{run.runId}</p>
        </div>
        <Link href="/" className="text-sm text-slate-400 hover:text-emerald-300 transition-colors">
          ← Dashboard
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Total" value={summary.total} color="slate" />
        <SummaryCard label="Passed" value={summary.passed} color="emerald" />
        <SummaryCard label="Failed" value={summary.failed} color="rose" />
        <SummaryCard label="Skipped" value={summary.skipped} color="amber" />
        <SummaryCard label="Running" value={summary.running} color="sky" spin={isRunning && summary.running > 0} />
      </div>

      {/* Pass Rate Bar */}
      {summary.total > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Pass Rate</span>
            <span className="text-lg font-semibold">{passRate}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${passRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Run Metadata */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-medium text-slate-300 mb-3">CI Metadata</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <MetadataItem label="Branch" value={run.branch} mono />
          <MetadataItem label="Commit" value={run.commitSha?.slice(0, 8)} mono />
          <MetadataItem label="Build" value={run.ciBuildNumber} />
          <MetadataItem label="Environment" value={run.environment} />
          <MetadataItem label="App Key" value={run.appKey} className="text-emerald-300" />
          <MetadataItem label="Created" value={new Date(run.createdAt).toLocaleString()} />
        </dl>
      </section>

      {/* AI Executive Summary */}
      {summary.failed > 0 && (
        <AIExecutiveSummary
          totalTests={summary.total}
          passedTests={summary.passed}
          failedTests={summary.failed}
          aiAnalysisComplete={aiMetrics.aiAnalyzedCount}
          executionTime={0}
          insights={aiMetrics.insights}
          healthScore={aiMetrics.healthScore}
          businessImpact={{
            cost: aiMetrics.engineeringCost,
            autoFixed: aiMetrics.autoFixableCount,
            prevented: 0
          }}
        />
      )}

      {/* Test Executions */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-300">Test Executions</h2>
          <span className="text-xs text-slate-500">{executions.length} tests</span>
        </div>
        
        {executions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {isRunning ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Waiting for test results...</p>
              </div>
            ) : (
              <p className="text-sm">No test executions found</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80">
                <tr className="border-b border-slate-800">
                  <th className="text-left p-3 text-slate-400 font-medium">Test</th>
                  <th className="text-left p-3 text-slate-400 font-medium">Status</th>
                  <th className="text-left p-3 text-slate-400 font-medium w-64">🤖 AI Analysis</th>
                  <th className="text-left p-3 text-slate-400 font-medium w-80">💡 Suggested Fix</th>
                  <th className="text-right p-3 text-slate-400 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((exec, idx) => (
                  <TestRow key={exec.id || idx} execution={exec} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ 
  label, 
  value, 
  color, 
  spin = false 
}: { 
  label: string; 
  value: number; 
  color: string;
  spin?: boolean;
}) {
  const colorClasses = {
    slate: 'bg-slate-500/10 text-slate-300 border-slate-500/40',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/40',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
    sky: 'bg-sky-500/10 text-sky-300 border-sky-500/40',
  }[color];

  return (
    <div className={`rounded-lg border p-3 ${colorClasses}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs opacity-80">{label}</span>
        {spin && (
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
        )}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function MetadataItem({ 
  label, 
  value, 
  mono = false,
  className = '' 
}: { 
  label: string; 
  value: string | null; 
  mono?: boolean;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-slate-500 text-xs mb-0.5">{label}</dt>
      <dd className={`${mono ? 'font-mono text-xs' : ''} ${className || 'text-slate-300'}`}>
        {value || '-'}
      </dd>
    </div>
  );
}

function TestRow({ execution }: { execution: TestExecution }) {
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [showFullFix, setShowFullFix] = useState(false);
  const isRunning = execution.status === 'running';
  const hasFailed = execution.status === 'failed';
  const hasAIAnalysis = execution.aiAnalysis && (execution.aiAnalysis.rootCause || execution.aiAnalysis.suggestedFix);

  return (
    <tr className={`border-b border-slate-900/60 hover:bg-slate-900/40 transition-colors ${
      isRunning ? 'animate-pulse' : ''
    }`}>
      <td className="p-3">
        <div className="font-mono text-xs text-slate-300 break-all">
          {execution.testKey}
        </div>
        {hasFailed && execution.errorMessage && (
          <div className="mt-1 text-xs text-wrap text-rose-400/80 truncate" title={execution.errorMessage}>
            {execution.errorMessage}
          </div>
        )}
      </td>
      <td className="p-3">
        {statusBadge(execution.status)}
      </td>

      {/* AI Analysis Column */}
      <td className="p-3 align-top">
        {hasFailed && hasAIAnalysis && execution.aiAnalysis?.rootCause ? (
          <div className="space-y-1">
            {/* Category Badge */}
            {execution.aiAnalysis.category && (
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(execution.aiAnalysis.category)}`}>
                  {getCategoryIcon(execution.aiAnalysis.category)} {formatCategory(execution.aiAnalysis.category)}
                </span>
                {execution.aiAnalysis.isFlaky && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/40">
                    ⚠️ Flaky
                  </span>
                )}
              </div>
            )}

            {/* Root Cause */}
            <div className={`text-xs text-slate-300 ${!showFullAnalysis && 'line-clamp-2'}`}>
              {execution.aiAnalysis.rootCause}
            </div>

            {execution.aiAnalysis.rootCause.length > 100 && (
              <button
                onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {showFullAnalysis ? '← Show less' : 'Read more →'}
              </button>
            )}

            {/* Confidence & Severity */}
            <div className="flex items-center gap-2 mt-1">
              {execution.aiAnalysis.confidence !== null && (
                <span className="text-xs text-slate-500">
                  {execution.aiAnalysis.confidence}% confident
                </span>
              )}
              {execution.aiAnalysis.severity && (
                <span className={`text-xs ${getSeverityColor(execution.aiAnalysis.severity)}`}>
                  {execution.aiAnalysis.severity}
                </span>
              )}
            </div>
          </div>
        ) : hasFailed ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            <span>Analyzing...</span>
          </div>
        ) : (
          <span className="text-xs text-slate-600">-</span>
        )}
      </td>

      {/* Suggested Fix Column */}
      <td className="p-3 align-top">
        {hasFailed && hasAIAnalysis && execution.aiAnalysis?.suggestedFix ? (
          <div className="space-y-1">
            <div className={`text-xs text-slate-300 whitespace-pre-wrap ${!showFullFix && 'line-clamp-3'}`}>
              {execution.aiAnalysis.suggestedFix}
            </div>

            {execution.aiAnalysis.suggestedFix.length > 150 && (
              <button
                onClick={() => setShowFullFix(!showFullFix)}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {showFullFix ? '← Show less' : 'Show full fix →'}
              </button>
            )}
          </div>
        ) : hasFailed && hasAIAnalysis ? (
          <span className="text-xs text-slate-500 italic">No specific fix suggested</span>
        ) : hasFailed ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            <span>Generating...</span>
          </div>
        ) : (
          <span className="text-xs text-slate-600">-</span>
        )}
      </td>

      <td className="p-3 text-right font-mono text-xs text-slate-400 align-top">
        {isRunning ? (
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </span>
        ) : execution.durationMs ? (
          `${execution.durationMs}ms`
        ) : (
          '-'
        )}
      </td>
    </tr>
  );
}

// Helper functions for AI analysis display
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'assertion_failure': 'bg-red-500/10 text-red-300 border border-red-500/40',
    'timeout': 'bg-orange-500/10 text-orange-300 border border-orange-500/40',
    'element_not_found': 'bg-purple-500/10 text-purple-300 border border-purple-500/40',
    'network_error': 'bg-blue-500/10 text-blue-300 border border-blue-500/40',
    'flaky_test': 'bg-amber-500/10 text-amber-300 border border-amber-500/40',
    'environment_issue': 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/40',
    'data_issue': 'bg-pink-500/10 text-pink-300 border border-pink-500/40',
  };
  return colors[category] || 'bg-slate-500/10 text-slate-300 border border-slate-500/40';
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'assertion_failure': '❌',
    'timeout': '⏱️',
    'element_not_found': '🔍',
    'network_error': '🌐',
    'flaky_test': '⚠️',
    'environment_issue': '🔧',
    'data_issue': '📊',
  };
  return icons[category] || '❓';
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    'critical': 'text-red-400 font-semibold',
    'high': 'text-orange-400',
    'medium': 'text-yellow-400',
    'low': 'text-green-400',
  };
  return colors[severity.toLowerCase()] || 'text-slate-400';
}

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  
  const variants = {
    running: 'bg-sky-500/10 text-sky-300 border-sky-500/40',
    passed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
    completed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
    failed: 'bg-rose-500/10 text-rose-300 border-rose-500/40',
    skipped: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
  };

  const className = variants[normalized as keyof typeof variants] || 'bg-slate-700/40 text-slate-200 border-slate-600';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${className}`}>
      {status}
    </span>
  );
}