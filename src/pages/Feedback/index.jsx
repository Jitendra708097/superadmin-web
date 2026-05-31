import { useState } from 'react';
import { DatePicker, Select, Table, Tooltip } from 'antd';
import dayjs from 'dayjs';
import {
  BugOutlined,
  BulbOutlined,
  ClearOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useGetFeedbackQuery, useGetFeedbackSummaryQuery } from '@store/api/feedbackApi.js';
import { useSearchOrgsQuery } from '@store/api/orgApi.js';
import { useDebounce } from '@hooks/useDebounce.js';
import { PAGE_SIZE } from '@utils/constants.js';
import { formatDateTime, formatTimeAgo } from '@utils/formatters.js';
import PageHeader from '@components/common/PageHeader.jsx';
import MonoValue from '@components/common/MonoValue.jsx';

const { RangePicker } = DatePicker;

const TYPE_OPTIONS = [
  { value: 'bug', label: 'Bug', color: '#ff3366', icon: BugOutlined },
  { value: 'suggestion', label: 'Suggestion', color: '#00d4ff', icon: BulbOutlined },
  { value: 'confusing', label: 'Confusing', color: '#ffaa00', icon: QuestionCircleOutlined },
  { value: 'other', label: 'Other', color: '#a855f7', icon: MessageOutlined },
];

function formatCount(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value || 0));
}

function TypePill({ value }) {
  const option = TYPE_OPTIONS.find((item) => item.value === value) || TYPE_OPTIONS[3];
  const Icon = option.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider"
      style={{ color: option.color, backgroundColor: `${option.color}18`, border: `1px solid ${option.color}30` }}
    >
      <Icon />
      {option.label}
    </span>
  );
}

function Rating({ value }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((item) => (
        <StarFilled
          key={item}
          style={{ color: item <= Number(value || 0) ? '#ffaa00' : '#2a2a3e', fontSize: 12 }}
        />
      ))}
      <MonoValue value={String(value || '-')} color="muted" size="xs" />
    </div>
  );
}

