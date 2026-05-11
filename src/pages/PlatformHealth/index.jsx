/**
 * @module PlatformHealthPage
 * @description Full platform health monitoring — DB/Redis/API status,
 *              Bull Queue panels, failed jobs table, API metrics charts.
 *              Polls every 15s. Red alert on any failure.
 */

import { useMemo, useState } from 'react';
import { DatePicker, Drawer, Input, Select, Table } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
  useGetPlatformHealthQuery, useGetQueueStatusQuery,
  useGetFailedJobsQuery, useGetApiMetricsQuery,
  useRetryJobMutation,
} from '@store/api/healthApi.js';
import { POLL_HEALTH, POLL_QUEUES, QUEUE_NAMES } from '@utils/constants.js';
import { formatDateTime, formatProcessUptime, formatUptime } from '@utils/formatters.js';
import { parseError } from '@utils/errorHandler.js';
import { message } from 'antd';

import PageHeader  from '@components/common/PageHeader.jsx';
import StatusDot   from '@components/common/StatusDot.jsx';
import MonoValue   from '@components/common/MonoValue.jsx';
import QueuePanel  from './QueuePanel.jsx';
import DarkLineChart from '@components/charts/DarkLineChart.jsx';
import { COLORS } from '@theme/colors.js';

const { RangePicker } = DatePicker;

const FAILED_QUEUE_OPTIONS = [
  { label: 'All queues', value: '' },
  ...QUEUE_NAMES.map((name) => ({ label: name, value: name })),
];

function HealthValue({ value, suffix = '', tone = 'white' }) {
  const colorClass = {
    white: 'text-[#e8e8f0]',
    muted: 'text-[#8a8aa8]',
    cyan: 'text-[#00d4ff]',
    amber: 'text-[#ffaa00]',
    red: 'text-[#ff3366]',
    green: 'text-[#00ff88]',
  }[tone] || 'text-[#e8e8f0]';

  const displayValue = value == null || value === '' ? 'N/A' : `${value}${suffix}`;

  return (
    <span className={`font-['JetBrains_Mono'] text-xs font-semibold ${colorClass}`}>
      {displayValue}
    </span>
  );
}

