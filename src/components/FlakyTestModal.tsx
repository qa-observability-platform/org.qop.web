'use client';

import { useState } from 'react';

interface RootCause {
  type: 'race_condition' | 'network' | 'resource_leak' | 'environment' | 'timing' | 'unknown';
  confidence: number;
  evidence: string;
}

interface FlakyTest {
  testCaseId: string;
  testName: string;
  filePath?: string;
  flakinessScore: number;
  confidenceLevel: number;
  classification: 'stable' | 'unstable' | 'flaky' | 'highly_flaky';
  pattern: string;
  rootCauses: RootCause[];
  recommendations: string[];
  isQuarantined?: boolean;
  quarantinedAt?: string;
}

interface FlakyTestModalProps {
  test: FlakyTest | null;
  onClose: () => void;
  onQuarantine?: (testId: string, reason: string) => void;
  onRelease?: (testId: string, notes: string) => void;
}

export default function FlakyTestModal({
  test,
  onClose,
  onQuarantine,
  onRelease,
}: FlakyTestModalProps) {
  const [quarantineReason, setQuarantineReason] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [showQuarantineForm, setShowQuarantineForm] = useState(false);
  const [showReleaseForm, setShowReleaseForm] = useState(false);

  if (!test) return null;

  const handleQuarantine = () => {
    if (quarantineReason.trim()) {
      onQuarantine?.(test.testCaseId, quarantineReason);
      setShowQuarantineForm(false);
      setQuarantineReason('');
      onClose();
    }
  };

  const handleRelease = () => {
    onRelease?.(test.testCaseId, releaseNotes);
    setShowReleaseForm(false);
    setReleaseNotes('');
    onClose();
  };

  const getRootCauseIcon = (type: RootCause['type']) => {
    switch (type) {
      case 'race_condition':
        return '⏱️';
      case 'network':
        return '🌐';
      case 'resource_leak':
        return '🧹';
      case 'environment':
        return '🖥️';
      case 'timing':
        return '⏲️';
      default:
        return '❓';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (score >= 50) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    if (score >= 20) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    return 'text-green-400 bg-green-500/10 border-green-500/30';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{test.testName}</h2>
            {test.filePath && (
              <p className="text-sm text-gray-400 font-mono">{test.filePath}</p>
            )}
            {test.isQuarantined && (
              <div className="mt-3 px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded inline-block">
                <span className="text-purple-400 text-sm font-semibold">
                  🚨 QUARANTINED
                  {test.quarantinedAt && (
                    <span className="text-purple-300 ml-2">
                      since {new Date(test.quarantinedAt).toLocaleDateString()}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Flakiness Score */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`border rounded-lg p-4 ${getScoreColor(test.flakinessScore)}`}>
              <div className="text-sm font-medium mb-2">Flakiness Score</div>
              <div className="text-4xl font-bold">{test.flakinessScore.toFixed(1)}</div>
              <div className="mt-3 w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    test.flakinessScore >= 80
                      ? 'bg-red-500'
                      : test.flakinessScore >= 50
                      ? 'bg-orange-500'
                      : test.flakinessScore >= 20
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${test.flakinessScore}%` }}
                />
              </div>
            </div>

            <div className="border border-gray-700 rounded-lg p-4 bg-gray-750">
              <div className="text-sm font-medium text-gray-400 mb-2">Confidence</div>
              <div className="text-4xl font-bold text-blue-400">
                {test.confidenceLevel.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Based on {test.pattern.length} runs
              </div>
            </div>

            <div className="border border-gray-700 rounded-lg p-4 bg-gray-750">
              <div className="text-sm font-medium text-gray-400 mb-2">Classification</div>
              <div className="text-lg font-bold text-white capitalize">
                {test.classification.replace('_', ' ')}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {test.classification === 'highly_flaky' && 'Immediate attention required'}
                {test.classification === 'flaky' && 'Should be fixed soon'}
                {test.classification === 'unstable' && 'Monitor closely'}
                {test.classification === 'stable' && 'No action needed'}
              </div>
            </div>
          </div>

          {/* Pattern Visualization */}
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-750">
            <h3 className="text-lg font-bold text-white mb-3">Execution Pattern</h3>
            <div className="flex items-center gap-1 flex-wrap">
              {test.pattern.split('').map((char, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 flex items-center justify-center rounded font-mono text-sm font-bold ${
                    char === 'P'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : char === 'F'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}
                  title={
                    char === 'P'
                      ? 'Passed'
                      : char === 'F'
                      ? 'Failed'
                      : 'Skipped'
                  }
                >
                  {char}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
              <div>
                <span className="text-green-400">P</span> = Pass
              </div>
              <div>
                <span className="text-red-400">F</span> = Fail
              </div>
              <div>
                <span className="text-yellow-400">S</span> = Skip
              </div>
              <div className="ml-auto">
                Most recent on the left
              </div>
            </div>
          </div>

          {/* Root Causes */}
          {test.rootCauses.length > 0 && (
            <div className="border border-gray-700 rounded-lg p-4 bg-gray-750">
              <h3 className="text-lg font-bold text-white mb-3">Detected Root Causes</h3>
              <div className="space-y-3">
                {test.rootCauses.map((cause, i) => (
                  <div
                    key={i}
                    className="border border-gray-600 rounded-lg p-3 bg-gray-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getRootCauseIcon(cause.type)}</span>
                        <span className="text-white font-semibold capitalize">
                          {cause.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              cause.confidence >= 80
                                ? 'bg-red-500'
                                : cause.confidence >= 60
                                ? 'bg-orange-500'
                                : 'bg-yellow-500'
                            }`}
                            style={{ width: `${cause.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400 w-12 text-right">
                          {cause.confidence.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">{cause.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {test.recommendations.length > 0 && (
            <div className="border border-blue-500/30 rounded-lg p-4 bg-blue-500/10">
              <h3 className="text-lg font-bold text-blue-400 mb-3">
                💡 Recommendations
              </h3>
              <ul className="space-y-2">
                {test.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-blue-400 mt-1">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-700 bg-gray-750">
          {!showQuarantineForm && !showReleaseForm && (
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
              >
                Close
              </button>
              <div className="flex gap-3">
                {test.isQuarantined ? (
                  <button
                    onClick={() => setShowReleaseForm(true)}
                    className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition font-semibold"
                  >
                    Release from Quarantine
                  </button>
                ) : (
                  <button
                    onClick={() => setShowQuarantineForm(true)}
                    className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition font-semibold"
                  >
                    Quarantine Test
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quarantine Form */}
          {showQuarantineForm && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Quarantine Reason
              </label>
              <textarea
                value={quarantineReason}
                onChange={(e) => setQuarantineReason(e.target.value)}
                placeholder="Explain why this test should be quarantined..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white resize-none"
                rows={3}
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowQuarantineForm(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuarantine}
                  disabled={!quarantineReason.trim()}
                  className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Quarantine
                </button>
              </div>
            </div>
          )}

          {/* Release Form */}
          {showReleaseForm && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Release Notes (Optional)
              </label>
              <textarea
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                placeholder="Describe what was fixed (optional)..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white resize-none"
                rows={3}
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowReleaseForm(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRelease}
                  className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition font-semibold"
                >
                  Confirm Release
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
