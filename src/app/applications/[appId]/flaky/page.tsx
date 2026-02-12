'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { tokenStorage } from '@/lib/api';
import FlakyTestsTable from '@/components/FlakyTestsTable';
import FlakyTestModal from '@/components/FlakyTestModal';
import FlakinessTrendChart from '@/components/FlakinessTrendChart';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface FlakyTest {
  testCaseId: string;
  testName: string;
  filePath?: string;
  flakinessScore: number;
  confidenceLevel: number;
  classification: 'stable' | 'unstable' | 'flaky' | 'highly_flaky';
  pattern: string;
  rootCauses: any[];
  recommendations: string[];
  isQuarantined?: boolean;
  quarantinedAt?: string;
}

interface FlakinessOverview {
  totalTests: number;
  highlyFlakyTests: number;
  moderatelyFlakyTests: number;
  quarantinedTests: number;
  avgFlakinessScore: number;
  maxFlakinessScore: number;
}

export default function FlakyTestsPage() {
  const params = useParams();
  const appId = params.appId as string;

  const [tests, setTests] = useState<FlakyTest[]>([]);
  const [overview, setOverview] = useState<FlakinessOverview | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<FlakyTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFlakyTests();
    loadOverview();
    loadTrendData();
  }, [appId]);

  const loadFlakyTests = async () => {
    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(
        `${API_BASE}/api/flaky-tests/application/${appId}?days=30&minScore=20`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      if (!res.ok) {
        throw new Error('Failed to load flaky tests');
      }

      const data = await res.json();
      setTests(data.tests || []);
    } catch (err: any) {
      console.error('Error loading flaky tests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = async () => {
    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(
        `${API_BASE}/api/flaky-tests/application/${appId}/overview`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.error('Error loading overview:', err);
    }
  };

  const loadTrendData = async () => {
    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(
        `${API_BASE}/api/flaky-tests/application/${appId}/insights?period=daily`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const chartData = (data.insights || []).map((insight: any) => ({
          date: insight.period_start,
          avgFlakinessScore: parseFloat(insight.avg_flakiness_score || 0),
          totalFlakyTests: parseInt(insight.total_flaky_tests || 0),
          quarantinedTests: parseInt(insight.total_quarantined_tests || 0),
        })).reverse();
        setTrendData(chartData);
      }
    } catch (err) {
      console.error('Error loading trend data:', err);
    }
  };

  const handleQuarantine = async (testId: string, reason: string) => {
    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(
        `${API_BASE}/api/flaky-tests/test/${testId}/quarantine`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (res.ok) {
        // Reload data
        loadFlakyTests();
        loadOverview();
      }
    } catch (err) {
      console.error('Error quarantining test:', err);
    }
  };

  const handleRelease = async (testId: string, notes: string) => {
    try {
      const accessToken = tokenStorage.getAccessToken();
      const res = await fetch(
        `${API_BASE}/api/flaky-tests/test/${testId}/quarantine`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ notes }),
        }
      );

      if (res.ok) {
        // Reload data
        loadFlakyTests();
        loadOverview();
      }
    } catch (err) {
      console.error('Error releasing test:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading flaky test analysis...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <Link
            href={`/applications/${appId}/details`}
            className="text-blue-400 hover:underline text-sm mb-4 inline-block"
          >
            ← Back to Application Details
          </Link>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <div className="text-red-400 font-medium mb-2">Error</div>
            <div className="text-gray-300">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link
            href={`/applications/${appId}/details`}
            className="text-blue-400 hover:underline text-sm mb-4 inline-block"
          >
            ← Back to Application Details
          </Link>
          <h1 className="text-3xl font-bold">Flaky Test Analysis</h1>
          <p className="text-gray-400 mt-2">
            Automatically detected flaky tests and their root causes
          </p>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
              <div className="text-blue-400 text-sm mb-1 font-medium">Total Tests</div>
              <div className="text-4xl font-bold">{overview.totalTests}</div>
              <div className="text-xs text-gray-500 mt-1">In test suite</div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
              <div className="text-red-400 text-sm mb-1 font-medium">Highly Flaky</div>
              <div className="text-4xl font-bold text-red-400">
                {overview.highlyFlakyTests}
              </div>
              <div className="text-xs text-gray-500 mt-1">Score &gt; 80</div>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6">
              <div className="text-orange-400 text-sm mb-1 font-medium">Moderately Flaky</div>
              <div className="text-4xl font-bold text-orange-400">
                {overview.moderatelyFlakyTests}
              </div>
              <div className="text-xs text-gray-500 mt-1">Score 50-80</div>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
              <div className="text-purple-400 text-sm mb-1 font-medium">Quarantined</div>
              <div className="text-4xl font-bold text-purple-400">
                {overview.quarantinedTests}
              </div>
              <div className="text-xs text-gray-500 mt-1">Excluded from CI/CD</div>
            </div>
          </div>
        )}

        {/* Trend Chart */}
        <FlakinessTrendChart data={trendData} />

        {/* Flaky Tests Table */}
        <FlakyTestsTable
          tests={tests}
          onQuarantine={(testId) => {
            const test = tests.find((t) => t.testCaseId === testId);
            if (test) setSelectedTest(test);
          }}
          onRelease={(testId) => {
            const test = tests.find((t) => t.testCaseId === testId);
            if (test) setSelectedTest(test);
          }}
          onViewDetails={(test) => setSelectedTest(test)}
        />

        {/* Modal */}
        <FlakyTestModal
          test={selectedTest}
          onClose={() => setSelectedTest(null)}
          onQuarantine={handleQuarantine}
          onRelease={handleRelease}
        />
      </div>
    </div>
  );
}
