/**
 * @module AuditLogsPage
 * @description Full audit log explorer - dense table, filtering by org/action/date.
 *              Click row to expand full JSON detail. Color-coded actions.
 */

import { useState } from 'react';
import { useLocation } from 'react-router';
import { Drawer, Table, Select, DatePicker, Tooltip, message } from 'antd';
import dayjs from 'dayjs';
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
import {
  useGetAuditLogByIdQuery,
  useGetAuditLogSummaryQuery,
  useGetAuditLogsQuery,
} from '@store/api/auditApi.js';
import { useSearchOrgsQuery } from '@store/api/orgApi.js';
import { useDebounce } from '@hooks/useDebounce.js';
import { AUDIT_ACTION_COLORS, AUDIT_ACTIONS, PAGE_SIZE } from '@utils/constants.js';
import { formatDateTime, formatTimeAgo } from '@utils/formatters.js';
import PageHeader from '@components/common/PageHeader.jsx';
import MonoValue from '@components/common/MonoValue.jsx';

const { RangePicker } = DatePicker;
const SAVED_AUDIT_VIEWS_KEY = 'ae_sa_audit_saved_views';
const AUDIT_EXPORT_WARN_THRESHOLD = 10000;

const ENTITY_TYPE_OPTIONS = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'attendance_session', label: 'Attendance Session' },
  { value: 'billing', label: 'Billing' },
  { value: 'employee', label: 'Employee' },
  { value: 'feature_flag', label: 'Feature Flag' },
  { value: 'feature_flag_override', label: 'Flag Override' },
  { value: 'impersonation_session', label: 'Impersonation Session' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'plan', label: 'Plan' },
  { value: 'queue', label: 'Queue' },
  { value: 'superadmin', label: 'Superadmin' },
];

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

  const [orgSearch, setOrgSearch] = useState(preOrgName || '');
  const [selectedOrg, setSelectedOrg] = useState(
    preOrgId ? { id: preOrgId, name: preOrgName || preOrgId } : null
  );
  const [actionType, setActionType] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});
  const [detailLogId, setDetailLogId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [savedViews, setSavedViews] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_AUDIT_VIEWS_KEY) || '[]');
    } catch (_) {
      return [];
    }
  });

  const debouncedOrgSearch = useDebounce(orgSearch, 300);
  const hasActiveFilters = Boolean(selectedOrg || orgSearch || actionType || entityType || entityId || (dateRange && dateRange.length));

  const { data: orgSearchData, isFetching: orgSearching } = useSearchOrgsQuery(
    { q: debouncedOrgSearch },
    { skip: debouncedOrgSearch.length < 2 || !!selectedOrg }
  );

  const orgResults = orgSearchData?.data?.orgs || [];
  const selectedOrgId = selectedOrg?.id || '';

  const auditQueryParams = {
    page,
    limit: PAGE_SIZE,
    orgId: selectedOrgId || undefined,
    action: actionType || undefined,
    entityType: entityType || undefined,
    entityId: entityId || undefined,
    startDate: dateRange?.[0]?.toISOString(),
    endDate: dateRange?.[1]?.toISOString(),
  };

  const summaryQueryParams = {
    orgId: selectedOrgId || undefined,
    action: actionType || undefined,
    entityType: entityType || undefined,
    entityId: entityId || undefined,
    startDate: dateRange?.[0]?.toISOString(),
    endDate: dateRange?.[1]?.toISOString(),
  };

  const { data, isLoading, isFetching } = useGetAuditLogsQuery(auditQueryParams);
  const { data: summaryData, isFetching: isSummaryFetching } = useGetAuditLogSummaryQuery(summaryQueryParams);
  const { data: detailData, isFetching: detailLoading } = useGetAuditLogByIdQuery(detailLogId, {
    skip: !detailLogId,
  });

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
  const detailLog = detailData?.data || null;

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const clearFilters = () => {
    setOrgSearch('');
    setSelectedOrg(null);
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
      {
        name: name.trim(),
        orgId: selectedOrg?.id || '',
        orgName: selectedOrg?.name || '',
        orgSearch,
        actionType,
        entityType,
        entityId,
        dateRange: dateRange
          ? [
              dateRange[0]?.toISOString(),
              dateRange[1]?.toISOString(),
            ]
          : null,
      },
    ].slice(-8);
    persistSavedViews(next);
    message.success('Audit view saved');
  };

  const applySavedView = (name) => {
    const view = savedViews.find((item) => item.name === name);
    if (!view) return;
    setSelectedOrg(view.orgId ? { id: view.orgId, name: view.orgName || view.orgId } : null);
    setOrgSearch(view.orgName || view.orgSearch || '');
    setActionType(view.actionType || '');
    setEntityType(view.entityType || '');
    setEntityId(view.entityId || '');
    setDateRange(
      Array.isArray(view.dateRange) && view.dateRange[0] && view.dateRange[1]
        ? [dayjs(view.dateRange[0]), dayjs(view.dateRange[1])]
        : null
    );
    setPage(1);
  };

  const handleExport = async (format = 'xlsx') => {
    if (total > AUDIT_EXPORT_WARN_THRESHOLD) {
      const confirmed = window.confirm(
        `This export has ${formatCount(total)} rows. It may take a while. Continue?`
      );
      if (!confirmed) return;
    }

    try {
      setExporting(true);
      const response = await axiosInstance.get('/superadmin/audit-logs/export', {
        params: {
          orgId: selectedOrgId || undefined,
          action: actionType || undefined,
          entityType: entityType || undefined,
          entityId: entityId || undefined,
          startDate: dateRange?.[0]?.toISOString(),
          endDate: dateRange?.[1]?.toISOString(),
          format,
          allowLargeExport: total > AUDIT_EXPORT_WARN_THRESHOLD ? 'true' : undefined,
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
      width: 72,
      render: (_, r) => (
        <div className="flex items-center gap-2">
          <Tooltip title="Expand metadata">
            <button
              onClick={() => toggleExpand(r.id)}
              className="text-[#6b6b8a] hover:text-[#00d4ff] transition-colors"
            >
              <ExpandAltOutlined className="text-xs" />
            </button>
          </Tooltip>
          <Tooltip title="View details">
            <button
              onClick={() => setDetailLogId(r.id)}
              className="text-[#6b6b8a] hover:text-[#00d4ff] transition-colors"
            >
              <AuditOutlined className="text-xs" />
            </button>
          </Tooltip>
        </div>
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
        <div className="relative w-64">
          {selectedOrg ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#161625] border border-[#1e1e35] rounded-md">
              <div className="min-w-0">
                <div className="text-[#e8e8f0] text-xs truncate">{selectedOrg.name}</div>
                <MonoValue value={selectedOrg.id} color="muted" size="xs" />
              </div>
              <button
                onClick={() => {
                  setSelectedOrg(null);
                  setOrgSearch('');
                  setPage(1);
                }}
                className="text-[#6b6b8a] hover:text-[#ff3366] text-xs transition-colors"
              >
                x
              </button>
            </div>
          ) : (
            <>
              <input
                value={orgSearch}
                onChange={(e) => {
                  setOrgSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search organisation..."
                className="w-full px-3 py-2 bg-[#161625] border border-[#1e1e35] rounded-md text-[#e8e8f0] text-xs font-sans placeholder-[#6b6b8a] outline-none focus:border-[#00d4ff]/50 transition-colors"
              />
              {orgResults.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-[#161625] border border-[#1e1e35] rounded-md shadow-xl max-h-56 overflow-y-auto">
                  {orgResults.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        setSelectedOrg(org);
                        setOrgSearch(org.name);
                        setPage(1);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#1e1e35] transition-colors"
                    >
                      <div className="text-[#e8e8f0] text-xs truncate">{org.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {org.slug && <MonoValue value={`@${org.slug}`} color="muted" size="xs" />}
                        <MonoValue value={`${org.employeeCount || 0} emp`} color="muted" size="xs" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {orgSearching && debouncedOrgSearch.length >= 2 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 border border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
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
          options={ENTITY_TYPE_OPTIONS}
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

      <Drawer
        title="Audit Log Detail"
        open={!!detailLogId}
        onClose={() => setDetailLogId(null)}
        width={720}
        styles={{
          body: { background: '#080810' },
          header: { background: '#0f0f1a', borderBottom: '1px solid #1e1e35' },
        }}
      >
        {detailLoading ? (
          <div className="text-[#6b6b8a] text-sm">Loading audit log...</div>
        ) : detailLog ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['Timestamp', formatDateTime(detailLog.createdAt)],
                ['Action', detailLog.action || '-'],
                ['Organisation', detailLog.orgName || 'System'],
                ['Performed By', detailLog.performedByName || 'System'],
                ['Performer Email', detailLog.performedByEmail || '-'],
                ['Actor Role', detailLog.metadata?.actorRole || '-'],
                ['Target Type', detailLog.targetEntityType || detailLog.metadata?.entityType || '-'],
                ['Target ID', detailLog.targetEntityId || detailLog.metadata?.entityId || '-'],
                ['IP Address', detailLog.ipAddress || '-'],
                ['Impersonation Session', detailLog.impersonationSessionId || '-'],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#0f0f1a] border border-[#1e1e35] rounded-md p-3">
                  <div className="text-[#6b6b8a] text-[9px] uppercase tracking-widest mb-1">
                    {label}
                  </div>
                  <div className="text-[#e8e8f0] text-xs break-words">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-md p-3">
              <div className="text-[#6b6b8a] text-[9px] uppercase tracking-widest mb-2">
                Old Value
              </div>
              <pre className="whitespace-pre-wrap break-all text-xs text-[#ffaa00] font-['JetBrains_Mono']">
                {JSON.stringify(detailLog.metadata?.oldValue || null, null, 2)}
              </pre>
            </div>

            <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-md p-3">
              <div className="text-[#6b6b8a] text-[9px] uppercase tracking-widest mb-2">
                New Value
              </div>
              <pre className="whitespace-pre-wrap break-all text-xs text-[#00d4ff] font-['JetBrains_Mono']">
                {JSON.stringify(detailLog.metadata?.newValue || null, null, 2)}
              </pre>
            </div>

            <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-md p-3">
              <div className="text-[#6b6b8a] text-[9px] uppercase tracking-widest mb-2">
                User Agent
              </div>
              <p className="text-[#6b6b8a] text-xs break-words">
                {detailLog.metadata?.userAgent || '-'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-[#6b6b8a] text-sm">Audit log not found.</div>
        )}
      </Drawer>
    </div>
  );
}
