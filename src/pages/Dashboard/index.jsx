/**
 * @module DashboardPage
 * @description Mission control overview. Platform-wide stats, MRR trend,
 *              org growth, health panel, alerts feed, recent signups.
 *              Auto-refreshes every 30 seconds via RTK Query pollingInterval.
 */

import { useGetDashboardStatsQuery } from '@store/api/analyticsApi.js';
import { useGetMRRTrendQuery, useGetOrgGrowthChartQuery, useGetAlertsQuery, useGetRecentSignupsQuery } from '@store/api/analyticsApi.js';
import { useGetPlatformHealthQuery } from '@store/api/healthApi.js';
import { POLL_DASHBOARD, POLL_HEALTH } from '@utils/constants.js';
import { formatDateTime } from '@utils/formatters.js';

import PlatformStats  from './PlatformStats.jsx';
import RevenueChart   from './RevenueChart.jsx';
import OrgGrowthChart from './OrgGrowthChart.jsx';
import HealthPanel    from './HealthPanel.jsx';
import AlertsFeed     from './AlertsFeed.jsx';
import RecentSignups  from './RecentSignups.jsx';

export default function DashboardPage() {
  const { data: statsData,  isLoading: statsLoading,  dataUpdatedAt } =
    useGetDashboardStatsQuery(undefined, { pollingInterval: POLL_DASHBOARD });

  const { data: mrrData,    isLoading: mrrLoading } =
    useGetMRRTrendQuery({ months: 6 }, { pollingInterval: POLL_DASHBOARD });

  const { data: growthData, isLoading: growthLoading } =
    useGetOrgGrowthChartQuery({ months: 6 }, { pollingInterval: POLL_DASHBOARD });

  const { data: healthData, isLoading: healthLoading } =
    useGetPlatformHealthQuery(undefined, { pollingInterval: POLL_HEALTH });

  const { data: alertsData, isLoading: alertsLoading } =
    useGetAlertsQuery(undefined, { pollingInterval: POLL_DASHBOARD });

  const { data: signupsData, isLoading: signupsLoading } =
    useGetRecentSignupsQuery({ limit: 5 }, { pollingInterval: POLL_DASHBOARD });

  const stats   = statsData?.data   || {};
  const mrr     = mrrData?.data     || [];
  const growth  = growthData?.data  || [];
  const health  = healthData?.data  || {};
  const alerts  = alertsData?.data  || [];
  const signups = signupsData?.data || [];

  return (
    <div className="animate-fade-in">
      {/* Page heading */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-['Geist'] font-semibold text-[#e8e8f0] tracking-tight">
            Platform Control
          </h1>
          <p className="text-[#6b6b8a] text-xs font-sans mt-0.5">
            Real-time overview · AttendEase SaaS Platform
          </p>
        </div>
        {dataUpdatedAt && (
          <span className="text-[10px] font-['JetBrains_Mono'] text-[#6b6b8a]">
            Updated {formatDateTime(dataUpdatedAt)}
          </span>
        )}
      </div>

      {/* Row 1 — 6 stat cards */}
      <PlatformStats stats={stats} isLoading={statsLoading} />

      {/* Row 2 — MRR chart + Org growth chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div className="lg:col-span-3">
          <RevenueChart data={mrr} isLoading={mrrLoading} />
        </div>
        <div className="lg:col-span-2">
          <OrgGrowthChart data={growth} isLoading={growthLoading} />
        </div>
      </div>

      {/* Row 3 — Health + Alerts + Signups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HealthPanel   health={health}   isLoading={healthLoading}  />
        <AlertsFeed    alerts={alerts}   isLoading={alertsLoading}  />
        <RecentSignups signups={signups} isLoading={signupsLoading} />
      </div>
    </div>
  );
}
