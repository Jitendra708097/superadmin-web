/**
 * @module QueuePanel
 * @description Single Bull Queue status card — waiting, active, completed, failed counts.
 *              Shows Retry All button when failed count > 0.
 */

import { Modal, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useRetryAllFailedMutation } from '@store/api/healthApi.js';
import { parseError } from '@utils/errorHandler.js';

const METRIC_CONFIG = [
  { key: 'waiting',   label: 'Waiting', colorClass: 'text-[#00d4ff]', bgClass: 'bg-[#00d4ff]/10 border-[#00d4ff]/20' },
  { key: 'active',    label: 'Active',  colorClass: 'text-[#00ff88]', bgClass: 'bg-[#00ff88]/10 border-[#00ff88]/20' },
  { key: 'completed', label: 'Done',    colorClass: 'text-[#e8e8f0]', bgClass: 'bg-[#e8e8f0]/8 border-[#e8e8f0]/15' },
  { key: 'failed',    label: 'Failed',  colorClass: 'text-[#ff3366]', bgClass: 'bg-[#ff3366]/10 border-[#ff3366]/20' },
];

export default function QueuePanel({ queue, onOpen }) {
  const [retryAll, { isLoading }] = useRetryAllFailedMutation();

  const handleRetryAll = async (event) => {
    event?.stopPropagation?.();
    Modal.confirm({
      title: `Retry all failed jobs in ${queue.name}?`,
      content: `${queue.failed || 0} failed job(s) will be queued again. This operation is audited.`,
      okText: 'Retry All',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          await retryAll({ queue: queue.name }).unwrap();
          message.success(`Retrying all failed jobs in ${queue.name}`);
        } catch (err) {
          message.error(parseError(err));
        }
      },
    });
  };

  const hasFailed = (queue.failed || 0) > 0;
  const isDegraded = queue.status === 'degraded';

  return (
    <div
      onClick={() => onOpen?.(queue)}
      className={`
      bg-[#0f0f1a] border rounded-lg p-4
      transition-all duration-200 cursor-pointer
      ${hasFailed || isDegraded
        ? 'border-[#ff3366]/30 shadow-[0_0_12px_rgba(255,51,102,0.06)]'
        : 'border-[#1e1e35] hover:border-[#00d4ff]/20'
      }
    `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-['JetBrains_Mono'] text-xs text-[#e8e8f0] font-semibold uppercase tracking-wider">
            {queue.name}
          </div>
          <div className={`text-[10px] font-['JetBrains_Mono'] mt-0.5 ${
            hasFailed || isDegraded ? 'text-[#ff3366]' : 'text-[#00ff88]'
          }`}>
            {isDegraded ? 'Degraded' : hasFailed ? `${queue.failed} failed` : 'Healthy'}
          </div>
        </div>
        {hasFailed && (
          <button
            onClick={handleRetryAll}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px]
                       font-['JetBrains_Mono'] bg-[#ff3366]/10 border border-[#ff3366]/30
                       text-[#ff3366] hover:bg-[#ff3366]/20 transition-colors
                       disabled:opacity-50"
          >
            <ReloadOutlined className={`text-[10px] ${isLoading ? 'animate-spin' : ''}`} />
            Retry All
          </button>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-2">
        {METRIC_CONFIG.map(({ key, label, colorClass, bgClass }) => (
          <div key={key} className={`text-center rounded-md border px-1.5 py-2 ${bgClass}`}>
            <div className={`font-['JetBrains_Mono'] text-lg leading-none font-bold ${colorClass}`}>
              {queue[key] ?? 0}
            </div>
            <div className="text-[9px] text-[#b8b8c8] uppercase tracking-wider mt-1.5 font-sans font-medium">
              {label}
            </div>
          </div>
        ))}
      </div>
      {isDegraded && queue.error && (
        <div className="mt-3 text-[10px] text-[#ffaa00] font-sans truncate" title={queue.error}>
          {queue.error}
        </div>
      )}
    </div>
  );
}
