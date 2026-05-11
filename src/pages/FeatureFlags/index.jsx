/**
 * @module FeatureFlagsPage
 * @description Feature flag control panel - global toggles and per-org overrides.
 *              Cards for each flag. Org search to add overrides.
 */

import { useState } from 'react';
import { Drawer, Modal, Switch, Select, Table, message, Tooltip } from 'antd';
import { AuditOutlined, CloseOutlined } from '@ant-design/icons';
import {
  useGetAllFlagsQuery,
  useSetGlobalFlagMutation,
  useSetOrgFlagOverrideMutation,
  useRemoveOrgFlagOverrideMutation,
} from '@store/api/featureFlagApi.js';
import { useSearchOrgsQuery } from '@store/api/orgApi.js';
import { useGetAuditLogsQuery } from '@store/api/auditApi.js';
import { useDebounce } from '@hooks/useDebounce.js';
import { FEATURE_FLAGS } from '@utils/constants.js';
import { parseError } from '@utils/errorHandler.js';
import PageHeader from '@components/common/PageHeader.jsx';
import MonoValue from '@components/common/MonoValue.jsx';
import { formatDateTime } from '@utils/formatters.js';

const TIER_COLORS = {
  V2: { bg: 'bg-[#00d4ff]/10', text: 'text-[#00d4ff]', border: 'border-[#00d4ff]/20' },
  V3: { bg: 'bg-[#00ff88]/10', text: 'text-[#00ff88]', border: 'border-[#00ff88]/20' },
  Internal: { bg: 'bg-[#ffaa00]/10', text: 'text-[#ffaa00]', border: 'border-[#ffaa00]/20' },
};

