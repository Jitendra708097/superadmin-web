/**
 * @module OrgGrowthChart
 * @description New org signups bar chart — last 6 months.
 */

import DarkBarChart from '@components/charts/DarkBarChart.jsx';
import EmptyState from '@components/common/EmptyState.jsx';
import { COLORS } from '@theme/colors.js';

export default function OrgGrowthChart({ data = [], isLoading, isError }) {
  return (
    <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-5 h-full">
      <div className="mb-4">
        <h3 className="text-[#e8e8f0] text-sm font-sans font-medium">Org Growth</h3>
        <p className="text-[#6b6b8a] text-xs">New signups per month</p>
      </div>

      {isLoading ? (
        <div className="h-[220px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <EmptyState title="Growth unavailable" description="Organisation growth could not be loaded." />
      ) : data.length === 0 ? (
        <EmptyState title="No growth data" description="No signups match the current filters." />
      ) : (
        <DarkBarChart
          data={data}
          xKey="month"
          bars={[{ key: 'newOrgs', color: COLORS.chart.purple, label: 'New Orgs' }]}
          height={220}
          tooltipFormatter={(v) => [v, 'New Orgs']}
        />
      )}
    </div>
  );
}
