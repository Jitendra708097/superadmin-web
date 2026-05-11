/**
 * @module PlatformStats
 * @description Top 6 stat cards for the mission control dashboard.
 *              Total Orgs, Active, Employees, Checked In, MRR, New MTD.
 *              Shows skeleton loading while data fetches.
 */

import { ApartmentOutlined, CheckCircleOutlined, TeamOutlined, LoginOutlined, DollarOutlined, RiseOutlined } from '@ant-design/icons';
import StatCard from '@components/common/StatCard.jsx';
import Skeleton from '@components/common/Skeleton.jsx';
import { formatMRR } from '@utils/formatters.js';

export default function PlatformStats({ stats = {}, isLoading, onDrillDown }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} active paragraph={{ rows: 2 }} avatar={{ size: 32 }} />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Orgs',
      value: stats.totalOrgs || 0,
      accentColor: 'cyan',
      icon: <ApartmentOutlined />,
      trend: stats.orgTrend,
      trendValue: stats.orgTrendValue,
      drill: 'organisations',
    },
    {
      label: 'Active Orgs',
      value: stats.activeOrgs || 0,
      accentColor: 'green',
      icon: <CheckCircleOutlined />,
      subtitle: `${stats.trialOrgs || 0} on trial`,
      drill: 'active',
    },
    {
      label: 'Total Employees',
      value: stats.totalEmployees || 0,
      accentColor: 'cyan',
      icon: <TeamOutlined />,
      trend: stats.employeeTrend,
      trendValue: stats.employeeTrendValue,
      drill: 'employees',
    },
    {
      label: 'Checked In Now',
      value: stats.checkedInNow || 0,
      accentColor: 'green',
      icon: <LoginOutlined />,
      subtitle: stats.totalEmployees
        ? `${((stats.checkedInNow / stats.totalEmployees) * 100).toFixed(1)}% of workforce`
        : '',
      drill: 'checkedIn',
    },
    {
      label: 'Monthly MRR',
      rawValue: formatMRR(stats.mrr || 0),
      value: 0,
      accentColor: 'amber',
      icon: <DollarOutlined />,
      animate: false,
      trend: stats.mrrTrend,
      trendValue: stats.mrrTrendValue,
      drill: 'revenue',
    },
    {
      label: 'New Orgs MTD',
      value: stats.newOrgsMTD || 0,
      accentColor: 'amber',
      icon: <RiseOutlined />,
      subtitle: `vs ${stats.newOrgsPrev || 0} last month`,
      drill: 'newOrgs',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
      {cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          rawValue={card.rawValue}
          accentColor={card.accentColor}
          icon={card.icon}
          trend={card.trend}
          trendValue={card.trendValue}
          subtitle={card.subtitle}
          animate={card.animate !== false}
          onClick={() => onDrillDown?.(card.drill)}
        />
      ))}
    </div>
  );
}
