'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tokenStorage } from '@/lib/api';
import ScreenshotGallery from '@/components/ScreenshotGallery';
import ComparativeAnalysis from '@/components/ComparativeAnalysis';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

// Helper functions for AI analysis display
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    assertion_failure: 'bg-rose-500/10 text-rose-300 border border-rose-500/40',
    timeout: 'bg-amber-500/10 text-amber-300 border border-amber-500/40',
    element_not_found: 'bg-violet-500/10 text-violet-300 border border-violet-500/40',
    network_error: 'bg-sky-500/10 text-sky-300 border border-sky-500/40',
    flaky_test: 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/40',
    environment_issue: 'bg-teal-500/10 text-teal-300 border border-teal-500/40',
    data_issue: 'bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/40',
  };
  return colors[category] || 'bg-slate-500/10 text-slate-300 border border-slate-500/40';
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    assertion_failure: '⚠️',
    timeout: '⏱️',
    element_not_found: '🔍',
    network_error: '🌐',
    flaky_test: '🔄',
    environment_issue: '🔧',
    data_issue: '📊',
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
    critical: 'text-red-400 bg-red-500/10',
    high: 'text-orange-400 bg-orange-500/10',
    medium: 'text-yellow-400 bg-yellow-500/10',
    low: 'text-blue-400 bg-blue-500/10',
  };
  return colors[severity.toLowerCase()] || 'text-gray-400 bg-gray-500/10';
}

function getSeverityBorderColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'border-red-500/50',
    high: 'border-orange-500/50',
    medium: 'border-yellow-500/50',
    low: 'border-blue-500/50',
  };
  return colors[severity.toLowerCase()] || 'border-gray-500/50';
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'passed':
      return 'text-emerald-400 bg-emerald-900/30 border border-emerald-700';
    case 'failed':
      return 'text-rose-400 bg-rose-900/30 border border-rose-700';
    case 'skipped':
      return 'text-amber-400 bg-amber-900/30 border border-amber-700';
    default:
      return 'text-gray-400 bg-gray-900/30 border border-gray-700';
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Modal Component
function AIAnalysisModal({
  isOpen,
  onClose,
  execution,
  aiAnalysis
}: {
  isOpen: boolean;
  onClose: () => void;
  execution: TestExecution | null;
  aiAnalysis: TestExecution['aiAnalysis'];
}) {
  const [copiedFix, setCopiedFix] = useState(false);
  const [codeAnalysis, setCodeAnalysis] = useState<any>(null);
  const [analyzingCode, setAnalyzingCode] = useState(false);
  const [showCodeDiff, setShowCodeDiff] = useState(false);

  if (!isOpen || !execution) return null;

  const handleCopyFix = () => {
    if (aiAnalysis?.suggestedFix) {
      navigator.clipboard.writeText(aiAnalysis.suggestedFix);
      setCopiedFix(true);
      setTimeout(() => setCopiedFix(false), 2000);
    }
  };

  const handleAnalyzeCode = async () => {
    if (!execution.errorMessage) return;

    setAnalyzingCode(true);
    try {
      // Call the Python API directly to analyze code
      const response = await fetch('http://localhost:8000/api/ai-analysis/analyze-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_code: execution.testKey, // In real scenario, we'd fetch actual test code
          error_message: execution.errorMessage,
          root_cause: aiAnalysis?.rootCause || null,
          language: 'javascript',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCodeAnalysis(result);
        setShowCodeDiff(true);
      }
    } catch (error) {
      console.error('Failed to analyze code:', error);
    } finally {
      setAnalyzingCode(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800/80">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-semibold text-white truncate">{execution.testKey}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(execution.status)}`}>
                {execution.status.toUpperCase()}
              </span>
              <span className="text-xs text-gray-400">{formatDuration(execution.durationMs || 0)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
          {aiAnalysis ? (
            <div className="space-y-6">
              {/* Pattern Learning Badge (NEW) */}
              {aiAnalysis.fromCache !== undefined && (
                <div className="flex items-center justify-between pb-4 border-b border-gray-700/50">
                  {aiAnalysis.fromCache ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/40 rounded-lg">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-semibold text-emerald-300">Proven Pattern</span>
                      </div>
                      {aiAnalysis.timesProvenSuccessful !== undefined && (
                        <span className="text-xs text-gray-400">
                          Worked for <span className="text-emerald-400 font-semibold">{aiAnalysis.timesProvenSuccessful}</span> similar tests
                          {aiAnalysis.successRate && (
                            <span className="text-gray-500"> ({aiAnalysis.successRate.toFixed(0)}% success rate)</span>
                          )}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/40 rounded-lg">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-sm font-semibold text-blue-300">Fresh AI Analysis</span>
                      </div>
                      <span className="text-xs text-gray-400">New pattern - learning from this failure</span>
                    </div>
                  )}
                  {aiAnalysis.responseTimeMs !== undefined && (
                    <span className="text-xs text-gray-500">
                      {aiAnalysis.responseTimeMs < 200 ? '⚡ ' : ''}{aiAnalysis.responseTimeMs}ms
                    </span>
                  )}
                </div>
              )}

              {/* Metadata Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {aiAnalysis.category && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-sm font-medium ${getCategoryColor(aiAnalysis.category)}`}>
                    <span className="text-xs">{getCategoryIcon(aiAnalysis.category)}</span>
                    <span>{formatCategory(aiAnalysis.category)}</span>
                  </span>
                )}
                {aiAnalysis.severity && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-medium uppercase ${getSeverityColor(aiAnalysis.severity)} border ${getSeverityBorderColor(aiAnalysis.severity)}`}>
                    {aiAnalysis.severity}
                  </span>
                )}
                {aiAnalysis.estimatedFixTime && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium bg-blue-500/10 text-blue-300 border border-blue-500/30">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{aiAnalysis.estimatedFixTime}</span>
                  </span>
                )}
                {aiAnalysis.isFlaky && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-sm font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Flaky Test
                  </span>
                )}
              </div>

              {/* Confidence Meter (NEW) */}
              {aiAnalysis.confidence !== undefined && (
                <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-400">
                      {aiAnalysis.fromCache ? 'Pattern' : 'AI'} Confidence
                    </span>
                    <span className="text-sm font-semibold text-emerald-400">{aiAnalysis.confidence}%</span>
                  </div>
                  <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${
                        aiAnalysis.confidence >= 85 ? 'bg-emerald-500' :
                        aiAnalysis.confidence >= 70 ? 'bg-blue-500' :
                        aiAnalysis.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${aiAnalysis.confidence}%` }}
                    />
                  </div>
                  {aiAnalysis.patternMatchConfidence !== undefined && aiAnalysis.patternMatchConfidence !== aiAnalysis.confidence && (
                    <div className="mt-2 text-xs text-gray-500">
                      Pattern match: {aiAnalysis.patternMatchConfidence}%
                    </div>
                  )}
                </div>
              )}

              {/* Root Cause */}
              {aiAnalysis.rootCause && (
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Root Cause
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-300">{aiAnalysis.rootCause}</p>
                </div>
              )}

              {/* Suggested Fix */}
              {aiAnalysis.suggestedFix && (
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-b border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Suggested Fix
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAnalyzeCode}
                        disabled={analyzingCode}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-sm rounded border border-blue-500/30 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {analyzingCode ? (
                          <>
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            <span>Analyze Code</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCopyFix}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/70 text-gray-300 hover:text-white text-sm rounded transition-colors duration-150"
                      >
                        {copiedFix ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <pre className="text-sm leading-relaxed font-mono text-gray-200 whitespace-pre-wrap">{aiAnalysis.suggestedFix}</pre>
                  </div>
                </div>
              )}

              {/* Hybrid Mode: Show Both Suggestions */}
              {aiAnalysis.hybridMode && aiAnalysis.cachedSuggestion && aiAnalysis.freshAiSuggestion && (
                <div className="bg-gradient-to-r from-emerald-900/20 to-blue-900/20 border border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-800/70 border-b border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Hybrid Analysis
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        Compare proven pattern with fresh AI validation
                      </span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                    {/* Cached Pattern Suggestion */}
                    <div className="bg-emerald-900/10 border border-emerald-700/50 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-emerald-800/20 border-b border-emerald-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-semibold text-emerald-300">Proven Pattern</span>
                        </div>
                        {aiAnalysis.cachedSuggestion.successRate !== undefined && (
                          <span className="text-xs text-emerald-400 font-semibold">
                            {aiAnalysis.cachedSuggestion.successRate.toFixed(0)}% success
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        {aiAnalysis.cachedSuggestion.timesSuccessful !== undefined && (
                          <div className="text-xs text-gray-400 mb-2">
                            ✓ Worked for <span className="text-emerald-400 font-semibold">{aiAnalysis.cachedSuggestion.timesSuccessful}</span> similar tests
                          </div>
                        )}
                        <pre className="text-xs leading-relaxed font-mono text-gray-200 whitespace-pre-wrap bg-gray-900/50 rounded p-2 border border-gray-700/50">
                          {aiAnalysis.cachedSuggestion.fix}
                        </pre>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(aiAnalysis.cachedSuggestion.fix);
                            setCopiedFix(true);
                            setTimeout(() => setCopiedFix(false), 2000);
                          }}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs rounded border border-emerald-500/30 transition-colors duration-150"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Use Proven Fix</span>
                        </button>
                      </div>
                    </div>

                    {/* Fresh AI Suggestion */}
                    <div className="bg-blue-900/10 border border-blue-700/50 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-blue-800/20 border-b border-blue-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-xs font-semibold text-blue-300">Fresh AI Analysis</span>
                        </div>
                        {aiAnalysis.freshAiSuggestion.confidence !== undefined && (
                          <span className="text-xs text-blue-400 font-semibold">
                            {aiAnalysis.freshAiSuggestion.confidence}% confidence
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-xs text-gray-400 mb-2">
                          ⚡ Latest AI validation
                        </div>
                        <pre className="text-xs leading-relaxed font-mono text-gray-200 whitespace-pre-wrap bg-gray-900/50 rounded p-2 border border-gray-700/50">
                          {aiAnalysis.freshAiSuggestion.fix}
                        </pre>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(aiAnalysis.freshAiSuggestion.fix);
                            setCopiedFix(true);
                            setTimeout(() => setCopiedFix(false), 2000);
                          }}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs rounded border border-blue-500/30 transition-colors duration-150"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Use AI Fix</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Comparison Insight */}
                  <div className="px-4 pb-4">
                    <div className="bg-purple-900/10 border border-purple-700/50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-xs text-gray-300 leading-relaxed">
                          <span className="font-semibold text-purple-300">Recommendation:</span> The proven pattern has worked for similar failures before,
                          but the fresh AI analysis may provide additional context. Consider trying the proven fix first,
                          then use AI suggestion if needed.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Code Analysis with Diff */}
              {showCodeDiff && codeAnalysis && (
                <div className="bg-gray-900/50 border border-blue-700 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-blue-900/20 border-b border-blue-700">
                    <h3 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      Code Analysis & Fix
                      <span className="ml-auto text-xs font-normal text-blue-400">
                        {codeAnalysis.confidence}% Confidence
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">{codeAnalysis.explanation}</p>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Changes List */}
                    {codeAnalysis.changes && codeAnalysis.changes.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 mb-2">Changes Made:</h4>
                        <div className="space-y-2">
                          {codeAnalysis.changes.map((change: any, idx: number) => (
                            <div key={idx} className="bg-gray-800/50 border border-gray-700 rounded p-3">
                              <div className="text-xs text-gray-500 mb-1">Line {change.line_number}</div>
                              <div className="space-y-1">
                                <div className="flex items-start gap-2">
                                  <span className="text-red-400 text-xs">-</span>
                                  <code className="text-xs font-mono text-red-300 bg-red-900/20 px-2 py-0.5 rounded flex-1">
                                    {change.original_line}
                                  </code>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-green-400 text-xs">+</span>
                                  <code className="text-xs font-mono text-green-300 bg-green-900/20 px-2 py-0.5 rounded flex-1">
                                    {change.fixed_line}
                                  </code>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 mt-2 italic">{change.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fixed Code */}
                    {codeAnalysis.fixed_code && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 mb-2">Complete Fixed Code:</h4>
                        <div className="bg-gray-800/50 border border-gray-700 rounded overflow-hidden">
                          <pre className="text-xs leading-relaxed font-mono text-green-200 p-3 overflow-auto max-h-64">
                            {codeAnalysis.fixed_code}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Confidence */}
              {aiAnalysis.confidence !== null && (
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-300">AI Confidence</span>
                    <span className={`text-sm font-semibold ${
                      aiAnalysis.confidence >= 80 ? 'text-emerald-400' :
                      aiAnalysis.confidence >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {aiAnalysis.confidence}%
                    </span>
                  </div>
                  <div className="bg-gray-700/30 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        aiAnalysis.confidence >= 80 ? 'bg-emerald-500' :
                        aiAnalysis.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${aiAnalysis.confidence}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Related Issues */}
              {aiAnalysis.relatedIssues && aiAnalysis.relatedIssues.length > 0 && (
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Related Issues</h3>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysis.relatedIssues.map((issue, idx) => (
                      <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded text-sm font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {execution.errorMessage && (
                <div className="bg-gray-900/50 border border-red-900/30 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-red-400 mb-2">Error Message</h3>
                  <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap">{execution.errorMessage}</pre>
                </div>
              )}

              {/* Screenshots */}
              {execution.status.toLowerCase() === 'failed' && (
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Screenshots
                  </h3>
                  <ScreenshotGallery executionId={execution.id} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-3 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin"></div>
                <span className="text-sm">AI analysis in progress...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TestExecution {
  id: string;
  testKey: string;
  status: string;
  durationMs: number;
  errorMessage: string | null;
  errorStack: string | null;
  aiAnalysis?:
    | {
        rootCause: string | null;
        suggestedFix: string | null;
        category: string | null;
        severity: string | null;
        confidence: number | null;
        isFlaky: boolean;
        estimatedFixTime?: string | null;
        relatedIssues?: string[] | null;
      }
    | null;
}

interface RunDetails {
  id: string;
  applicationId: string;
  applicationName: string;
  runId: string;
  status: string;
  runnerType: string;
  jobNumber: number;
  jobPrefix: string;
  branch: string | null;
  commitSha: string | null;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
}

// --- JSON extraction helpers ----------------------------------------------

/**
 * Normalize any AI analysis-like object (snake_case or camelCase)
 * into the UI's expected camelCase shape.
 */
function normalizeAIAnalysis(source: any): TestExecution['aiAnalysis'] {
  if (!source) return null;

  const normalized = {
    rootCause: source.rootCause ?? source.root_cause ?? null,
    suggestedFix: source.suggestedFix ?? source.suggested_fix ?? null,
    category: source.category ?? null,
    severity: source.severity ?? null,
    confidence: source.confidence ?? null,
    isFlaky: source.isFlaky ?? source.is_flaky ?? false,
    estimatedFixTime: source.estimatedFixTime ?? source.estimated_fix_time ?? null,
    relatedIssues: source.relatedIssues ?? source.related_issues ?? null,
  };

  console.log('🔍 Normalized AI Analysis:', normalized);
  return normalized;
}

/**
 * Try to extract a JSON object with AI analysis fields from a free-form text
 * (error message, root cause string, etc).
 */
function extractAnalysisObjectFromText(text: string): any | null {
  if (!text) return null;

  try {
    // 1) Look for ```json { ... } ``` fenced block
    let jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      console.log('✅ Found JSON in markdown code block');
      const parsed = JSON.parse(jsonMatch[1]);
      return parsed;
    }

    // 2) Look for any object that clearly contains "category"
    jsonMatch = text.match(/\{(?:[^{}]|\{[^{}]*\})*"category"(?:[^{}]|\{[^{}]*\})*\}/s);
    if (jsonMatch) {
      console.log('✅ Found JSON with category field');
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }

    // 3) Last resort – any JSON object in the string
    const jsonObjects = text.match(/\{[^]*?\}/g);
    if (jsonObjects) {
      for (const obj of jsonObjects) {
        try {
          const parsed = JSON.parse(obj);
          if (parsed.category || parsed.root_cause || parsed.rootCause) {
            console.log('✅ Found JSON object with AI fields');
            return parsed;
          }
        } catch {
          continue;
        }
      }
    }
  } catch (e) {
    console.error('❌ Failed to extract AI analysis JSON from text:', e);
  }

  console.log('⚠️ No JSON found in text');
  return null;
}

// Enhanced helper to parse & normalize AI analysis from multiple sources
function parseAIAnalysis(execution: TestExecution): TestExecution['aiAnalysis'] {
  // 1) If no aiAnalysis at all, return null
  if (!execution.aiAnalysis) {
    return null;
  }

  // 2) Check if rootCause contains embedded JSON (common pattern)
  const rootCauseText = execution.aiAnalysis.rootCause;
  if (rootCauseText && typeof rootCauseText === 'string') {
    const parsedFromRootCause = extractAnalysisObjectFromText(rootCauseText);
    if (parsedFromRootCause) {
      // Successfully extracted JSON from rootCause field
      return normalizeAIAnalysis(parsedFromRootCause);
    }
  }

  // 3) Check if errorMessage contains embedded JSON
  if (execution.errorMessage) {
    const parsedFromError = extractAnalysisObjectFromText(execution.errorMessage);
    if (parsedFromError) {
      return normalizeAIAnalysis(parsedFromError);
    }
  }

  // 4) Fall back to direct normalization of aiAnalysis object
  const normalized = normalizeAIAnalysis(execution.aiAnalysis);

  // Only return if it has useful data
  if (
    normalized &&
    (normalized.rootCause || normalized.suggestedFix || normalized.category || normalized.severity)
  ) {
    return normalized;
  }

  return null;
}

// ---------------------------------------------------------------------------

export default function RunDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params?.runId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<RunDetails | null>(null);
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<TestExecution | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (runId) {
      loadRunDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const loadRunDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(`${API_BASE}/runs/${runId}/details`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch run details');
      }

      const json = await res.json();
      setRunDetails(json.run);
      setExecutions(json.executions);
    } catch (err: any) {
      console.error('Run details error:', err);
      setError(err.message || 'Failed to load run details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
            <div
              className="absolute inset-2 border-4 border-transparent border-t-violet-500 rounded-full animate-spin"
              style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
            ></div>
          </div>
          <p className="text-lg font-medium text-gray-300">Loading Run Details...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching test execution data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-rose-500/30 rounded-2xl p-8 max-w-md shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-rose-400 font-bold text-xl">Error Loading Run Details</h2>
          </div>
          <p className="text-rose-300/80 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={loadRunDetails}
              className="flex-1 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-rose-500/20"
            >
              Retry
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const failedTests = executions.filter(e => e.status.toLowerCase() === 'failed');
  const passedTests = executions.filter(e => e.status.toLowerCase() === 'passed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-[1800px]">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-400 hover:text-blue-300 mb-6 transition-all duration-200 group"
          >
            <svg
              className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Runs</span>
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent mb-4">
                Run Details
              </h1>
              {runDetails && (
                <div className="flex items-center gap-4 mt-4">
                  <span className="text-2xl font-mono font-bold text-blue-400">
                    {runDetails.jobPrefix && runDetails.jobNumber
                      ? `${runDetails.jobPrefix}-#${runDetails.jobNumber}`
                      : runDetails.runId}
                  </span>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(
                      runDetails.status,
                    )} shadow-lg`}
                  >
                    {runDetails.status.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-xl px-6 py-4 text-center">
                <div className="text-3xl font-bold text-emerald-400">{passedTests.length}</div>
                <div className="text-xs font-medium text-emerald-300/70 uppercase tracking-wide mt-1">
                  Passed
                </div>
              </div>
              <div className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/30 rounded-xl px-6 py-4 text-center">
                <div className="text-3xl font-bold text-rose-400">{failedTests.length}</div>
                <div className="text-xs font-medium text-rose-300/70 uppercase tracking-wide mt-1">
                  Failed
                </div>
              </div>
              {failedTests.length > 0 && (
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/30 rounded-xl px-6 py-4 text-center">
                  <div className="text-3xl font-bold text-blue-400">
                    {failedTests.filter(e => parseAIAnalysis(e)?.rootCause).length}
                  </div>
                  <div className="text-xs font-medium text-blue-300/70 uppercase tracking-wide mt-1">
                    AI Analyzed
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Run Information Card */}
        {runDetails && (
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-8 mb-8 border border-gray-700/50">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Run Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Application</p>
                <p className="text-lg font-bold text-gray-100">{runDetails.applicationName}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Framework</p>
                <p className="text-lg font-bold text-gray-100 uppercase">{runDetails.runnerType}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Branch</p>
                <p className="text-lg font-bold text-gray-100">{runDetails.branch || 'N/A'}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Commit SHA</p>
                <p className="text-lg font-mono font-bold text-gray-100">
                  {runDetails.commitSha?.substring(0, 8) || 'N/A'}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Started At</p>
                <p className="text-sm text-gray-100">
                  {runDetails.startedAt ? formatDate(runDetails.startedAt) : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Finished At</p>
                <p className="text-sm text-gray-100">
                  {runDetails.finishedAt ? formatDate(runDetails.finishedAt) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Comparative Analysis */}
        {runDetails && (
          <div className="mb-8">
            <ComparativeAnalysis
              currentRunId={runDetails.id}
              applicationId={runDetails.applicationId}
            />
          </div>
        )}

        {/* Test Executions */}
        <div className="bg-gray-800/40 rounded-lg shadow-xl overflow-hidden border border-gray-700">
          <div className="px-6 py-4 bg-gray-800/60 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              Test Executions
              <span className="ml-2 text-sm font-normal text-gray-400">({executions.length} total)</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/80">
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    Test Name
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wide w-28">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wide w-28">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wide w-80">
                    AI Summary
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wide w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {executions.map(execution => {
                  const aiAnalysis = parseAIAnalysis(execution);
                  const isFailed = execution.status.toLowerCase() === 'failed';

                  return (
                    <tr
                      key={execution.id}
                      className="hover:bg-gray-800/30 transition-colors duration-150 cursor-pointer"
                      onClick={() => {
                        setSelectedExecution(execution);
                        setIsModalOpen(true);
                      }}
                    >
                      {/* Test Name */}
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-gray-200">
                          {execution.testKey}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            execution.status,
                          )}`}
                        >
                          {execution.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-mono text-gray-300">
                          {formatDuration(execution.durationMs || 0)}
                        </span>
                      </td>

                      {/* AI Summary */}
                      <td className="px-4 py-4">
                        {isFailed && aiAnalysis?.category ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(
                                aiAnalysis.category,
                              )}`}
                            >
                              <span className="text-xs">{getCategoryIcon(aiAnalysis.category)}</span>
                              <span>{formatCategory(aiAnalysis.category)}</span>
                            </span>
                            {aiAnalysis.confidence !== null && (
                              <span
                                className={`text-xs font-semibold ${
                                  aiAnalysis.confidence >= 80
                                    ? 'text-emerald-400'
                                    : aiAnalysis.confidence >= 60
                                    ? 'text-yellow-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {aiAnalysis.confidence}%
                              </span>
                            )}
                          </div>
                        ) : isFailed ? (
                          <div className="flex items-center gap-2 text-gray-500">
                            <div className="w-3 h-3 border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin"></div>
                            <span className="text-xs">Analyzing...</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExecution(execution);
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-medium rounded border border-blue-500/30 transition-colors duration-150"
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

        {executions.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-700">
              <span className="text-4xl">📋</span>
            </div>
            <p className="text-xl font-medium text-gray-300">No test executions found</p>
            <p className="text-sm text-gray-500 mt-2">This run doesn&apos;t have any test data yet</p>
          </div>
        )}

        {/* AI Analysis Modal */}
        <AIAnalysisModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          execution={selectedExecution}
          aiAnalysis={selectedExecution ? parseAIAnalysis(selectedExecution) : null}
        />
      </div>
    </div>
  );
}
