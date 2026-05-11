/**
 * @module AuditLogsPage
 * @description Full audit log explorer - dense table, filtering by org/action/date.
 *              Click row to expand full JSON detail. Color-coded actions.
 */

import { useState } from 'react';
import { useLocation } from 'react-router';
import { Table, Select, DatePicker, Tooltip, message } from 'antd';
import {
  AlertOutlined,
  AuditOutlined,
  ClearOutlined,
  DownloadOutlined,
  ExpandAltOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  UserSwitchOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import axiosInstance from '@api/axiosInstance.js';
import { useGetAuditLogSummaryQuery, useGetAuditLogsQuery } from '@store/api/auditApi.js';
import { useDebounce } from '@hooks/useDebounce.js';
import { AUDIT_ACTION_COLORS, AUDIT_ACTIONS, PAGE_SIZE } from '@utils/constants.js';
import { formatDateTime, formatTimeAgo } from '@utils/formatters.js';
import PageHeader from '@components/common/PageHeader.jsx';
import MonoValue from '@components/common/MonoValue.jsx';

const { RangePicker } = DatePicker;
const SAVED_AUDIT_VIEWS_KEY = 'ae_sa_audit_saved_views';

function getFilenameFromDisposition(headerValue, fallback) {
  const match = /filename="?([^"]+)"?/i.exec(headerValue || '');
  return match ? match[1] : fallback;
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function formatCount(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value || 0));
}

