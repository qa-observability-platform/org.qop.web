'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';

interface TrendDataPoint {
  date: string;
  avgFlakinessScore: number;
  totalFlakyTests: number;
  quarantinedTests: number;
}

interface FlakinessTrendChartProps {
  data: TrendDataPoint[];
}

export default function FlakinessTrendChart({ data }: FlakinessTrendChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">
            {new Date(label).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-semibold">{entry.value}</span>
              {entry.dataKey === 'avgFlakinessScore' && (
                <span className="text-gray-400 text-xs ml-1">/100</span>
              )}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Determine trend direction
  const getTrend = () => {
    if (data.length < 2) return { direction: 'stable', percentage: 0 };

    const recent = data.slice(-7); // Last 7 data points
    const firstAvg = recent[0].avgFlakinessScore;
    const lastAvg = recent[recent.length - 1].avgFlakinessScore;

    const change = ((lastAvg - firstAvg) / firstAvg) * 100;

    if (Math.abs(change) < 5) {
      return { direction: 'stable', percentage: change };
    } else if (change < 0) {
      return { direction: 'improving', percentage: Math.abs(change) };
    } else {
      return { direction: 'worsening', percentage: change };
    }
  };

  const trend = getTrend();

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Flakiness Trend</h3>
          <p className="text-sm text-gray-400 mt-1">
            Last {data.length} days
          </p>
        </div>

        {/* Trend Indicator */}
        <div
          className={`px-4 py-2 rounded-lg border ${
            trend.direction === 'improving'
              ? 'bg-green-500/10 border-green-500/30'
              : trend.direction === 'worsening'
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-gray-500/10 border-gray-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {trend.direction === 'improving' && (
              <span className="text-green-400 text-xl">↓</span>
            )}
            {trend.direction === 'worsening' && (
              <span className="text-red-400 text-xl">↑</span>
            )}
            {trend.direction === 'stable' && (
              <span className="text-gray-400 text-xl">→</span>
            )}
            <div>
              <div
                className={`text-sm font-semibold ${
                  trend.direction === 'improving'
                    ? 'text-green-400'
                    : trend.direction === 'worsening'
                    ? 'text-red-400'
                    : 'text-gray-400'
                }`}
              >
                {trend.direction === 'improving' && 'Improving'}
                {trend.direction === 'worsening' && 'Worsening'}
                {trend.direction === 'stable' && 'Stable'}
              </div>
              {trend.percentage > 0 && (
                <div className="text-xs text-gray-500">
                  {trend.percentage.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-80 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-3">📊</div>
            <p>No trend data available yet</p>
            <p className="text-sm mt-1">Run more tests to see the trend</p>
          </div>
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }
              />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="avgFlakinessScore"
                stroke="#f97316"
                strokeWidth={3}
                name="Avg Flakiness Score"
                dot={{ fill: '#f97316', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="totalFlakyTests"
                stroke="#fbbf24"
                strokeWidth={2}
                name="Total Flaky Tests"
                dot={{ fill: '#fbbf24', r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="quarantinedTests"
                stroke="#a855f7"
                strokeWidth={2}
                name="Quarantined Tests"
                dot={{ fill: '#a855f7', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary Stats */}
      {data.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-gray-750 border border-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Current Avg Score</div>
            <div className="text-2xl font-bold text-orange-400">
              {data[data.length - 1].avgFlakinessScore.toFixed(1)}
            </div>
          </div>
          <div className="bg-gray-750 border border-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Flaky Tests</div>
            <div className="text-2xl font-bold text-yellow-400">
              {data[data.length - 1].totalFlakyTests}
            </div>
          </div>
          <div className="bg-gray-750 border border-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Quarantined</div>
            <div className="text-2xl font-bold text-purple-400">
              {data[data.length - 1].quarantinedTests}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
