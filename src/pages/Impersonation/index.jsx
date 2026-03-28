/**
 * @module Impersonation/index
 * @description Superadmin impersonation management.
 *              Start a new session: select org → select admin → enter reason.
 *              Active session banner with elapsed timer and end button.
 *              Full session history table below.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation }                              from 'react-router-dom';
import { useDispatch, useSelector }                 from 'react-redux';
import { Table, Select, Tooltip, message, Input }   from 'antd';
import {
  UserSwitchOutlined,
  StopOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
}                                                   from '@ant-design/icons';

import {
  useStartImpersonationMutation,
  useEndImpersonationMutation,
  useGetActiveSessionQuery,
  useGetSessionHistoryQuery,
}                                                   from '@store/api/impersonateApi.js';
import { useGetOrgEmployeesQuery }                  from '@store/api/orgApi.js';
import { useSearchOrgsQuery }                       from '@store/api/orgApi.js';
import {
  selectImpersonation,
  setImpersonation,
  clearImpersonation,
}                                                   from '@store/uiSlice.js';
import { useDebounce }                              from '@hooks/useDebounce.js';
import { formatDateTime, formatTimeAgo, formatSessionDuration } from '@utils/formatters.js';
import { parseError }                               from '@utils/errorHandler.js';
import { PAGE_SIZE }                                from '@utils/constants.js';

import PageHeader   from '@components/common/PageHeader.jsx';
import MonoValue    from '@components/common/MonoValue.jsx';
import OrgStatusBadge from '@components/common/OrgStatusBadge.jsx';
import ConfirmModal from '@components/common/ConfirmModal.jsx';

const { TextArea } = Input;

/* ── Active session timer ─────────────────────────────────────── */
function useElapsedTimer(startedAt) {
  const [elapsed, setElapsed] = useState('00:00:00');
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!startedAt) return;

    const tick = () => {
      const diffMs   = Date.now() - new Date(startedAt).getTime();
      const h        = Math.floor(diffMs / 3600000);
      const m        = Math.floor((diffMs % 3600000) / 60000);
      const s        = Math.floor((diffMs % 60000)   / 1000);
      setElapsed(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [startedAt]);

  return elapsed;
}

/* ─────────────────────────────────────────────────────────────── */

