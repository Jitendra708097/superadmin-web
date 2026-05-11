/**
 * @module AnalyticsPage
 * @description Platform analytics - growth, usage, and retention charts.
 *              New orgs per week, employee growth, check-ins, cohort retention.
 */

import { useState } from 'react';
import { DatePicker, Select } from 'antd';
import { useGetGrowthMetricsQuery, useGetUsageMetricsQuery, useGetRetentionCohortsQuery } from '@store/api/analyticsApi.js';
import { formatNumber, formatPercent } from '@utils/formatters.js';
import { COLORS } from '@theme/colors.js';

import PageHeader from '@components/common/PageHeader.jsx';
import DarkLineChart from '@components/charts/DarkLineChart.jsx';
import DarkBarChart from '@components/charts/DarkBarChart.jsx';
import DarkPieChart from '@components/charts/DarkPieChart.jsx';
import EmptyState from '@components/common/EmptyState.jsx';

const { RangePicker } = DatePicker;

const GROUP_OPTIONS = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const PLAN_OPTIONS = [
  { label: 'All plans', value: '' },
  { label: 'Trial', value: 'trial' },
  { label: 'Standard', value: 'standard' },
];

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Trial', value: 'trial' },
  { label: 'Paid', value: 'paid' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function AnalyticsPage() {
  const [groupBy, setGroupBy] = useState('daily');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [dateRange, setDateRange] = useState(null);

  const commonParams = {
    groupBy,
    plan: plan || undefined,
    status: status || undefined,
  };
  const usageParams = {
    ...commonParams,
    days: 30,
    from: dateRange?.[0]?.format('YYYY-MM-DD'),
    to: dateRange?.[1]?.format('YYYY-MM-DD'),
  };

  const { data: growthData, isLoading: growthLoading } = useGetGrowthMetricsQuery({ ...commonParams, weeks: 12, months: 6 });
  const { data: usageData, isLoading: usageLoading } = useGetUsageMetricsQuery(usageParams);
  const { data: retentionData, isLoading: retentionLoading } = useGetRetentionCohortsQuery(commonParams);

  const growth = growthData?.data || {};
  const usage = usageData?.data || {};
  const retention = retentionData?.data || { cohorts: [] };
  const hasFaceSplit = Number(usage.enrolledEmployeeCount || 0) > 0
    && typeof usage.localFacePercent === 'number'
    && typeof usage.cloudFacePercent === 'number';

  const faceData = hasFaceSplit
    ? [
        { name: 'TensorFlow (Local)', value: usage.localFacePercent },
        { name: 'AWS Rekognition', value: usage.cloudFacePercent },
      ]
    : [];

  const summaryCards = [
    {
      label: 'New Orgs',
      value: formatNumber((growth.newOrgsWeekly || []).reduce((sum, item) => sum + Number(item.count || 0), 0)),
      tone: 'text-[#00d4ff]',
    },
    {
      label: '30d Check-ins',
      value: formatNumber((usage.checkinsDaily || []).reduce((sum, item) => sum + Number(item.count || 0), 0)),
      tone: 'text-[#00ff88]',
    },
    {
      label: 'Avg M1 Retention',
      value: retention.cohorts?.length
        ? formatPercent(
            retention.cohorts.reduce((sum, item) => sum + Number(item.m1 || 0), 0) / retention.cohorts.length
          )
        : '0%',
      tone: 'text-[#ffaa00]',
    },
    {
      label: 'Active Employees',
      value: formatNumber(usage.activeEmployeeCount || growth.summary?.activeEmployeeCount || 0),
      tone: 'text-[#a855f7]',
    },
    {
      label: 'Face Enrollment',
      value: `${usage.faceEnrollmentRate || 0}%`,
      tone: 'text-[#00d4ff]',
    },
    {
      label: 'Success Rate',
      value: `${usage.checkinSummary?.successRate || 0}%`,
      tone: 'text-[#00ff88]',
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Analytics" subtitle="Platform growth, usage, and retention metrics" />

      <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[160px_150px_160px_1fr] gap-3">
          <Select value={groupBy} onChange={setGroupBy} options={GROUP_OPTIONS} size="small" />
          <Select value={plan} onChange={setPlan} options={PLAN_OPTIONS} size="small" />
          <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} size="small" />
          <RangePicker value={dateRange} onChange={setDateRange} size="small" />
        </div>
        <p className="text-[#6b6b8a] text-[11px] mt-3">
          Filters apply to platform analytics where the current data model supports them. Usage is grouped by attendance rows and face split uses available attendance/employee face data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg px-5 py-4">
            <div className="text-[#6b6b8a] text-[10px] uppercase tracking-[0.15em] mb-2">{card.label}</div>
            <div className={`font-['JetBrains_Mono'] text-2xl font-semibold ${card.tone}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-2">
        <h3 className="text-[#6b6b8a] text-[10px] uppercase tracking-[0.15em] mb-3">Growth</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-5">
          <div className="mb-4">
            <h4 className="text-[#e8e8f0] text-sm font-sans font-medium">New Orgs per Week</h4>
            <p className="text-[#6b6b8a] text-xs">Last 12 weeks</p>
          </div>
          <DarkBarChart
            data={growth.newOrgsWeekly || []}
            xKey="week"
            bars={[{ key: 'count', color: COLORS.chart.cyan, label: 'New Orgs' }]}
            height={200}
            isLoading={growthLoading}
            tooltipFormatter={(v) => [v, 'New Orgs']}
          />
        </div>
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-5">
          <div className="mb-4">
            <h4 className="text-[#e8e8f0] text-sm font-sans font-medium">Employee Growth</h4>
            <p className="text-[#6b6b8a] text-xs">Total employees over 6 months</p>
          </div>
          <DarkLineChart
            data={growth.employeeGrowth || []}
            xKey="month"
            lines={[
              { key: 'total', color: COLORS.chart.green, label: 'Employees' },
              { key: 'active', color: COLORS.chart.cyan, label: 'Active' },
            ]}
            height={200}
            yFormatter={(v) => formatNumber(v)}
            tooltipFormatter={(v) => [formatNumber(v), 'Employees']}
          />
        </div>
      </div>

      <div className="mb-2">
        <h3 className="text-[#6b6b8a] text-[10px] uppercase tracking-[0.15em] mb-3">Usage</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-5">
          <div className="mb-4">
            <h4 className="text-[#e8e8f0] text-sm font-sans font-medium">Check-ins per Day</h4>
            <p className="text-[#6b6b8a] text-xs">Last 30 days</p>
          </div>
          <DarkBarChart
            data={usage.checkinsDaily || []}
            xKey="date"
            bars={[{ key: 'count', color: COLORS.chart.green, label: 'Check-ins' }]}
            height={200}
            isLoading={usageLoading}
            tooltipFormatter={(v) => [formatNumber(v), 'Check-ins']}
          />
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'Rows', value: usage.checkinSummary?.totalRows || 0, color: 'text-[#e8e8f0]' },
              { label: 'Success', value: usage.checkinSummary?.successfulCheckins || 0, color: 'text-[#00ff88]' },
              { label: 'Rate', value: `${usage.checkinSummary?.successRate || 0}%`, color: 'text-[#ffaa00]' },
            ].map((item) => (
              <div key={item.label} className="bg-[#161625] border border-[#1e1e35] rounded-md px-3 py-2">
                <div className="text-[#8a8aa8] text-[10px] uppercase tracking-wider">{item.label}</div>
                <div className={`font-['JetBrains_Mono'] text-sm font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-5">
          <div className="mb-4">
            <h4 className="text-[#e8e8f0] text-sm font-sans font-medium">Face Recognition Split</h4>
            <p className="text-[#6b6b8a] text-xs">Local vs cloud resolves</p>
          </div>
          {hasFaceSplit ? (
            <>
              <DarkPieChart
                data={faceData}
                colors={[COLORS.chart.cyan, COLORS.chart.amber]}
                height={200}
                tooltipFormatter={(v) => [`${v}%`, '']}
              />
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#6b6b8a]">TensorFlow (Local)</span>
                  <span className="font-['JetBrains_Mono'] text-[#00d4ff]">{usage.localFacePercent}%</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#6b6b8a]">AWS Rekognition</span>
                  <span className="font-['JetBrains_Mono'] text-[#ffaa00]">{usage.cloudFacePercent}%</span>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="No face split data yet"
              description="This appears after employees complete face enrollment."
            />
          )}
        </div>
      </div>

      <div className="mb-2">
        <h3 className="text-[#6b6b8a] text-[10px] uppercase tracking-[0.15em] mb-3">Retention</h3>
      </div>
      <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e1e35]">
          <h4 className="text-[#e8e8f0] text-sm font-sans font-medium">Monthly Cohort Retention</h4>
          <p className="text-[#6b6b8a] text-xs">% of orgs from signup month still active</p>
        </div>
        {retentionLoading ? (
          <div className="p-6 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-[#161625] rounded animate-pulse" />
            ))}
          </div>
        ) : retention.cohorts.length === 0 ? (
          <EmptyState title="No retention data yet" description="Data will appear after two or more months of platform activity." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-['JetBrains_Mono']">
              <thead>
                <tr className="border-b border-[#1e1e35]">
                  <th className="text-left px-5 py-3 text-[#6b6b8a] font-normal">Cohort</th>
                  <th className="text-right px-3 py-3 text-[#6b6b8a] font-normal">Size</th>
                  {['M1', 'M2', 'M3', 'M4', 'M5', 'M6'].map((m) => (
                    <th key={m} className="text-right px-3 py-3 text-[#6b6b8a] font-normal">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {retention.cohorts.map((cohort) => (
                  <tr key={cohort.month} className="border-b border-[#1e1e35] last:border-0 hover:bg-[#161625]">
                    <td className="px-5 py-2.5 text-[#e8e8f0]">{cohort.month}</td>
                    <td className="px-3 py-2.5 text-right text-[#6b6b8a]">{cohort.size}</td>
                    {['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map((mk) => {
                      const val = cohort[mk];
                      const getColor = (v) => {
                        if (v == null) return 'text-[#1e1e35]';
                        if (v >= 80) return 'text-[#00ff88]';
                        if (v >= 60) return 'text-[#ffaa00]';
                        return 'text-[#ff3366]';
                      };

                      return (
                        <td key={mk} className={`px-3 py-2.5 text-right ${getColor(val)}`}>
                          {val != null ? `${val}%` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