export default function PlatformHealthPage() {
  const [serviceDetail, setServiceDetail] = useState(null);
  const [queueDetail, setQueueDetail] = useState(null);
  const [failedQueue, setFailedQueue] = useState('');
  const [failedSearch, setFailedSearch] = useState('');
  const [failedDates, setFailedDates] = useState(null);
  const { data: healthData, isLoading: healthLoading, refetch } =
    useGetPlatformHealthQuery(undefined, { pollingInterval: POLL_HEALTH });

  const { data: queueData, isLoading: queueLoading } =
    useGetQueueStatusQuery(undefined, { pollingInterval: POLL_QUEUES });

  const { data: failedData, isLoading: failedLoading } =
    useGetFailedJobsQuery(undefined, { pollingInterval: POLL_QUEUES });

  const { data: metricsData, isLoading: metricsLoading } =
    useGetApiMetricsQuery({ hours: 24 });

  const [retryJob] = useRetryJobMutation();

  const health    = healthData?.data  || {};
  const queues    = queueData?.data   || QUEUE_NAMES.map((n) => ({ name: n, waiting: 0, active: 0, completed: 0, failed: 0 }));
  const failed    = failedData?.data?.jobs || [];
  const metrics   = metricsData?.data || {};
  const apiMetrics = health.apiMetrics || {};
  const runtime = health.runtime || {};
  const slowEndpoints = apiMetrics.slowEndpoints || [];
  const filteredFailed = useMemo(() => failed.filter((job) => {
    if (failedQueue && job.queue !== failedQueue) return false;
    if (failedSearch && !String(job.error || '').toLowerCase().includes(failedSearch.toLowerCase())) return false;
    if (failedDates?.[0] && new Date(job.failedAt) < failedDates[0].startOf('day').toDate()) return false;
    if (failedDates?.[1] && new Date(job.failedAt) > failedDates[1].endOf('day').toDate()) return false;
    return true;
  }), [failed, failedQueue, failedSearch, failedDates]);

  const { text: availabilityText, color: availabilityColor } = formatUptime(health.availabilityPercent ?? health.uptime ?? 99.9);
  const processUptimeText = formatProcessUptime(health.processUptimeSeconds);

  const handleRetry = async (job) => {
    try {
      await retryJob({ queue: job.queue, jobId: job.id }).unwrap();
      message.success(`Job ${job.id} queued for retry`);
    } catch (err) {
      message.error(parseError(err));
    }
  };

  const failedCols = [
    { title: 'Job ID',  dataIndex: 'id',         width: 120,
      render: (v) => <MonoValue value={v} color="cyan" size="xs" /> },
    { title: 'Queue',   dataIndex: 'queue',       width: 120,
      render: (v) => <span className="font-['JetBrains_Mono'] text-xs text-[#ffaa00]">{v}</span> },
    { title: 'Error',   dataIndex: 'error',
      render: (v) => <span className="text-xs text-[#ff3366] truncate max-w-[300px] block">{v}</span> },
    { title: 'Failed',  dataIndex: 'failedAt',    width: 150,
      render: (v) => <MonoValue value={formatDateTime(v)} color="muted" size="xs" /> },
    { title: '',        key: 'retry',             width: 60,
      render: (_, r) => (
        <button
          onClick={() => handleRetry(r)}
          className="flex items-center gap-1 text-[10px] font-['JetBrains_Mono']
                     text-[#00d4ff] hover:text-[#33ddff] transition-colors"
        >
          <ReloadOutlined className="text-[10px]" /> Retry
        </button>
      ),
    },
  ];

  const services = [
    { key: 'database', label: 'PostgreSQL', latency: health.dbLatency, reason: health.reasons?.database, detail: health.services?.database },
    { key: 'redis',    label: 'Redis Cache', latency: health.redisLatency, reason: health.reasons?.redis, detail: health.services?.redis },
    { key: 'api',      label: 'API Server',  latency: apiMetrics.p95, reason: health.reasons?.api, detail: health.services?.api },
  ];
  const hasHealthIssue = services.some((service) => health[service.key] && health[service.key] !== 'healthy');

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Platform Health"
        subtitle="Real-time infrastructure monitoring"
        actions={
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans
                       text-[#6b6b8a] hover:text-[#e8e8f0] bg-[#161625] border border-[#1e1e35]
                       hover:border-[#00d4ff]/30 transition-colors"
          >
            <ReloadOutlined />
            Refresh
          </button>
        }
      />

      {hasHealthIssue && (
        <div className="bg-[#ffaa00]/10 border border-[#ffaa00]/30 rounded-lg p-4 mb-6">
          <div className="text-[#ffaa00] text-sm font-sans font-semibold">Platform degradation detected</div>
          <div className="text-[#6b6b8a] text-xs mt-1">
            {services
              .filter((service) => health[service.key] && health[service.key] !== 'healthy')
              .map((service) => `${service.label}: ${service.reason || health[service.key]}`)
              .join(' | ')}
          </div>
          {health.impactedFeatures?.length > 0 && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              {health.impactedFeatures.map((item) => (
                <div key={item} className="text-[#e8e8f0] text-[11px] bg-[#161625] border border-[#ffaa00]/20 rounded px-3 py-2">
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top status bar */}
      <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-4 mb-6">
        <div className="flex items-center gap-8 flex-wrap">
          {services.map(({ key, label, latency, detail }) => (
            <button
              type="button"
              key={key}
              onClick={() => setServiceDetail(detail || { name: label, status: health[key], latency })}
              className="flex items-center gap-3 text-left rounded-md px-2 py-1 hover:bg-[#161625] transition-colors"
            >
              <StatusDot status={health[key] || 'healthy'} showLabel={false} />
              <div>
                <div className="text-[#e8e8f0] text-xs font-sans">{label}</div>
                <HealthValue value={latency} suffix="ms" tone={health[key] === 'healthy' ? 'cyan' : 'amber'} />
                {health[key] !== 'healthy' && (
                  <div className="text-[#ffaa00] text-[10px] max-w-[220px] truncate">
                    {services.find((service) => service.key === key)?.reason || 'Needs attention'}
                  </div>
                )}
              </div>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {health.checkedAt && (
              <>
                <span className="text-[#6b6b8a] text-xs font-sans">Checked</span>
                <HealthValue value={formatDateTime(health.checkedAt)} tone="white" />
              </>
            )}
            <span className="text-[#6b6b8a] text-xs font-sans">Availability</span>
            <span className={`font-['JetBrains_Mono'] text-sm font-bold ${availabilityColor}`}>
              {availabilityText}
            </span>
            <span className="text-[#6b6b8a] text-xs font-sans">Process</span>
            <HealthValue value={processUptimeText} tone="white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'API p50', value: apiMetrics.p50, suffix: 'ms', tone: 'cyan' },
          { label: 'API p95', value: apiMetrics.p95, suffix: 'ms', tone: apiMetrics.p95 >= 3000 ? 'amber' : 'cyan' },
          { label: 'API p99', value: apiMetrics.p99, suffix: 'ms', tone: apiMetrics.p99 >= 5000 ? 'amber' : 'cyan' },
          { label: 'Error Rate', value: apiMetrics.errorRate, suffix: '%', tone: apiMetrics.errorRate >= 10 ? 'red' : 'green' },
        ].map((metric) => (
          <div key={metric.label} className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg px-4 py-3">
            <div className="text-[#8a8aa8] text-[10px] uppercase tracking-wider font-sans mb-1">
              {metric.label}
            </div>
            <HealthValue value={metric.value} suffix={metric.suffix} tone={metric.tone} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Memory RSS', value: runtime.memoryRssMb, suffix: 'MB', tone: 'cyan' },
          { label: 'Heap Used', value: runtime.heapUsedMb, suffix: 'MB', tone: 'cyan' },
          { label: 'Event Loop Lag', value: runtime.eventLoopLagMs, suffix: 'ms', tone: runtime.eventLoopLagMs > 200 ? 'amber' : 'green' },
          { label: 'Total Requests', value: apiMetrics.totalRequests, suffix: '', tone: 'white' },
        ].map((metric) => (
          <div key={metric.label} className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg px-4 py-3">
            <div className="text-[#8a8aa8] text-[10px] uppercase tracking-wider font-sans mb-1">
              {metric.label}
            </div>
            <HealthValue value={metric.value} suffix={metric.suffix} tone={metric.tone} />
          </div>
        ))}
      </div>

      {/* Queue panels */}
      <div className="mb-6">
        <h3 className="text-[#e8e8f0] text-sm font-sans font-medium mb-3">Bull Queues</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {queueLoading
            ? QUEUE_NAMES.map((n) => (
                <div key={n} className="h-28 bg-[#161625] rounded-lg animate-pulse" />
              ))
            : queues.map((q) => <QueuePanel key={q.name} queue={q} onOpen={setQueueDetail} />)
          }
        </div>
      </div>

      {/* Failed jobs */}
      {failed.length > 0 && (
        <div className="bg-[#0f0f1a] border border-[#ff3366]/25 rounded-lg overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-[#ff3366]/20 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff3366] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff3366]" />
            </span>
            <h3 className="text-[#ff3366] text-sm font-sans font-medium">
              Failed Jobs — {failed.length}
            </h3>
          </div>
          <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-[160px_1fr_260px] gap-2">
            <Select value={failedQueue} onChange={setFailedQueue} options={FAILED_QUEUE_OPTIONS} size="small" />
            <Input.Search value={failedSearch} onChange={(event) => setFailedSearch(event.target.value)} allowClear placeholder="Filter error text" size="small" />
            <RangePicker value={failedDates} onChange={setFailedDates} size="small" />
          </div>
          <Table
            columns={failedCols}
            dataSource={filteredFailed}
            rowKey="id"
            size="small"
            loading={failedLoading}
            pagination={{ pageSize: 10, size: 'small' }}
          />
        </div>
      )}

      {/* API Metrics charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { title: 'Response Time (ms)', dataKey: 'p95', color: COLORS.chart.cyan,  data: metrics.responseTime },
          { title: 'Error Rate (%)',      dataKey: 'rate', color: COLORS.chart.red,   data: metrics.errorRate   },
          { title: 'Request Volume',      dataKey: 'count',color: COLORS.chart.green, data: metrics.requests    },
        ].map(({ title, dataKey, color, data }) => (
          <div key={title} className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-5">
            <h4 className="text-[#e8e8f0] text-xs font-sans font-medium mb-4">{title}</h4>
            {metricsLoading ? (
              <div className="h-32 bg-[#161625] rounded animate-pulse" />
            ) : (
              <DarkLineChart
                data={data || []}
                xKey="time"
                lines={[{ key: dataKey, color, label: title }]}
                height={130}
              />
            )}
          </div>
        ))}
      </div>

      {slowEndpoints.length > 0 && (
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg overflow-hidden mt-6">
          <div className="px-5 py-4 border-b border-[#1e1e35]">
            <h3 className="text-[#e8e8f0] text-sm font-sans font-medium">Slow Endpoints</h3>
            <p className="text-[#6b6b8a] text-xs mt-0.5">Top routes by p95 latency in the current metrics window</p>
          </div>
          <Table
            dataSource={slowEndpoints}
            rowKey={(row) => `${row.method}-${row.route}`}
            size="small"
            pagination={false}
            columns={[
              { title: 'Method', dataIndex: 'method', width: 90, render: (value) => <MonoValue value={value} color="cyan" size="xs" /> },
              { title: 'Route', dataIndex: 'route', render: (value) => <span className="text-xs text-[#e8e8f0]">{value}</span> },
              { title: 'Count', dataIndex: 'count', width: 90, align: 'right', render: (value) => <MonoValue value={value} color="muted" size="xs" /> },
              { title: 'p95', dataIndex: 'p95', width: 100, align: 'right', render: (value) => <HealthValue value={value} suffix="ms" tone={value >= 3000 ? 'amber' : 'cyan'} /> },
              { title: 'Errors', dataIndex: 'errorRate', width: 100, align: 'right', render: (value) => <HealthValue value={value} suffix="%" tone={value > 0 ? 'red' : 'green'} /> },
            ]}
          />
        </div>
      )}

      <Drawer
        open={!!serviceDetail}
        onClose={() => setServiceDetail(null)}
        width={460}
        title="Service Detail"
        styles={{ body: { background: '#0f0f1a' }, header: { background: '#0f0f1a', borderBottomColor: '#1e1e35' } }}
      >
        {serviceDetail && (
          <div className="space-y-4">
            <div className="bg-[#161625] border border-[#1e1e35] rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#e8e8f0] text-sm font-sans font-semibold">{serviceDetail.name}</span>
                <StatusDot status={serviceDetail.status || 'unknown'} />
              </div>
              <div className="flex justify-between text-xs"><span className="text-[#8a8aa8]">Latency</span><HealthValue value={serviceDetail.latency} suffix="ms" tone="cyan" /></div>
              <div className="flex justify-between text-xs"><span className="text-[#8a8aa8]">Checked</span><HealthValue value={formatDateTime(serviceDetail.checkedAt)} tone="white" /></div>
              <div className="text-xs text-[#ffaa00]">{serviceDetail.reason || 'No active issue reported'}</div>
            </div>
            {serviceDetail.detail && (
              <div className="bg-[#161625] border border-[#1e1e35] rounded-lg p-4 space-y-2">
                {Object.entries(serviceDetail.detail).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 text-xs">
                    <span className="text-[#8a8aa8]">{key}</span>
                    <span className="text-[#e8e8f0] font-['JetBrains_Mono']">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Drawer
        open={!!queueDetail}
        onClose={() => setQueueDetail(null)}
        width={460}
        title="Queue Detail"
        styles={{ body: { background: '#0f0f1a' }, header: { background: '#0f0f1a', borderBottomColor: '#1e1e35' } }}
      >
        {queueDetail && (
          <div className="bg-[#161625] border border-[#1e1e35] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#e8e8f0] text-sm font-['JetBrains_Mono'] uppercase">{queueDetail.name}</span>
              <StatusDot status={queueDetail.status || 'healthy'} />
            </div>
            {['waiting', 'active', 'completed', 'failed', 'delayed'].map((key) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-[#8a8aa8] capitalize">{key}</span>
                <HealthValue value={queueDetail[key] || 0} tone={key === 'failed' && queueDetail[key] > 0 ? 'red' : 'white'} />
              </div>
            ))}
            <div className="flex justify-between text-xs">
              <span className="text-[#8a8aa8]">Checked</span>
              <HealthValue value={formatDateTime(queueDetail.checkedAt)} tone="white" />
            </div>
            {queueDetail.error && <div className="text-xs text-[#ffaa00]">{queueDetail.error}</div>}
          </div>
        )}
      </Drawer>
    </div>
  );
}
