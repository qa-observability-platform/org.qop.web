'use client';

import { useState } from 'react';

type AIInsight = {
  type: 'critical' | 'warning' | 'success' | 'info';
  message: string;
  action?: string;
  estimatedTime?: string;
};

type AIExecutiveSummaryProps = {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  aiAnalysisComplete: number;
  executionTime: number;
  insights: AIInsight[];
  healthScore: number;
  businessImpact: {
    cost: number;
    autoFixed: number;
    prevented: number;
  };
};

export function AIExecutiveSummary({
  totalTests,
  passedTests,
  failedTests,
  aiAnalysisComplete,
  executionTime,
  insights,
  healthScore,
  businessImpact,
}: AIExecutiveSummaryProps) {
  const [expanded, setExpanded] = useState(true);

  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  const analysisProgress = totalTests > 0 ? Math.round((aiAnalysisComplete / failedTests) * 100) : 0;

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40';
    if (score >= 70) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/40';
    if (score >= 50) return 'text-orange-400 bg-orange-500/10 border-orange-500/40';
    return 'text-red-400 bg-red-500/10 border-red-500/40';
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      default: return '💡';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-l-4 border-red-500 bg-red-500/5';
      case 'warning': return 'border-l-4 border-yellow-500 bg-yellow-500/5';
      case 'success': return 'border-l-4 border-emerald-500 bg-emerald-500/5';
      default: return 'border-l-4 border-blue-500 bg-blue-500/5';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden mb-6">
      {/* Header */}
      <div
        className="px-6 py-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-b border-slate-700 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="text-xl font-semibold text-slate-100">AI Executive Summary</h2>
              <p className="text-sm text-slate-400 mt-1">
                {failedTests} failures analyzed • {aiAnalysisComplete}/{failedTests} complete ({analysisProgress}%)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg border ${getHealthColor(healthScore)}`}>
              <div className="text-xs text-slate-400">Health Score</div>
              <div className="text-2xl font-bold">{healthScore}/100</div>
            </div>
            <button className="text-slate-400 hover:text-slate-200 transition-colors">
              {expanded ? '▼' : '▶'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-6 space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-4 gap-4">
            {/* Business Impact */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💰</span>
                <div className="text-xs text-slate-400">Business Impact</div>
              </div>
              <div className="text-2xl font-bold text-rose-400">${businessImpact.cost.toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-1">
                {failedTests} failures × avg debugging cost
              </div>
            </div>

            {/* Auto-Fixed */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🔧</span>
                <div className="text-xs text-slate-400">Auto-Fixed</div>
              </div>
              <div className="text-2xl font-bold text-emerald-400">{businessImpact.autoFixed}</div>
              <div className="text-xs text-slate-500 mt-1">
                Resolved automatically by AI
              </div>
            </div>

            {/* Prevented */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🛡️</span>
                <div className="text-xs text-slate-400">Incidents Prevented</div>
              </div>
              <div className="text-2xl font-bold text-blue-400">{businessImpact.prevented}</div>
              <div className="text-xs text-slate-500 mt-1">
                Predicted failures caught early
              </div>
            </div>

            {/* Pass Rate */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📊</span>
                <div className="text-xs text-slate-400">Pass Rate</div>
              </div>
              <div className={`text-2xl font-bold ${passRate >= 90 ? 'text-emerald-400' : passRate >= 70 ? 'text-yellow-400' : 'text-rose-400'}`}>
                {passRate}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {passedTests}/{totalTests} tests passed
              </div>
            </div>
          </div>

          {/* AI Insights */}
          {insights.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span>🎯</span>
                Top AI Recommendations
              </h3>
              <div className="space-y-2">
                {insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`${getInsightColor(insight.type)} rounded-lg p-4`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-xl">{getInsightIcon(insight.type)}</span>
                        <div className="flex-1">
                          <p className="text-sm text-slate-200">{insight.message}</p>
                          {insight.estimatedTime && (
                            <p className="text-xs text-slate-400 mt-1">
                              ⏱️ Est. fix time: {insight.estimatedTime}
                            </p>
                          )}
                        </div>
                      </div>
                      {insight.action && (
                        <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-md transition-colors whitespace-nowrap ml-4">
                          {insight.action}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-700">
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md transition-colors flex items-center gap-2">
              <span>📄</span>
              View Full AI Report
            </button>
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-md transition-colors flex items-center gap-2">
              <span>🔧</span>
              Apply Auto-Fixes
            </button>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors flex items-center gap-2">
              <span>📈</span>
              Trend Analysis
            </button>
            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-md transition-colors flex items-center gap-2">
              <span>📧</span>
              Email Summary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