function FlagCard({ flagDef, flagState, onToggleGlobal, onAddOverride, onBulkOverride, onRemoveOverride, onViewHistory }) {
  const [orgSearch, setOrgSearch] = useState('');
  const [overrideEnabled, setOverrideEnabled] = useState(true);
  const debouncedQ = useDebounce(orgSearch, 300);

  const { data: searchData } = useSearchOrgsQuery(
    { q: debouncedQ },
    { skip: debouncedQ.length < 2 }
  );

  const orgOptions = (searchData?.data?.orgs || []).map((o) => ({
    value: o.id,
    label: `${o.name} (@${o.slug})`,
    org: o,
  }));

  const tierCfg = TIER_COLORS[flagDef.tier] || TIER_COLORS.V2;
  const isEnabled = flagState?.globalEnabled ?? false;
  const overrides = flagState?.orgOverrides ?? [];
  const rolloutPercent = orgOptions.length ? Math.round((overrides.length / Math.max(orgOptions.length, overrides.length, 1)) * 100) : null;

  return (
    <div className={`bg-[#0f0f1a] border rounded-lg p-5 transition-all duration-200 ${isEnabled ? 'border-[#00d4ff]/20' : 'border-[#1e1e35]'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-['JetBrains_Mono'] text-xs font-semibold text-[#e8e8f0] uppercase tracking-wider">
              {flagDef.key}
            </span>
            <span className={`text-[9px] font-['JetBrains_Mono'] px-1.5 py-0.5 rounded border ${tierCfg.bg} ${tierCfg.text} ${tierCfg.border}`}>
              {flagDef.tier}
            </span>
          </div>
          <p className="text-[#6b6b8a] text-xs font-sans">{flagDef.description}</p>
        </div>
        <div className="ml-3 flex-shrink-0">
          <Tooltip title={isEnabled ? 'Disable globally' : 'Enable globally'}>
            <Switch checked={isEnabled} onChange={(val) => onToggleGlobal(flagDef.key, val)} size="small" />
          </Tooltip>
        </div>
      </div>

      <div className="text-[10px] font-['JetBrains_Mono'] mb-3">
        <span className="text-[#6b6b8a]">Global: </span>
        <span className={isEnabled ? 'text-[#00ff88]' : 'text-[#6b6b8a]'}>
          {isEnabled ? 'Enabled' : 'Disabled'}
        </span>
        {rolloutPercent !== null && (
          <span className="text-[#6b6b8a] ml-2">Search rollout: {rolloutPercent}%</span>
        )}
      </div>

      <div className="border-t border-[#1e1e35] pt-3">
        <div className="text-[9px] text-[#6b6b8a] uppercase tracking-[0.15em] mb-2">
          Org Overrides ({overrides.length})
        </div>

        {overrides.map((ov) => (
          <div key={ov.orgId} className="flex items-center justify-between py-1.5 border-b border-[#1e1e35] last:border-0">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ov.enabled ? 'bg-[#00ff88]' : 'bg-[#ff3366]'}`} />
              <span className="text-[#e8e8f0] text-xs">{ov.orgName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-['JetBrains_Mono'] ${ov.enabled ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                {ov.enabled ? 'ON' : 'OFF'}
              </span>
              <button
                onClick={() => onRemoveOverride(flagDef.key, ov.orgId)}
                className="text-[#6b6b8a] hover:text-[#ff3366] transition-colors"
              >
                <CloseOutlined className="text-[10px]" />
              </button>
            </div>
          </div>
        ))}

        <div className="flex gap-2 mt-2">
          <Select
            showSearch
            placeholder="Add org override..."
            onSearch={setOrgSearch}
            filterOption={false}
            onChange={(_, opt) => {
              if (opt?.org) {
                onAddOverride(flagDef.key, opt.org, overrideEnabled);
                setOrgSearch('');
              }
            }}
            options={orgOptions}
            style={{ flex: 1 }}
            size="small"
            notFoundContent={
              debouncedQ.length < 2
                ? <span className="text-[#6b6b8a] text-xs px-2">Type to search...</span>
                : null
            }
          />
          <Switch
            checked={overrideEnabled}
            onChange={setOverrideEnabled}
            size="small"
            checkedChildren="ON"
            unCheckedChildren="OFF"
          />
        </div>
        <div className="flex items-center justify-between gap-2 mt-3">
          <button
            type="button"
            onClick={() => onBulkOverride(flagDef.key, orgOptions.map((option) => option.org), overrideEnabled)}
            disabled={orgOptions.length === 0}
            className="text-[10px] font-['JetBrains_Mono'] text-[#6b6b8a] hover:text-[#00d4ff] disabled:opacity-40"
          >
            Apply to current search ({orgOptions.length})
          </button>
          <button
            type="button"
            onClick={() => onViewHistory(flagDef.key)}
            className="flex items-center gap-1 text-[10px] font-['JetBrains_Mono'] text-[#6b6b8a] hover:text-[#e8e8f0]"
          >
            <AuditOutlined className="text-[10px]" />
            History
          </button>
        </div>
      </div>
    </div>
  );
}

function FlagHistoryDrawer({ flagKey, open, onClose }) {
  const { data, isLoading } = useGetAuditLogsQuery(
    { action: 'FEATURE_FLAG_CHANGED', entityId: flagKey, limit: 25 },
    { skip: !open || !flagKey }
  );
  const logs = data?.data?.logs || [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={620}
      title={<span className="text-[#e8e8f0] text-sm">Flag History: {flagKey}</span>}
      styles={{ body: { background: '#0f0f1a' }, header: { background: '#0f0f1a', borderBottomColor: '#1e1e35' } }}
    >
      <Table
        columns={[
          { title: 'Time', dataIndex: 'createdAt', width: 150, render: (value) => <MonoValue value={formatDateTime(value)} color="muted" size="xs" /> },
          { title: 'By', dataIndex: 'performedByName', width: 140, render: (value) => <span className="text-xs text-[#e8e8f0]">{value || 'System'}</span> },
          { title: 'Target', dataIndex: ['metadata', 'entityType'], render: (value, row) => <span className="text-xs text-[#6b6b8a]">{value || row.metadata?.entityId}</span> },
        ]}
        dataSource={logs}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 8, size: 'small' }}
      />
    </Drawer>
  );
}