export default function AuditLogsPage() {
  const location = useLocation();
  const preOrgId = location.state?.orgId || '';
  const preOrgName = location.state?.orgName || '';

  const [orgSearch, setOrgSearch] = useState(preOrgId);
  const [actionType, setActionType] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});
  const [exporting, setExporting] = useState(false);
  const [savedViews, setSavedViews] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_AUDIT_VIEWS_KEY) || '[]');
    } catch (_) {
      return [];
    }
  });

  const debouncedOrg = useDebounce(orgSearch, 300);
  const hasActiveFilters = Boolean(orgSearch || actionType || entityType || entityId || (dateRange && dateRange.length));

  const auditQueryParams = {
    page,
    limit: PAGE_SIZE,
    orgId: debouncedOrg || undefined,
    action: actionType || undefined,
    entityType: entityType || undefined,
    entityId: entityId || undefined,
    startDate: dateRange?.[0]?.toISOString(),
    endDate: dateRange?.[1]?.toISOString(),
  };

  const summaryQueryParams = {
    orgId: debouncedOrg || undefined,
    action: actionType || undefined,
    entityType: entityType || undefined,
    entityId: entityId || undefined,
    startDate: dateRange?.[0]?.toISOString(),
    endDate: dateRange?.[1]?.toISOString(),
  };

  const { data, isLoading, isFetching } = useGetAuditLogsQuery(auditQueryParams);
  const { data: summaryData, isFetching: isSummaryFetching } = useGetAuditLogSummaryQuery(summaryQueryParams);

  const summary = summaryData?.data || {};
  const auditStats = [
    {
      label: 'Actions Today',
      value: summary.actionsToday,
      icon: ThunderboltOutlined,
      color: '#00d4ff',
    },
    {
      label: 'Login Failures',
      value: summary.loginFailures,
      icon: AlertOutlined,
      color: '#ff3366',
    },
    {
      label: 'Security Incidents',
      value: summary.securityIncidents,
      icon: SafetyCertificateOutlined,
      color: '#ffaa00',
    },
    {
      label: 'Billing Overrides',
      value: summary.billingManualOverrides,
      icon: WalletOutlined,
      color: '#00ff88',
    },
    {
      label: 'Org Config Changes',
      value: summary.orgConfigChanges,
      icon: SettingOutlined,
      color: '#a855f7',
    },
    {
      label: 'Impersonations',
      value: summary.impersonations,
      icon: UserSwitchOutlined,
      color: '#ff7a45',
    },
    {
      label: 'Total Actions',
      value: summary.totalActions,
      icon: AuditOutlined,
      color: '#6b6b8a',
    },
  ];

  const logs = data?.data?.logs || [];
  const total = data?.data?.total || 0;

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const clearFilters = () => {
    setOrgSearch('');
    setActionType('');
    setEntityType('');
    setEntityId('');
    setDateRange(null);
    setPage(1);
  };

  const persistSavedViews = (views) => {
    setSavedViews(views);
    localStorage.setItem(SAVED_AUDIT_VIEWS_KEY, JSON.stringify(views));
  };

  const saveCurrentView = () => {
    const name = window.prompt('Saved view name');
    if (!name?.trim()) return;
    const next = [
      ...savedViews.filter((view) => view.name !== name.trim()),
      { name: name.trim(), orgSearch, actionType, entityType, entityId },
    ].slice(-8);
    persistSavedViews(next);
    message.success('Audit view saved');
  };

  const applySavedView = (name) => {
    const view = savedViews.find((item) => item.name === name);
    if (!view) return;
    setOrgSearch(view.orgSearch || '');
    setActionType(view.actionType || '');
    setEntityType(view.entityType || '');
    setEntityId(view.entityId || '');
    setPage(1);
  };

  const handleExport = async (format = 'xlsx') => {
    try {
      setExporting(true);
      const response = await axiosInstance.get('/superadmin/audit-logs/export', {
        params: {
          orgId: debouncedOrg || undefined,
          action: actionType || undefined,
          entityType: entityType || undefined,
          entityId: entityId || undefined,
          startDate: dateRange?.[0]?.toISOString(),
          endDate: dateRange?.[1]?.toISOString(),
          format,
        },
        responseType: 'blob',
      });

      downloadBlob(
        response.data,
        getFilenameFromDisposition(response.headers['content-disposition'], `audit-logs-export.${format}`)
      );
      message.success(`Audit log ${format === 'xlsx' ? 'Excel' : 'CSV'} export downloaded`);
    } catch (error) {
      message.error(error.response?.data?.error?.message || 'Audit log export failed');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      width: 150,
      render: (v) => (
        <Tooltip title={formatDateTime(v)}>
          <MonoValue value={formatTimeAgo(v)} color="muted" size="xs" />
        </Tooltip>
      ),
    },
    {
      title: 'Org',
      dataIndex: 'orgName',
      width: 150,
      render: (v, r) => (
        <div>
          <div className="text-[#e8e8f0] text-xs truncate max-w-[140px]">{v || 'System'}</div>
          {r.orgSlug && <MonoValue value={`@${r.orgSlug}`} color="muted" size="xs" />}
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      width: 180,
      render: (v) => (
        <span
          style={{ color: AUDIT_ACTION_COLORS[v] || '#6b6b8a' }}
          className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider"
        >
          {v}
        </span>
      ),
    },
    {
      title: 'Performed By',
      dataIndex: 'performedByName',
      width: 140,
      render: (v, r) => (
        <div>
          <span className="text-xs text-[#e8e8f0]">{v || 'System'}</span>
          {r.impersonatedBy && (
            <div className="text-[#ffaa00] text-[10px] font-['JetBrains_Mono']">via Impersonation</div>
          )}
        </div>
      ),
    },
    {
      title: 'Target',
      dataIndex: 'targetName',
      width: 130,
      render: (v) => <span className="text-[#6b6b8a] text-xs">{v || '-'}</span>,
    },
    {
      title: 'IP',
      dataIndex: 'ipAddress',
      width: 110,
      render: (v) => <MonoValue value={v || '-'} color="muted" size="xs" />,
    },
    {
      title: '...',
      key: 'expand',
      width: 40,
      render: (_, r) => (
        <button
          onClick={() => toggleExpand(r.id)}
          className="text-[#6b6b8a] hover:text-[#00d4ff] transition-colors"
        >
          <ExpandAltOutlined className="text-xs" />
        </button>
      ),
    },
  ];

  const actionOptions = Object.values(AUDIT_ACTIONS).map((a) => ({
    value: a,
    label: (
      <span style={{ color: AUDIT_ACTION_COLORS[a] || '#6b6b8a' }} className="text-[11px] font-['JetBrains_Mono']">
        {a}
      </span>
    ),
  }));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Audit Logs"
        count={total}
        subtitle={preOrgName ? `Filtered: ${preOrgName}` : 'All platform activity'}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('xlsx')}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans text-[#6b6b8a] hover:text-[#e8e8f0] bg-[#161625] border border-[#1e1e35] hover:border-[#00d4ff]/30 transition-colors disabled:opacity-50"
            >
              <DownloadOutlined />
              {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans text-[#6b6b8a] hover:text-[#e8e8f0] bg-[#161625] border border-[#1e1e35] hover:border-[#00d4ff]/30 transition-colors disabled:opacity-50"
            >
              <DownloadOutlined />
              Export CSV
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-3 mb-4">
        {auditStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg px-4 py-3 min-h-[92px] flex items-center gap-3"
            >
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${stat.color}18`, color: stat.color }}
              >
                <Icon />
              </div>
              <div className="min-w-0">
                <div className="text-[#6b6b8a] text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider truncate">
                  {stat.label}
                </div>
                <div className="text-[#e8e8f0] text-2xl font-semibold leading-tight mt-1">
                  {isSummaryFetching && summaryData ? (
                    <span className="text-[#6b6b8a]">...</span>
                  ) : (
                    formatCount(stat.value)
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          value={orgSearch}
          onChange={(e) => {
            setOrgSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by Org ID..."
          className="px-3 py-2 bg-[#161625] border border-[#1e1e35] rounded-md text-[#e8e8f0] text-xs font-sans placeholder-[#6b6b8a] outline-none focus:border-[#00d4ff]/50 transition-colors w-52"
        />
        <Select
          value={actionType || undefined}
          placeholder="All Actions"
          allowClear
          onChange={(v) => {
            setActionType(v || '');
            setPage(1);
          }}
          style={{ width: 220 }}
          options={actionOptions}
          optionLabelProp="label"
        />
        <Select
          value={entityType || undefined}
          placeholder="Entity Type"
          allowClear
          onChange={(value) => {
            setEntityType(value || '');
            setPage(1);
          }}
          style={{ width: 160 }}
          options={[
            { value: 'organisation', label: 'Organisation' },
            { value: 'feature_flag', label: 'Feature Flag' },
            { value: 'feature_flag_override', label: 'Flag Override' },
            { value: 'queue', label: 'Queue' },
          ]}
        />
        <input
          value={entityId}
          onChange={(event) => {
            setEntityId(event.target.value);
            setPage(1);
          }}
          placeholder="Entity ID..."
          className="px-3 py-2 bg-[#161625] border border-[#1e1e35] rounded-md text-[#e8e8f0] text-xs font-sans placeholder-[#6b6b8a] outline-none focus:border-[#00d4ff]/50 transition-colors w-52"
        />
        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            setDateRange(dates);
            setPage(1);
          }}
          size="small"
          style={{ borderColor: '#1e1e35' }}
        />
        <button
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans text-[#6b6b8a] hover:text-[#e8e8f0] bg-[#161625] border border-[#1e1e35] hover:border-[#ffaa00]/30 transition-colors disabled:opacity-50 disabled:hover:text-[#6b6b8a]"
        >
          <ClearOutlined />
          Clear filters
        </button>
        <button
          onClick={saveCurrentView}
          disabled={!hasActiveFilters}
          className="px-3 py-1.5 rounded-md text-xs font-sans text-[#6b6b8a] hover:text-[#e8e8f0] bg-[#161625] border border-[#1e1e35] hover:border-[#00d4ff]/30 transition-colors disabled:opacity-50"
        >
          Save view
        </button>
        {savedViews.length > 0 && (
          <Select
            value={undefined}
            placeholder="Saved views"
            onChange={applySavedView}
            style={{ width: 160 }}
            options={savedViews.map((view) => ({ value: view.name, label: view.name }))}
            size="small"
          />
        )}
      </div>

      <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg overflow-hidden">
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          size="small"
          loading={isLoading || isFetching}
          scroll={{ x: 900 }}
          expandable={{
            expandedRowKeys: Object.keys(expanded).filter((k) => expanded[k]),
            expandedRowRender: (record) => (
              <div className="bg-[#161625] rounded-md p-4 m-2 font-['JetBrains_Mono'] text-xs text-[#00d4ff]">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(record.metadata || {}, null, 2)}
                </pre>
              </div>
            ),
            expandIcon: () => null,
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: setPage,
            showTotal: (t) => (
              <span className="font-['JetBrains_Mono'] text-xs text-[#6b6b8a]">{t} entries</span>
            ),
            showSizeChanger: false,
          }}
        />
      </div>
    </div>
  );
}