export default function ImpersonationPage() {
  const dispatch  = useDispatch();
  const location  = useLocation();

  /* ── Active session from store ─────────────────────────────── */
  const activeSession = useSelector(selectImpersonation);
  const elapsed       = useElapsedTimer(activeSession?.startedAt);

  /* ── Start session form state ──────────────────────────────── */
  const [orgSearch,     setOrgSearch]     = useState(location.state?.orgName || '');
  const [selectedOrg,   setSelectedOrg]   = useState(
    location.state?.orgId ? { id: location.state.orgId, name: location.state.orgName } : null
  );
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [reason,        setReason]        = useState('');
  const [endConfirm,    setEndConfirm]    = useState(false);
  const [historyPage,   setHistoryPage]   = useState(1);

  const debouncedOrgSearch = useDebounce(orgSearch, 300);

  /* ── Queries ───────────────────────────────────────────────── */
  const { data: orgSearchData, isFetching: orgSearching } = useSearchOrgsQuery(
    { q: debouncedOrgSearch },
    { skip: debouncedOrgSearch.length < 2 || !!selectedOrg }
  );

  const { data: adminsData, isLoading: adminsLoading } = useGetOrgEmployeesQuery(
    { id: selectedOrg?.id, params: { role: 'admin', limit: 50 } },
    { skip: !selectedOrg?.id }
  );

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } =
    useGetSessionHistoryQuery({ page: historyPage, limit: PAGE_SIZE });

  /* ── Sync active session from server on mount ──────────────── */
  const { data: activeSessionData } = useGetActiveSessionQuery(undefined, {
    pollingInterval: 30000,
  });

  useEffect(() => {
    const serverSession = activeSessionData?.data;
    if (serverSession && !activeSession) {
      dispatch(setImpersonation({
        sessionId:   serverSession.id,
        orgId:       serverSession.orgId,
        orgName:     serverSession.orgName,
        adminName:   serverSession.adminName,
        startedAt:   serverSession.startedAt,
        token:       serverSession.token,
      }));
    }
  }, [activeSessionData, activeSession, dispatch]);

  /* ── Mutations ─────────────────────────────────────────────── */
  const [startImpersonation, { isLoading: starting }] = useStartImpersonationMutation();
  const [endImpersonation,   { isLoading: ending   }] = useEndImpersonationMutation();

  /* ── Derived ───────────────────────────────────────────────── */
  const orgResults = orgSearchData?.data?.orgs || [];
  const admins     = adminsData?.data?.employees?.filter((e) => e.role === 'admin') || [];
  const history    = historyData?.data?.sessions || [];
  const histTotal  = historyData?.data?.total    || 0;

  /* ── Handlers ──────────────────────────────────────────────── */
  const handleSelectOrg = useCallback((org) => {
    setSelectedOrg(org);
    setOrgSearch(org.name);
    setSelectedAdmin(null);
  }, []);

  const handleClearOrg = useCallback(() => {
    setSelectedOrg(null);
    setOrgSearch('');
    setSelectedAdmin(null);
  }, []);

  const handleStartSession = async () => {
    if (!selectedOrg)   { message.error('Select an organisation');  return; }
    if (!selectedAdmin) { message.error('Select an admin user');     return; }
    if (!reason.trim()) { message.error('Reason is required');       return; }

    try {
      const result = await startImpersonation({
        orgId:   selectedOrg.id,
        adminId: selectedAdmin,
        reason:  reason.trim(),
      }).unwrap();

      const session = result.data;

      dispatch(setImpersonation({
        sessionId:  session.id,
        orgId:      session.orgId,
        orgName:    session.orgName    || selectedOrg.name,
        adminName:  session.adminName  || 'Admin',
        startedAt:  session.startedAt,
        token:      session.token,
      }));

      message.success(`Impersonation session started — ${selectedOrg.name}`);

      // Reset form
      setSelectedOrg(null);
      setOrgSearch('');
      setSelectedAdmin(null);
      setReason('');
      refetchHistory();
    } catch (err) {
      message.error(parseError(err));
    }
  };

  const handleEndSession = async () => {
    if (!activeSession?.sessionId) return;
    try {
      await endImpersonation({ sessionId: activeSession.sessionId }).unwrap();
      dispatch(clearImpersonation());
      message.success('Impersonation session ended');
      setEndConfirm(false);
      refetchHistory();
    } catch (err) {
      message.error(parseError(err));
    }
  };

  /* ── History table columns ─────────────────────────────────── */
  const columns = [
    {
      title:     'Organisation',
      dataIndex: 'orgName',
      render:    (v, r) => (
        <div>
          <div className="text-xs text-[#e8e8f0] font-sans">{v}</div>
          <MonoValue value={`@${r.orgSlug || '—'}`} color="muted" size="xs" />
        </div>
      ),
    },
    {
      title:     'Impersonated Admin',
      dataIndex: 'adminName',
      render:    (v, r) => (
        <div>
          <div className="text-xs text-[#e8e8f0]">{v || '—'}</div>
          <span className="text-[10px] text-[#6b6b8a]">{r.adminEmail}</span>
        </div>
      ),
    },
    {
      title:     'Reason',
      dataIndex: 'reason',
      width:     200,
      render:    (v) => (
        <Tooltip title={v}>
          <span className="text-xs text-[#6b6b8a] truncate max-w-[180px] block">{v}</span>
        </Tooltip>
      ),
    },
    {
      title:     'Started',
      dataIndex: 'startedAt',
      width:     130,
      render:    (v) => (
        <Tooltip title={formatDateTime(v)}>
          <MonoValue value={formatTimeAgo(v)} color="muted" size="xs" />
        </Tooltip>
      ),
    },
    {
      title:     'Duration',
      dataIndex: 'endedAt',
      width:     100,
      render:    (v, r) => {
        if (!v) {
          return (
            <span className="text-[10px] font-['JetBrains_Mono'] text-[#00ff88] animate-pulse">
              ACTIVE
            </span>
          );
        }
        const ms = new Date(v) - new Date(r.startedAt);
        const m  = Math.floor(ms / 60000);
        const s  = Math.floor((ms % 60000) / 1000);
        return (
          <MonoValue
            value={m > 0 ? `${m}m ${s}s` : `${s}s`}
            color="muted"
            size="xs"
          />
        );
      },
    },
    {
      title:     'Ended',
      dataIndex: 'endedAt',
      width:     130,
      render:    (v) =>
        v
          ? <MonoValue value={formatTimeAgo(v)} color="muted" size="xs" />
          : <span className="text-[10px] text-[#6b6b8a]">—</span>,
    },
  ];

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Impersonation"
        subtitle="Start and manage superadmin impersonation sessions"
      />

      {/* ── Active session banner ─────────────────────── */}
      {activeSession && (
        <div className="bg-[#a855f7]/10 border border-[#a855f7]/40 rounded-lg p-5 mb-6
                        flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex h-3 w-3 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full
                               rounded-full bg-[#a855f7] opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#a855f7]" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#a855f7]
                                 uppercase tracking-wider">
                  ACTIVE IMPERSONATION
                </span>
                <span className="text-[#e8e8f0] text-sm font-sans font-medium">
                  {activeSession.orgName}
                </span>
                <span className="text-[#6b6b8a] text-xs">as</span>
                <span className="text-[#e8e8f0] text-xs font-sans">
                  {activeSession.adminName}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <span className="font-['JetBrains_Mono'] text-2xl text-[#a855f7] font-bold
                                 tabular-nums">
                  {elapsed}
                </span>
                <span className="text-[#6b6b8a] text-[10px] font-sans">
                  All actions are logged under [SuperAdmin via Impersonation]
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setEndConfirm(true)}
            disabled={ending}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-md text-sm
                       font-sans font-medium bg-[#ff3366]/15 border border-[#ff3366]/40
                       text-[#ff3366] hover:bg-[#ff3366]/25 transition-colors
                       disabled:opacity-50"
          >
            <StopOutlined />
            End Session
          </button>
        </div>
      )}

      {/* ── Main grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-8">

        {/* ── Start new session form ────────────────── */}
        <div className="xl:col-span-2 bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-md bg-[#a855f7]/10 border border-[#a855f7]/30
                            flex items-center justify-center flex-shrink-0">
              <UserSwitchOutlined className="text-[#a855f7] text-sm" />
            </div>
            <div>
              <h3 className="text-[#e8e8f0] text-sm font-sans font-semibold">
                Start Impersonation
              </h3>
              <p className="text-[#6b6b8a] text-[10px] mt-0.5">
                View portal as an org admin
              </p>
            </div>
          </div>

          {activeSession && (
            <div className="mb-4 p-3 bg-[#a855f7]/5 border border-[#a855f7]/20 rounded-md">
              <p className="text-[#a855f7] text-xs font-sans">
                End the current session before starting a new one.
              </p>
            </div>
          )}

          {/* Step 1 — Select org */}
          <div className="mb-4">
            <label className="block text-[10px] text-[#6b6b8a] uppercase tracking-[0.15em]
                              mb-2 font-sans">
              1. Select Organisation
            </label>

            {selectedOrg ? (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-[#161625]
                              border border-[#00d4ff]/40 rounded-md">
                <div className="w-7 h-7 rounded bg-[#00d4ff]/10 border border-[#00d4ff]/20
                                flex items-center justify-center text-[#00d4ff] text-xs
                                font-['JetBrains_Mono'] font-bold flex-shrink-0">
                  {selectedOrg.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[#e8e8f0] text-xs font-sans truncate">
                    {selectedOrg.name}
                  </div>
                  {selectedOrg.slug && (
                    <MonoValue value={`@${selectedOrg.slug}`} color="muted" size="xs" />
                  )}
                </div>
                <button
                  onClick={handleClearOrg}
                  disabled={!!activeSession}
                  className="text-[#6b6b8a] hover:text-[#ff3366] text-xs transition-colors
                             disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="relative">
                <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2
                                           text-[#6b6b8a] text-sm pointer-events-none" />
                <input
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  disabled={!!activeSession}
                  placeholder="Search organisation..."
                  className="w-full pl-9 pr-3 py-2 bg-[#161625] border border-[#1e1e35]
                             rounded-md text-[#e8e8f0] text-xs font-sans
                             placeholder-[#6b6b8a] outline-none
                             focus:border-[#00d4ff]/50 transition-colors
                             disabled:opacity-40"
                />
                {/* Dropdown results */}
                {orgResults.length > 0 && !selectedOrg && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-[#161625]
                                  border border-[#1e1e35] rounded-md shadow-xl
                                  max-h-48 overflow-y-auto">
                    {orgResults.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => handleSelectOrg(org)}
                        className="w-full text-left flex items-center gap-2.5 px-3 py-2.5
                                   hover:bg-[#1e1e35] transition-colors"
                      >
                        <div className="w-6 h-6 rounded bg-[#00d4ff]/10 border border-[#00d4ff]/20
                                        flex items-center justify-center text-[#00d4ff] text-[10px]
                                        font-['JetBrains_Mono'] font-bold flex-shrink-0">
                          {org.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[#e8e8f0] text-xs truncate">{org.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <OrgStatusBadge status={org.status} />
                            <MonoValue value={`${org.employeeCount || 0} emp`}
                                       color="muted" size="xs" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {orgSearching && debouncedOrgSearch.length >= 2 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 border border-[#00d4ff] border-t-transparent
                                    rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2 — Select admin */}
          <div className="mb-4">
            <label className="block text-[10px] text-[#6b6b8a] uppercase tracking-[0.15em]
                              mb-2 font-sans">
              2. Select Admin
            </label>
            <Select
              value={selectedAdmin || undefined}
              onChange={setSelectedAdmin}
              placeholder={
                !selectedOrg ? 'Select an org first' :
                adminsLoading ? 'Loading admins...' :
                admins.length === 0 ? 'No admins found' :
                'Choose admin to impersonate'
              }
              disabled={!selectedOrg || adminsLoading || !!activeSession}
              loading={adminsLoading}
              style={{ width: '100%' }}
              notFoundContent={
                <span className="text-[#6b6b8a] text-xs px-2">
                  {!selectedOrg ? 'Select an org first' : 'No admin accounts found'}
                </span>
              }
            >
              {admins.map((admin) => (
                <Select.Option key={admin.id} value={admin.id}>
                  <div className="py-0.5">
                    <div className="text-xs text-[#e8e8f0]">
                      {admin.first_name} {admin.last_name}
                    </div>
                    <div className="text-[10px] text-[#6b6b8a] font-['JetBrains_Mono']">
                      {admin.email}
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* Step 3 — Reason */}
          <div className="mb-5">
            <label className="block text-[10px] text-[#6b6b8a] uppercase tracking-[0.15em]
                              mb-2 font-sans">
              3. Reason <span className="text-[#ff3366]">*</span>
            </label>
            <TextArea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!!activeSession}
              placeholder="e.g. Customer support request #1234, debugging attendance sync issue..."
              rows={3}
              maxLength={500}
              showCount
              className="font-sans text-xs"
            />
          </div>

          {/* Warning */}
          <div className="bg-[#ffaa00]/8 border border-[#ffaa00]/25 rounded-md px-3 py-2.5 mb-5">
            <div className="flex gap-2">
              <ExclamationCircleOutlined className="text-[#ffaa00] text-xs mt-0.5 flex-shrink-0" />
              <p className="text-[#ffaa00] text-[11px] font-sans leading-relaxed">
                Every action during this session is fully logged and attributed to you
                as [SuperAdmin via Impersonation].
              </p>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStartSession}
            disabled={starting || !!activeSession || !selectedOrg || !selectedAdmin || !reason.trim()}
            className="w-full py-2.5 rounded-md font-['JetBrains_Mono'] text-sm font-bold
                       text-[#080810] bg-[#a855f7] hover:bg-[#b87af0]
                       hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
                       transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {starting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-[#080810]/40
                                 border-t-[#080810] rounded-full animate-spin" />
                Starting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <UserSwitchOutlined />
                Start Impersonation Session
              </span>
            )}
          </button>
        </div>

        {/* ── How it works + Tips ───────────────────── */}
        <div className="xl:col-span-3 flex flex-col gap-4">

          {/* How it works */}
          <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-5">
            <h3 className="text-[#e8e8f0] text-sm font-sans font-semibold mb-4">
              How Impersonation Works
            </h3>
            <ol className="space-y-3">
              {[
                {
                  n: '01',
                  title: 'Select org + admin',
                  desc:  'Choose which organisation and which admin account you want to view as.',
                },
                {
                  n: '02',
                  title: 'Provide a reason',
                  desc:  'Required for audit trail — e.g. support ticket number, debugging reason.',
                },
                {
                  n: '03',
                  title: 'Session starts',
                  desc:  'A temporary session token is issued. The purple banner shows active time.',
                },
                {
                  n: '04',
                  title: 'Fully audited',
                  desc:  'Every API call, page view, and action is logged under [SuperAdmin via Impersonation].',
                },
                {
                  n: '05',
                  title: 'End when done',
                  desc:  'Click "End Session" — the session token is immediately invalidated.',
                },
              ].map(({ n, title, desc }) => (
                <li key={n} className="flex items-start gap-3">
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#a855f7]
                                   bg-[#a855f7]/10 border border-[#a855f7]/30
                                   px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                    {n}
                  </span>
                  <div>
                    <div className="text-[#e8e8f0] text-xs font-sans font-medium">{title}</div>
                    <div className="text-[#6b6b8a] text-[11px] mt-0.5">{desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Current limits */}
          <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-5">
            <h3 className="text-[#e8e8f0] text-sm font-sans font-semibold mb-3">
              Session Limits
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Max concurrent',  value: '1 session'    },
                { label: 'Max duration',    value: '4 hours'      },
                { label: 'Idle timeout',    value: '30 min'       },
                { label: 'Audit retention', value: '2 years'      },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-[#6b6b8a] text-[9px] uppercase tracking-widest font-sans">
                    {label}
                  </span>
                  <span className="font-['JetBrains_Mono'] text-xs text-[#e8e8f0]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Session History ───────────────────────────── */}
      <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e1e35] flex items-center justify-between">
          <div>
            <h3 className="text-[#e8e8f0] text-sm font-sans font-medium">
              Session History
            </h3>
            <p className="text-[#6b6b8a] text-xs mt-0.5">
              All impersonation sessions — past and active
            </p>
          </div>
          <MonoValue value={`${histTotal} sessions`} color="muted" size="xs" />
        </div>

        <Table
          columns={columns}
          dataSource={history}
          rowKey="id"
          size="small"
          loading={historyLoading}
          pagination={{
            current:   historyPage,
            pageSize:  PAGE_SIZE,
            total:     histTotal,
            onChange:  setHistoryPage,
            showTotal: (t) => (
              <span className="font-['JetBrains_Mono'] text-xs text-[#6b6b8a]">
                {t} sessions
              </span>
            ),
            showSizeChanger: false,
          }}
          rowClassName={(record) =>
            !record.endedAt ? 'ant-table-row-suspended' : ''
          }
          locale={{
            emptyText: (
              <div className="py-10 text-center">
                <UserSwitchOutlined className="text-2xl text-[#1e1e35] mb-2 block mx-auto" />
                <p className="text-[#6b6b8a] text-xs font-sans">No sessions yet</p>
              </div>
            ),
          }}
        />
      </div>

      {/* ── End session confirm ───────────────────────── */}
      <ConfirmModal
        open={endConfirm}
        onCancel={() => setEndConfirm(false)}
        onConfirm={handleEndSession}
        loading={ending}
        title="End Impersonation Session?"
        description={`This will immediately invalidate the session token for "${activeSession?.orgName}". You will no longer have access as ${activeSession?.adminName}.`}
        confirmText="End Session"
        variant="warning"
      />
    </div>
  );
}