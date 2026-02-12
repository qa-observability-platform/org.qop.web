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

interface FlakyTestsTableProps {
  tests: FlakyTest[];
  onQuarantine?: (testId: string) => void;
  onRelease?: (testId: string) => void;
  onViewDetails?: (test: FlakyTest) => void;
}

export default function FlakyTestsTable({
  tests,
  onQuarantine,
  onRelease,
  onViewDetails,
}: FlakyTestsTableProps) {
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score');
  const [filterBy, setFilterBy] = useState<'all' | 'highly_flaky' | 'flaky' | 'quarantined'>('all');

  // Sort and filter tests
  const filteredTests = tests
    .filter((test) => {
      if (filterBy === 'all') return true;
      if (filterBy === 'quarantined') return test.isQuarantined;
      return test.classification === filterBy;
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        return b.flakinessScore - a.flakinessScore;
      }
      return a.testName.localeCompare(b.testName);
    });

  const getClassificationColor = (classification: FlakyTest['classification']) => {
    switch (classification) {
      case 'highly_flaky':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'flaky':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'unstable':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-green-500/10 text-green-400 border-green-500/30';
    }
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
    if (score >= 80) return 'text-red-400';
    if (score >= 50) return 'text-orange-400';
    if (score >= 20) return 'text-yellow-400';
    return 'text-green-400';
  };

  if (tests.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-white mb-2">No Flaky Tests Detected!</h3>
        <p className="text-gray-400">All your tests are running stably.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg">
      {/* Header with filters */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-white">Flaky Tests ({filteredTests.length})</h3>

          {/* Filter buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterBy('all')}
              className={`px-3 py-1 rounded text-sm ${
                filterBy === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterBy('highly_flaky')}
              className={`px-3 py-1 rounded text-sm ${
                filterBy === 'highly_flaky'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Highly Flaky
            </button>
            <button
              onClick={() => setFilterBy('flaky')}
              className={`px-3 py-1 rounded text-sm ${
                filterBy === 'flaky'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Flaky
            </button>
            <button
              onClick={() => setFilterBy('quarantined')}
              className={`px-3 py-1 rounded text-sm ${
                filterBy === 'quarantined'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Quarantined
            </button>
          </div>
        </div>

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'score' | 'name')}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        >
          <option value="score">Sort by Score</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-750 border-b border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                Test Name
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">
                Score
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">
                Pattern
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                Root Cause
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredTests.map((test) => (
              <tr
                key={test.testCaseId}
                className="hover:bg-gray-750 transition-colors cursor-pointer"
                onClick={() => onViewDetails?.(test)}
              >
                {/* Test Name */}
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="text-white font-medium">{test.testName}</span>
                    {test.filePath && (
                      <span className="text-xs text-gray-500 font-mono mt-1">
                        {test.filePath}
                      </span>
                    )}
                  </div>
                </td>

                {/* Flakiness Score */}
                <td className="px-4 py-4 text-center">
                  <div className="flex flex-col items-center">
                    <span className={`text-2xl font-bold ${getScoreColor(test.flakinessScore)}`}>
                      {test.flakinessScore.toFixed(1)}
                    </span>
                    <div className="w-20 h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
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
                    <span className="text-xs text-gray-500 mt-1">
                      {test.confidenceLevel.toFixed(0)}% confidence
                    </span>
                  </div>
                </td>

                {/* Pattern */}
                <td className="px-4 py-4 text-center">
                  <div className="font-mono text-sm">
                    {test.pattern.slice(0, 10).split('').map((char, i) => (
                      <span
                        key={i}
                        className={`${
                          char === 'P'
                            ? 'text-green-400'
                            : char === 'F'
                            ? 'text-red-400'
                            : 'text-yellow-400'
                        }`}
                      >
                        {char}
                      </span>
                    ))}
                    {test.pattern.length > 10 && (
                      <span className="text-gray-500">...</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {test.pattern.length} runs
                  </div>
                </td>

                {/* Root Cause */}
                <td className="px-4 py-4">
                  {test.rootCauses.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {test.rootCauses.slice(0, 2).map((cause, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span>{getRootCauseIcon(cause.type)}</span>
                          <span className="text-gray-300">
                            {cause.type.replace('_', ' ')}
                          </span>
                          <span className="text-gray-500 text-xs">
                            ({cause.confidence.toFixed(0)}%)
                          </span>
                        </div>
                      ))}
                      {test.rootCauses.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{test.rootCauses.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">Unknown</span>
                  )}
                </td>

                {/* Status Badge */}
                <td className="px-4 py-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getClassificationColor(
                        test.classification
                      )}`}
                    >
                      {test.classification.replace('_', ' ').toUpperCase()}
                    </span>
                    {test.isQuarantined && (
                      <span className="px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded text-xs font-semibold">
                        🚨 QUARANTINED
                      </span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails?.(test);
                      }}
                      className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded text-xs hover:bg-blue-500/20 transition"
                    >
                      Details
                    </button>
                    {test.isQuarantined ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRelease?.(test.testCaseId);
                        }}
                        className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded text-xs hover:bg-green-500/20 transition"
                      >
                        Release
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuarantine?.(test.testCaseId);
                        }}
                        className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-xs hover:bg-red-500/20 transition"
                      >
                        Quarantine
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-700 bg-gray-750">
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="font-mono text-green-400">P</span> = Pass
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-red-400">F</span> = Fail
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-yellow-400">S</span> = Skip
          </div>
          <div className="ml-auto">
            <span>Score: </span>
            <span className="text-green-400">0-20 Stable</span>
            <span className="mx-2">|</span>
            <span className="text-yellow-400">20-50 Unstable</span>
            <span className="mx-2">|</span>
            <span className="text-orange-400">50-80 Flaky</span>
            <span className="mx-2">|</span>
            <span className="text-red-400">80+ Highly Flaky</span>
          </div>
        </div>
      </div>
    </div>
  );
}
