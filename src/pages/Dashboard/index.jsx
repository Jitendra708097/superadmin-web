/**
 * @module DashboardPage
 * @description Mission control overview. Platform-wide stats, MRR trend,
 *              org growth, health panel, alerts feed, recent signups.
 *              Auto-refreshes every 30 seconds via RTK Query pollingInterval.
 */

import { useGetDashboardStatsQuery } from '@store/api/analyticsApi.js';
import { useGetMRRTrendQuery, useGetOrgGrowthChartQuery, useGetAlertsQuery, useGetRecentSignupsQuery } from '@store/api/analyticsApi.js';
import { useGetPlatformHealthQuery } from '@store/api/healthApi.js';
import { ORG_STATUS, PLAN_TIERS, POLL_DASHBOARD, POLL_HEALTH } from '@utils/constants.js';
import { formatDateTime } from '@utils/formatters.js';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Select } from 'antd';

import PlatformStats  from './PlatformStats.jsx';
import RevenueChart   from './RevenueChart.jsx';
import OrgGrowthChart from './OrgGrowthChart.jsx';
import HealthPanel    from './HealthPanel.jsx';
import AlertsFeed     from './AlertsFeed.jsx';
import RecentSignups  from './RecentSignups.jsx';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [orgId, setOrgId] = useState('');
  const dashboardParams = useMemo(() => ({
    plan: plan || undefined,
    status: status || undefined,
    orgId: orgId.trim() || undefined,
  }), [plan, status, orgId]);

  const { data: statsData,  isLoading: statsLoading,  isError: statsError, dataUpdatedAt } =
    useGetDashboardStatsQuery(dashboardParams, { pollingInterval: POLL_DASHBOARD });

  const { data: mrrData,    isLoading: mrrLoading, isError: mrrError } =
    useGetMRRTrendQuery({ months: 6, ...dashboardParams }, { pollingInterval: POLL_DASHBOARD });

  const { data: growthData, isLoading: growthLoading, isError: growthError } =
    useGetOrgGrowthChartQuery({ months: 6, ...dashboardParams }, { pollingInterval: POLL_DASHBOARD });

  const { data: healthData, isLoading: healthLoading, isError: healthError } =
    useGetPlatformHealthQuery(undefined, { pollingInterval: POLL_HEALTH });

  const { data: alertsData, isLoading: alertsLoading, isError: alertsError } =
    useGetAlertsQuery(dashboardParams, { pollingInterval: POLL_DASHBOARD });

  const { data: signupsData, isLoading: signupsLoading, isError: signupsError } =
    useGetRecentSignupsQuery({ limit: 5, ...dashboardParams }, { pollingInterval: POLL_DASHBOARD });

  const stats   = statsData?.data   || {};
  const mrr     = mrrData?.data     || [];
  const growth  = growthData?.data  || [];
  const health  = healthData?.data  || {};
  const alerts  = alertsData?.data  || [];
  const signups = signupsData?.data || [];

  const handleDrillDown = (target) => {
    const query = new URLSearchParams();
    if (plan) query.set('plan', plan);
    if (status) query.set('status', status);
    if (target === 'active') query.set('status', ORG_STATUS.ACTIVE);
    if (target === 'revenue') {
      navigate('/revenue');
      return;
    }
    if (target === 'checkedIn') {
      navigate('/analytics');
      return;
    }
    navigate(`/organisations${query.toString() ? `?${query}` : ''}`);
  };

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

      <div className="flex flex-wrap items-center gap-3 mb-5 bg-[#0f0f1a] border border-[#1e1e35] rounded-lg px-4 py-3">
        <span className="text-[#6b6b8a] text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider">
          Dashboard Filters
        </span>
        <Select
          value={plan}
          onChange={setPlan}
          size="small"
          style={{ width: 140 }}
          options={[
            { value: '', label: 'All Plans' },
            { value: PLAN_TIERS.TRIAL, label: 'Free Trial' },
            { value: PLAN_TIERS.STANDARD, label: 'Standard' },
          ]}
        />
        <Select
          value={status}
          onChange={setStatus}
          size="small"
          style={{ width: 150 }}
          options={[
            { value: '', label: 'All Statuses' },
            { value: ORG_STATUS.ACTIVE, label: 'Active' },
            { value: ORG_STATUS.TRIAL, label: 'Trial' },
            { value: ORG_STATUS.SUSPENDED, label: 'Suspended' },
            { value: ORG_STATUS.CANCELLED, label: 'Cancelled' },
          ]}
        />
        <input
          value={orgId}
          onChange={(event) => setOrgId(event.target.value)}
          placeholder="Org ID filter"
          className="px-3 py-1.5 bg-[#161625] border border-[#1e1e35] rounded-md text-[#e8e8f0] text-xs font-sans placeholder-[#6b6b8a] outline-none focus:border-[#00d4ff]/50 w-56"
        />
        {(plan || status || orgId) && (
          <button
            type="button"
            onClick={() => { setPlan(''); setStatus(''); setOrgId(''); }}
            className="px-3 py-1.5 rounded-md text-xs text-[#6b6b8a] hover:text-[#e8e8f0] bg-[#161625] border border-[#1e1e35]"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-[10px] font-['JetBrains_Mono'] text-[#6b6b8a]">
          Polling every {Math.round(POLL_DASHBOARD / 1000)}s
        </span>
      </div>

      {/* Row 1 — 6 stat cards */}
      <PlatformStats stats={stats} isLoading={statsLoading} onDrillDown={handleDrillDown} />
      {statsError && (
        <div className="mb-4 bg-[#ff3366]/10 border border-[#ff3366]/25 text-[#ff99aa] rounded-lg px-4 py-3 text-xs">
          Dashboard stats could not be loaded. Other widgets may still update independently.
        </div>
      )}

      {/* Row 2 — MRR chart + Org growth chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div className="lg:col-span-3">
          <RevenueChart data={mrr} isLoading={mrrLoading} isError={mrrError} />
        </div>
        <div className="lg:col-span-2">
          <OrgGrowthChart data={growth} isLoading={growthLoading} isError={growthError} />
        </div>
      </div>

      {/* Row 3 — Health + Alerts + Signups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HealthPanel   health={health}   isLoading={healthLoading} isError={healthError} />
        <AlertsFeed    alerts={alerts}   isLoading={alertsLoading} isError={alertsError} />
        <RecentSignups signups={signups} isLoading={signupsLoading} isError={signupsError} />
      </div>
    </div>
  );
}