export default function FeatureFlagsPage() {
  const { data: flagsData, isLoading } = useGetAllFlagsQuery();
  const [setGlobal] = useSetGlobalFlagMutation();
  const [setOverride] = useSetOrgFlagOverrideMutation();
  const [removeOverride] = useRemoveOrgFlagOverrideMutation();
  const [historyFlag, setHistoryFlag] = useState(null);

  const flagsState = flagsData?.data?.flags || {};
  const flagEntries = FEATURE_FLAGS.map((flagDef) => ({
    definition: flagDef,
    state: flagsState[flagDef.key] || {},
  }));
  const enabledGlobalCount = flagEntries.filter((entry) => Boolean(entry.state.globalEnabled)).length;
  const overrideCount = flagEntries.reduce((sum, entry) => sum + Number(entry.state.orgOverrides?.length || 0), 0);
  const internalCount = FEATURE_FLAGS.filter((flag) => flag.tier === 'Internal').length;

  const handleToggleGlobal = async (key, enabled) => {
    try {
      Modal.confirm({
        title: `${enabled ? 'Enable' : 'Disable'} ${key} globally?`,
        content: 'Global changes affect every organisation without an override. Prefer org overrides for staged rollout.',
        okText: enabled ? 'Enable globally' : 'Disable globally',
        okButtonProps: { danger: !enabled },
        onOk: async () => {
          await setGlobal({ key, enabled }).unwrap();
          message.success(`${key} ${enabled ? 'enabled' : 'disabled'} globally`);
        },
      });
    } catch (err) {
      message.error(parseError(err));
    }
  };

  const handleAddOverride = async (key, org, enabled) => {
    try {
      await setOverride({ key, orgId: org.id, enabled }).unwrap();
      message.success(`Override set for ${org.name}`);
    } catch (err) {
      message.error(parseError(err));
    }
  };

  const handleRemoveOverride = async (key, orgId) => {
    try {
      await removeOverride({ key, orgId }).unwrap();
      message.success('Override removed');
    } catch (err) {
      message.error(parseError(err));
    }
  };

  const handleBulkOverride = async (key, orgs, enabled) => {
    if (!orgs.length) return;
    try {
      await Promise.all(orgs.map((org) => setOverride({ key, orgId: org.id, enabled }).unwrap()));
      message.success(`Override applied to ${orgs.length} organisation${orgs.length === 1 ? '' : 's'}`);
    } catch (err) {
      message.error(parseError(err));
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Feature Flags"
        subtitle="Global toggles and per-org overrides"
        count={FEATURE_FLAGS.length}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg px-5 py-4">
          <div className="text-[#6b6b8a] text-[10px] uppercase tracking-[0.15em] mb-2">Enabled Globally</div>
          <div className="font-['JetBrains_Mono'] text-2xl font-semibold text-[#00d4ff]">{enabledGlobalCount}</div>
        </div>
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg px-5 py-4">
          <div className="text-[#6b6b8a] text-[10px] uppercase tracking-[0.15em] mb-2">Org Overrides</div>
          <div className="font-['JetBrains_Mono'] text-2xl font-semibold text-[#00ff88]">{overrideCount}</div>
        </div>
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg px-5 py-4">
          <div className="text-[#6b6b8a] text-[10px] uppercase tracking-[0.15em] mb-2">Internal Flags</div>
          <div className="font-['JetBrains_Mono'] text-2xl font-semibold text-[#ffaa00]">{internalCount}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {FEATURE_FLAGS.map((_, i) => (
            <div key={i} className="h-52 bg-[#0f0f1a] border border-[#1e1e35] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {flagEntries.map(({ definition, state }) => (
            <FlagCard
              key={definition.key}
              flagDef={definition}
              flagState={state}
              onToggleGlobal={handleToggleGlobal}
              onAddOverride={handleAddOverride}
              onBulkOverride={handleBulkOverride}
              onRemoveOverride={handleRemoveOverride}
              onViewHistory={setHistoryFlag}
            />
          ))}
        </div>
      )}
      <FlagHistoryDrawer flagKey={historyFlag} open={!!historyFlag} onClose={() => setHistoryFlag(null)} />
    </div>
  );
}
