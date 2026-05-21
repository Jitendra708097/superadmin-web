/**
 * @module RevenuePage
 * @description Full billing dashboard - MRR, ARR, plan breakdown, churn, invoices.
 *              All values in INR. Charts: area MRR growth, pie plan distribution.
 */

import { useState } from 'react';
import { DatePicker, Drawer, Input, Select, Table, message } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  useGetRevenueSummaryQuery, useGetMRRHistoryQuery,
  useGetPlanBreakdownQuery, useGetChurnedOrgsQuery,
  useGetAllInvoicesQuery, useGetTopOrgsByMRRQuery,
} from '@store/api/billingApi.js';
import { POLL_DASHBOARD, PLAN_COLORS } from '@utils/constants.js';
import { formatINR, formatMRR, formatDate, formatNumber } from '@utils/formatters.js';

import PageHeader from '@components/common/PageHeader.jsx';
import StatCard from '@components/common/StatCard.jsx';
import MonoValue from '@components/common/MonoValue.jsx';
import PlanBadge from '@components/common/PlanBadge.jsx';
import DarkPieChart from '@components/charts/DarkPieChart.jsx';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { CHART_TOOLTIP_STYLE } from '@theme/colors.js';
import axiosInstance from '@api/axiosInstance.js';
import { useDebounce } from '@hooks/useDebounce.js';

const { RangePicker } = DatePicker;

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
];

const PLAN_OPTIONS = [
  { label: 'All plans', value: '' },
  { label: 'Trial', value: 'trial' },
  { label: 'Standard', value: 'standard' },
  { label: 'Enterprise', value: 'enterprise' },
];

const CURRENCY_OPTIONS = [
  { label: 'All currencies', value: '' },
  { label: 'INR', value: 'INR' },
];

function StatusChip({ status }) {
  const config = {
    paid: 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/25',
    verified: 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/25',
    pending: 'bg-[#ffaa00]/10 text-[#ffaa00] border-[#ffaa00]/25',
    failed: 'bg-[#ff3366]/10 text-[#ff3366] border-[#ff3366]/25',
    overdue: 'bg-[#ff3366]/10 text-[#ff3366] border-[#ff3366]/25',
    refunded: 'bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/25',
  }[status] || 'bg-[#6b6b8a]/10 text-[#b8b8c8] border-[#6b6b8a]/25';

  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-['JetBrains_Mono'] uppercase ${config}`}>
      {status || 'unknown'}
    </span>
  );
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[#1e1e35] last:border-0">
      <span className="text-[#8a8aa8] text-xs font-sans">{label}</span>
      <span className={`${mono ? "font-['JetBrains_Mono']" : 'font-sans'} text-xs text-[#e8e8f0] text-right truncate max-w-[320px]`}>
        {value || 'N/A'}
      </span>
    </div>
  );
}

function getFilenameFromDisposition(headerValue, fallback) {
  const match = /filename="?([^"]+)"?/i.exec(headerValue || '');
  return match ? match[1] : fallback;
}

