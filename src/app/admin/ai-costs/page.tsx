'use client';

import { useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';

interface CostBreakdown {
  tool?: string;
  provider?: string;
  totalCost: number;
  callCount: number;
  inputTokens: number;
  outputTokens: number;
}

interface CostData {
  startDate: string;
  endDate: string;
  groupBy: string;
  data: CostBreakdown[];
}

export default function AICostsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [groupBy, setGroupBy] = useState<'tool' | 'provider' | 'total'>('tool');
  const [days, setDays] = useState(30);

  const fetchCosts = async (selectedGroupBy: typeof groupBy, selectedDays: number) => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, selectedDays);

      const params = new URLSearchParams({
        groupBy: selectedGroupBy,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      const response = await fetch(`/api/admin/ai-costs?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

      const data = await response.json();
      setCostData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts(groupBy, days);
  }, [groupBy, days]);

  const totalCost = costData?.data.reduce((sum, item) => sum + item.totalCost, 0) ?? 0;
  const totalCalls = costData?.data.reduce((sum, item) => sum + item.callCount, 0) ?? 0;
  const totalInputTokens = costData?.data.reduce((sum, item) => sum + item.inputTokens, 0) ?? 0;
  const totalOutputTokens = costData?.data.reduce((sum, item) => sum + item.outputTokens, 0) ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Cost Tracking</h1>
          <p className="text-gray-600 mt-2">Monitor usage and costs across tools and providers</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group by:</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="tool">Tool</option>
                <option value="provider">Provider</option>
                <option value="total">Total</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time period:</label>
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {costData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Total Cost</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">${totalCost.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Total Calls</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalCalls.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Input Tokens</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{(totalInputTokens / 1000).toFixed(1)}K</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Output Tokens</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{(totalOutputTokens / 1000).toFixed(1)}K</p>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">Error: {error}</p>
            </div>
          ) : costData && costData.data.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {groupBy === 'tool' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tool</th>}
                  {groupBy === 'provider' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Provider</th>}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Calls</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Input Tokens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Output Tokens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Cost (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {costData.data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {groupBy === 'tool' && (
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.tool}</td>
                    )}
                    {groupBy === 'provider' && (
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.provider}</td>
                    )}
                    <td className="px-6 py-4 text-sm text-gray-600">{row.callCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{(row.inputTokens / 1000).toFixed(1)}K</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{(row.outputTokens / 1000).toFixed(1)}K</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">${row.totalCost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-600">No data available for the selected period</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {costData && (
          <div className="mt-4 text-sm text-gray-600">
            <p>
              Showing data from <strong>{format(new Date(costData.startDate), 'MMM d, yyyy')}</strong> to{' '}
              <strong>{format(new Date(costData.endDate), 'MMM d, yyyy')}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
