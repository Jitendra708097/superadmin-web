/**
 * @module RevenueChart
 * @description MRR trend line chart for the dashboard — last 6 months.
 *              Uses DarkLineChart with INR formatter.
 */

import DarkLineChart from '@components/charts/DarkLineChart.jsx';
import EmptyState from '@components/common/EmptyState.jsx';
import Skeleton from '@components/common/Skeleton.jsx';
import { formatMRR } from '@utils/formatters.js';
import { COLORS } from '@theme/colors.js';

export default function RevenueChart({ data = [], isLoading, isError }) {
  return (
    <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[#e8e8f0] text-sm font-sans font-medium">MRR Trend</h3>
          <p className="text-[#6b6b8a] text-xs">Last 6 months</p>
        </div>
        {!isLoading && data.length > 0 && (
          <span className="font-['JetBrains_Mono'] text-sm sm:text-base text-[#080810] font-extrabold bg-[#ffd166] border border-[#ffe199] px-2.5 py-1 rounded-md shadow-[0_0_14px_rgba(255,170,0,0.22)]">
            {formatMRR(data[data.length - 1]?.mrr || 0)}
          </span>
        )}
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} style={{ height: 220 }} />
      ) : isError ? (
        <EmptyState title="MRR unavailable" description="Revenue trend could not be loaded." />
      ) : data.length === 0 ? (
        <EmptyState title="No MRR data" description="No revenue points match the current filters." />
      ) : (
        <DarkLineChart
          data={data}
          xKey="month"
          lines={[{ key: 'mrr', color: COLORS.chart.amber, label: 'MRR' }]}
          height={220}
          yFormatter={(v) => formatMRR(v)}
          tooltipFormatter={(v) => [formatMRR(v), 'MRR']}
        />
      )}
    </div>
  );
}