export default function RevenuePage() {
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [invoicePlan, setInvoicePlan] = useState('');
  const [invoiceCurrency, setInvoiceCurrency] = useState('');
  const [invoiceDates, setInvoiceDates] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [exporting, setExporting] = useState(false);
  const debouncedInvoiceSearch = useDebounce(invoiceSearch, 300);

  const { data: summaryData, isLoading: summaryLoading } =
    useGetRevenueSummaryQuery(undefined, { pollingInterval: POLL_DASHBOARD });

  const { data: mrrData, isLoading: mrrLoading } = useGetMRRHistoryQuery({ months: 12 });
  const { data: planData, isLoading: planLoading } = useGetPlanBreakdownQuery();
  const { data: churnData, isLoading: churnLoading } = useGetChurnedOrgsQuery({ limit: 10 });
  const { data: topData, isLoading: topLoading } = useGetTopOrgsByMRRQuery({ limit: 10 });
  const invoiceParams = {
    page: invoicePage,
    limit: 20,
    search: debouncedInvoiceSearch || undefined,
    status: invoiceStatus || undefined,
    plan: invoicePlan || undefined,
    currency: invoiceCurrency || undefined,
    from: invoiceDates?.[0]?.format('YYYY-MM-DD'),
    to: invoiceDates?.[1]?.format('YYYY-MM-DD'),
  };
  const { data: invoiceData, isLoading: invoiceLoading, isFetching: invoiceFetching, refetch: refetchInvoices } = useGetAllInvoicesQuery(invoiceParams);

  const summary = summaryData?.data || {};
  const mrrHist = mrrData?.data || [];
  const plans = planData?.data || [];
  const churned = churnData?.data?.orgs || [];
  const topOrgs = topData?.data?.orgs || [];
  const invoices = invoiceData?.data?.invoices || [];
  const invoiceTotal = invoiceData?.data?.total || 0;

  const handleInvoiceExport = async () => {
    try {
      setExporting(true);
      const response = await axiosInstance.get('/superadmin/billing/invoices/export', {
        params: invoiceParams,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFilenameFromDisposition(response.headers['content-disposition'], 'billing-invoices.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('Invoice export downloaded');
    } catch (error) {
      message.error('Unable to export invoices');
    } finally {
      setExporting(false);
    }
  };

  const pieData = plans.map((p) => ({
    name: p.plan,
    value: p.revenue,
    count: p.count,
  }));

  const pieColors = plans.map((p) => PLAN_COLORS[p.plan]?.text || '#6b6b8a');

  const topOrgCols = [
    { title: '#', dataIndex: 'rank', width: 36, render: (v) => <MonoValue value={v} color="muted" size="xs" /> },
    { title: 'Org', dataIndex: 'name', render: (v) => <span className="text-xs text-[#e8e8f0]">{v}</span> },
    { title: 'Plan', dataIndex: 'plan', width: 110, render: (v) => <PlanBadge plan={v} /> },
    { title: 'Emps', dataIndex: 'employeeCount', width: 60, align: 'right', render: (v) => <MonoValue value={formatNumber(v)} color="muted" size="xs" /> },
    { title: 'MRR', dataIndex: 'mrr', width: 110, align: 'right', render: (v) => <span className="font-['JetBrains_Mono'] text-xs text-[#ffaa00]">{formatINR(v)}</span> },
  ];

  const churnCols = [
    { title: 'Org', dataIndex: 'name', render: (v) => <span className="text-xs text-[#e8e8f0]">{v}</span> },
    { title: 'Lost MRR', dataIndex: 'mrr', width: 100, align: 'right', render: (v) => <span className="font-['JetBrains_Mono'] text-xs text-[#ff3366]">-{formatINR(v)}</span> },
    { title: 'Churned', dataIndex: 'cancelledAt', width: 100, render: (v) => <MonoValue value={formatDate(v)} color="muted" size="xs" /> },
  ];

  const invoiceCols = [
    { title: 'Invoice', dataIndex: 'invoiceNo', width: 110, render: (v) => <MonoValue value={v} color="cyan" size="xs" /> },
    { title: 'Org', dataIndex: 'orgName', render: (v) => <span className="text-xs text-[#e8e8f0]">{v}</span> },
    { title: 'Plan', dataIndex: 'plan', width: 100, render: (v) => v ? <PlanBadge plan={v} /> : <span className="text-xs text-[#6b6b8a]">N/A</span> },
    { title: 'Date', dataIndex: 'date', width: 100, render: (v) => <MonoValue value={formatDate(v)} color="muted" size="xs" /> },
    { title: 'Amount', dataIndex: 'amount', width: 110, align: 'right', render: (v) => <span className="font-['JetBrains_Mono'] text-xs text-[#ffaa00]">{formatINR(v)}</span> },
    { title: 'Status', dataIndex: 'status', width: 90, render: (v) => <StatusChip status={v} /> },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Billing" subtitle="Estimated recurring revenue and collected payment records" />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Estimated MRR', rawValue: formatMRR(summary.estimatedMrr ?? summary.mrr), accentColor: 'amber' },
          { label: 'Estimated ARR', rawValue: formatMRR(summary.estimatedArr ?? (summary.mrr || 0) * 12), accentColor: 'amber' },
          { label: 'Paying Orgs', value: summary.payingOrgs, accentColor: 'green' },
          { label: 'ARPU', rawValue: formatMRR(summary.arpu), accentColor: 'cyan' },
          { label: 'Verified Payments', value: summary.verifiedPaymentCount, accentColor: 'green' },
          { label: 'Collected MTD', rawValue: formatMRR(summary.currentMonthRevenue), accentColor: 'green' },
          { label: 'Est. Churn MTD', rawValue: formatMRR(summary.estimatedChurnedMrrMTD ?? summary.churnedRevMTD), accentColor: 'red' },
        ].map((c) => (
          <StatCard
            key={c.label}
            label={c.label}
            value={summaryLoading ? 0 : (c.value || 0)}
            rawValue={summaryLoading ? null : c.rawValue}
            accentColor={c.accentColor}
            animate={!summaryLoading && !c.rawValue}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-[#e8e8f0] text-sm font-sans font-medium">Estimated MRR Growth</h3>
            <p className="text-[#6b6b8a] text-xs">Backfilled from current org plan and active employee counts</p>
          </div>
          {mrrLoading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-amber border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={mrrHist} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffaa00" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ffaa00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" vertical={false} />
                <XAxis dataKey="month" stroke="#6b6b8a" tick={{ fill: '#6b6b8a', fontSize: 11, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b6b8a" tick={{ fill: '#6b6b8a', fontSize: 11, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} tickFormatter={formatMRR} width={64} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [formatMRR(v), 'MRR']} />
                <Area type="monotone" dataKey="mrr" stroke="#ffaa00" strokeWidth={2} fill="url(#mrrGrad)" dot={false} activeDot={{ r: 4, fill: '#ffaa00', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-[#e8e8f0] text-sm font-sans font-medium">Estimated Billing by Plan</h3>
            <p className="text-[#6b6b8a] text-xs">Current plan and employee-count estimate</p>
          </div>
          {planLoading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <DarkPieChart
                data={pieData}
                colors={pieColors}
                height={170}
                showLegend={false}
                tooltipFormatter={(v, name) => [formatINR(v), name]}
              />
              <div className="space-y-2 mt-2">
                {plans.map((plan, index) => (
                  <div
                    key={plan.plan}
                    className="flex items-center justify-between gap-3 rounded-md border border-[#1e1e35] bg-[#161625] px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: pieColors[index] || '#6b6b8a' }}
                      />
                      <span className="text-[#e8e8f0] text-xs font-sans font-medium truncate capitalize">
                        {plan.plan}
                      </span>
                      <span className="text-[#8a8aa8] text-[10px] font-['JetBrains_Mono']">
                        {formatNumber(plan.count)} orgs
                      </span>
                    </div>
                    <span className="font-['JetBrains_Mono'] text-sm font-bold text-[#ffaa00]">
                      {formatINR(plan.revenue)}
                    </span>
                  </div>
                ))}
                {plans.length === 0 && (
                  <div className="rounded-md border border-[#1e1e35] bg-[#161625] px-3 py-4 text-center text-xs text-[#8a8aa8]">
                    No plan revenue yet
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e35]">
            <h3 className="text-[#e8e8f0] text-sm font-sans font-medium">Top Orgs by Estimated MRR</h3>
          </div>
          <Table columns={topOrgCols} dataSource={topOrgs} rowKey="id" size="small" loading={topLoading} pagination={false} />
        </div>

        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e35]">
            <h3 className="text-[#e8e8f0] text-sm font-sans font-medium">Recent Churn</h3>
            <p className="text-[#6b6b8a] text-xs">Cancelled orgs this month</p>
          </div>
          <Table columns={churnCols} dataSource={churned} rowKey="id" size="small" loading={churnLoading} pagination={false} />
        </div>
      </div>

      <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e1e35]">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-[#e8e8f0] text-sm font-sans font-medium">Payment Records</h3>
              <p className="text-[#6b6b8a] text-xs mt-0.5">Gateway payment records, not full invoice lifecycle records</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchInvoices()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans text-[#6b6b8a] hover:text-[#e8e8f0] bg-[#161625] border border-[#1e1e35] hover:border-[#00d4ff]/30 transition-colors"
              >
                <ReloadOutlined className={invoiceFetching ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={handleInvoiceExport}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans text-[#080810] bg-[#00d4ff] hover:bg-[#33ddff] disabled:opacity-50 transition-colors"
              >
                <DownloadOutlined />
                Export CSV
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_150px_150px_130px_260px] gap-2">
            <Input.Search
              value={invoiceSearch}
              onChange={(event) => {
                setInvoiceSearch(event.target.value);
                setInvoicePage(1);
              }}
              allowClear
              placeholder="Search organisation"
              size="small"
            />
            <Select value={invoiceStatus} onChange={(value) => { setInvoiceStatus(value); setInvoicePage(1); }} options={STATUS_OPTIONS} size="small" />
            <Select value={invoicePlan} onChange={(value) => { setInvoicePlan(value); setInvoicePage(1); }} options={PLAN_OPTIONS} size="small" />
            <Select value={invoiceCurrency} onChange={(value) => { setInvoiceCurrency(value); setInvoicePage(1); }} options={CURRENCY_OPTIONS} size="small" />
            <RangePicker value={invoiceDates} onChange={(value) => { setInvoiceDates(value); setInvoicePage(1); }} size="small" />
          </div>
        </div>
        <Table
          columns={invoiceCols}
          dataSource={invoices}
          rowKey="id"
          size="small"
          loading={invoiceLoading || invoiceFetching}
          pagination={{
            current: invoicePage,
            pageSize: 20,
            total: invoiceTotal,
            size: 'small',
            showSizeChanger: false,
          }}
          onChange={(pagination) => setInvoicePage(pagination.current || 1)}
          onRow={(record) => ({
            onClick: () => setSelectedInvoice(record),
          })}
        />
      </div>

      <Drawer
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        width={520}
        title="Payment Record"
        styles={{ body: { background: '#0f0f1a' }, header: { background: '#0f0f1a', borderBottomColor: '#1e1e35' } }}
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <MonoValue value={selectedInvoice.invoiceNo} color="cyan" size="sm" />
              <StatusChip status={selectedInvoice.status} />
            </div>
            <div className="bg-[#161625] border border-[#1e1e35] rounded-lg p-4">
              <DetailRow label="Organisation" value={selectedInvoice.orgName} />
              <DetailRow label="Plan" value={selectedInvoice.plan} />
              <DetailRow label="Date" value={formatDate(selectedInvoice.date)} mono />
              <DetailRow label="Amount" value={`${formatINR(selectedInvoice.amount)} ${selectedInvoice.currency || 'INR'}`} mono />
              <DetailRow label="Source" value={selectedInvoice.source} mono />
            </div>
            <div className="bg-[#161625] border border-[#1e1e35] rounded-lg p-4">
              <DetailRow label="Razorpay Order" value={selectedInvoice.razorpayOrderId} mono />
              <DetailRow label="Razorpay Payment" value={selectedInvoice.razorpayPaymentId} mono />
              <DetailRow label="Gateway Status" value={selectedInvoice.gatewayStatus} mono />
              <DetailRow label="Error Code" value={selectedInvoice.errorCode} mono />
              <DetailRow label="Error Message" value={selectedInvoice.errorMessage} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