export default function FeedbackPage() {
  const [orgSearch, setOrgSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [feedbackType, setFeedbackType] = useState('');
  const [rating, setRating] = useState('');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [page, setPage] = useState(1);

  const debouncedOrgSearch = useDebounce(orgSearch, 300);
  const debouncedSearch = useDebounce(search, 300);
  const selectedOrgId = selectedOrg?.id || '';

  const { data: orgSearchData, isFetching: orgSearching } = useSearchOrgsQuery(
    { q: debouncedOrgSearch },
    { skip: debouncedOrgSearch.length < 2 || !!selectedOrg }
  );

  const params = {
    page,
    limit: PAGE_SIZE,
    orgId: selectedOrgId || undefined,
    feedbackType: feedbackType || undefined,
    rating: rating || undefined,
    search: debouncedSearch || undefined,
    startDate: dateRange?.[0]?.toISOString(),
    endDate: dateRange?.[1]?.toISOString(),
  };

  const summaryParams = {
    orgId: selectedOrgId || undefined,
    feedbackType: feedbackType || undefined,
    rating: rating || undefined,
    search: debouncedSearch || undefined,
    startDate: dateRange?.[0]?.toISOString(),
    endDate: dateRange?.[1]?.toISOString(),
  };

  const { data, isLoading, isFetching } = useGetFeedbackQuery(params);
  const { data: summaryData, isFetching: isSummaryFetching } = useGetFeedbackSummaryQuery(summaryParams);

  const rows = data?.data?.feedback || [];
  const total = data?.data?.total || 0;
  const summary = summaryData?.data || {};
  const orgResults = orgSearchData?.data?.orgs || [];
  const hasFilters = Boolean(selectedOrg || orgSearch || feedbackType || rating || search || dateRange);

  const clearFilters = () => {
    setOrgSearch('');
    setSelectedOrg(null);
    setFeedbackType('');
    setRating('');
    setSearch('');
    setDateRange(null);
    setPage(1);
  };

  const stats = [
    { label: 'Total Feedback', value: summary.total, color: '#00d4ff', icon: MessageOutlined },
    { label: 'Average Rating', value: summary.avgRating || 0, color: '#ffaa00', icon: StarFilled },
    { label: 'Bugs', value: summary.byType?.bug || 0, color: '#ff3366', icon: BugOutlined },
    { label: 'Suggestions', value: summary.byType?.suggestion || 0, color: '#00d4ff', icon: BulbOutlined },
  ];

  const columns = [
    {
      title: 'Submitted',
      dataIndex: 'createdAt',
      width: 145,
      render: (value) => (
        <Tooltip title={formatDateTime(value)}>
          <MonoValue value={formatTimeAgo(value)} color="muted" size="xs" />
        </Tooltip>
      ),
    },
    {
      title: 'Organisation',
      dataIndex: 'orgName',
      width: 160,
      render: (value, record) => (
        <div>
          <div className="text-[#e8e8f0] text-xs truncate max-w-[150px]">{value || 'Unknown'}</div>
          {record.orgSlug ? <MonoValue value={`@${record.orgSlug}`} color="muted" size="xs" /> : null}
        </div>
      ),
    },
    {
      title: 'User',
      dataIndex: 'employeeName',
      width: 190,
      render: (value, record) => (
        <div>
          <div className="text-[#e8e8f0] text-xs truncate max-w-[180px]">{value || 'Employee'}</div>
          <div className="text-[#6b6b8a] text-[11px] truncate max-w-[180px]">{record.employeeEmail || record.employeePhone || '-'}</div>
          {record.employeeCode ? <MonoValue value={record.employeeCode} color="muted" size="xs" /> : null}
        </div>
      ),
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      width: 120,
      render: (value) => <Rating value={value} />,
    },
    {
      title: 'Type',
      dataIndex: 'feedbackType',
      width: 135,
      render: (value) => <TypePill value={value} />,
    },
    {
      title: 'Message',
      dataIndex: 'message',
      render: (value) => (
        <div className="text-[#c8c8d8] text-xs leading-5 whitespace-pre-wrap break-words max-w-[620px]">
          {value}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="User Feedback"
        count={total}
        subtitle="Manual app feedback grouped by organisation"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg px-4 py-3 min-h-[88px] flex items-center gap-3"
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
                  {isSummaryFetching && summaryData ? <span className="text-[#6b6b8a]">...</span> : formatCount(stat.value)}
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
                onChange={(event) => {
                  setOrgSearch(event.target.value);
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
                      {org.slug ? <MonoValue value={`@${org.slug}`} color="muted" size="xs" /> : null}
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
          value={feedbackType || undefined}
          placeholder="All Types"
          allowClear
          onChange={(value) => {
            setFeedbackType(value || '');
            setPage(1);
          }}
          style={{ width: 160 }}
          options={TYPE_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
        />
        <Select
          value={rating || undefined}
          placeholder="All Ratings"
          allowClear
          onChange={(value) => {
            setRating(value || '');
            setPage(1);
          }}
          style={{ width: 140 }}
          options={[1, 2, 3, 4, 5].map((item) => ({ value: item, label: `${item} star${item > 1 ? 's' : ''}` }))}
        />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search message or user..."
          className="px-3 py-2 bg-[#161625] border border-[#1e1e35] rounded-md text-[#e8e8f0] text-xs font-sans placeholder-[#6b6b8a] outline-none focus:border-[#00d4ff]/50 transition-colors w-64"
        />
        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            setDateRange(dates);
            setPage(1);
          }}
          size="small"
          style={{ borderColor: '#1e1e35' }}
          disabledDate={(current) => current && current > dayjs().endOf('day')}
        />
        <button
          onClick={clearFilters}
          disabled={!hasFilters}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans text-[#6b6b8a] hover:text-[#e8e8f0] bg-[#161625] border border-[#1e1e35] hover:border-[#ffaa00]/30 transition-colors disabled:opacity-50 disabled:hover:text-[#6b6b8a]"
        >
          <ClearOutlined />
          Clear filters
        </button>
      </div>

      <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg overflow-hidden">
        <Table
          columns={columns}
          dataSource={rows}
          rowKey="id"
          size="small"
          loading={isLoading || isFetching}
          scroll={{ x: 1050 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: setPage,
            showTotal: (value) => (
              <span className="font-['JetBrains_Mono'] text-xs text-[#6b6b8a]">{value} entries</span>
            ),
            showSizeChanger: false,
          }}
        />
      </div>
    </div>
  );
}
