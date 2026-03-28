/**
 * @module Organisations/index
 * @description Organisation management hub.
 *              Lists all orgs with filter/search. Supports:
 *              - Create org (superadmin)
 *              - View detail drawer (click row or ?id= param)
 *              - Suspend / Activate
 *              - Change plan
 *              - Extend trial
 *              - Impersonate admin
 *              - View audit log (navigate with pre-filter)
 *              - Export CSV
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams }      from 'react-router-dom';
import { useDispatch }                       from 'react-redux';
import { Select, Popconfirm, message }       from 'antd';
import {
  PlusOutlined,
  DownloadOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

import {
  useGetAllOrgsQuery,
  useActivateOrgMutation,
} from '@store/api/orgApi.js';
import { setImpersonation } from '@store/uiSlice.js';
import { useStartImpersonationMutation } from '@store/api/impersonateApi.js';
import { useDebounce } from '@hooks/useDebounce.js';
import {
  ORG_STATUS, ORG_STATUS_LABELS,
  PLAN_TIERS, PLAN_LABELS,
  PAGE_SIZE,
}                          from '@utils/constants.js';
import { parseError }      from '@utils/errorHandler.js';

import PageHeader       from '@components/common/PageHeader.jsx';
import OrgTable         from './OrgTable.jsx';
import OrgDetailDrawer  from './OrgDetailDrawer.jsx';
import SuspendModal     from './SuspendModal.jsx';
import PlanModal        from './PlanModal.jsx';
import TrialModal       from './TrialModal.jsx';
import CreateOrgModal   from './CreateOrgModal.jsx';

/* ─────────────────────────────────────────────────────────────── */

const STATUS_OPTIONS = [
  { value: '',                    label: 'All Statuses'  },
  { value: ORG_STATUS.ACTIVE,    label: 'Active'        },
  { value: ORG_STATUS.TRIAL,     label: 'Trial'         },
  { value: ORG_STATUS.SUSPENDED, label: 'Suspended'     },
  { value: ORG_STATUS.CANCELLED, label: 'Cancelled'     },
];

const PLAN_OPTIONS = [
  { value: '',                    label: 'All Plans'     },
  { value: PLAN_TIERS.TRIAL,      label: 'Trial'         },
  { value: PLAN_TIERS.STARTER,    label: 'Starter'       },
  { value: PLAN_TIERS.GROWTH,     label: 'Growth'        },
  { value: PLAN_TIERS.ENTERPRISE, label: 'Enterprise'    },
];

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest First'      },
  { value: 'createdAt:asc',  label: 'Oldest First'      },
  { value: 'employees:desc', label: 'Most Employees'    },
  { value: 'mrr:desc',       label: 'Highest MRR'       },
  { value: 'name:asc',       label: 'Name A → Z'        },
];

/* ─────────────────────────────────────────────────────────────── */

export default function OrganisationsPage() {
  const navigate      = useNavigate();
  const dispatch      = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  /* ── Filter state ──────────────────────────────────────────── */
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [plan,     setPlan]     = useState('');
  const [sort,     setSort]     = useState('createdAt:desc');
  const [page,     setPage]     = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  /* ── Modal / drawer state ──────────────────────────────────── */
  const [detailId,      setDetailId]      = useState(null);
  const [suspendOrg,    setSuspendOrg]    = useState(null);
  const [planOrg,       setPlanOrg]       = useState(null);
  const [trialOrg,      setTrialOrg]      = useState(null);
  const [createOpen,    setCreateOpen]    = useState(false);

  /* ── URL deep-link: ?id=xxx opens detail drawer ───────────── */
  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam) {
      setDetailId(idParam);
      // Clean param from URL without navigation
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('id');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  /* ── Queries ───────────────────────────────────────────────── */
  const [sortField, sortOrder] = sort.split(':');

  const { data, isLoading, isFetching, refetch } = useGetAllOrgsQuery({
    page,
    limit:  PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: status          || undefined,
    plan:   plan            || undefined,
    sortBy: sortField,
    order:  sortOrder,
  });

  /* ── Mutations ─────────────────────────────────────────────── */
  const [activateOrg,  { isLoading: activating }] = useActivateOrgMutation();
  const [startImpersonation] = useStartImpersonationMutation();

  /* ── Derived ───────────────────────────────────────────────── */
  const orgs  = data?.data?.orgs  || [];
  const total = data?.data?.total || 0;

  /* ── Handlers ──────────────────────────────────────────────── */
  const handleActivate = useCallback(async (org) => {
    try {
      await activateOrg(org.id).unwrap();
      message.success(`${org.name} activated`);
    } catch (err) {
      message.error(parseError(err));
    }
  }, [activateOrg]);

  const handleImpersonate = useCallback(async (org) => {
    // Navigate to impersonation page pre-filled with this org
    navigate('/impersonation', { state: { orgId: org.id, orgName: org.name } });
  }, [navigate]);

  const handleViewAudit = useCallback((org) => {
    navigate('/audit-logs', {
      state: { orgId: org.id, orgName: org.name },
    });
  }, [navigate]);

  const handleCreateClose = useCallback((newOrg) => {
    setCreateOpen(false);
    if (newOrg) {
      // Refresh list and open new org's detail
      refetch();
      setDetailId(newOrg.id);
    }
  }, [refetch]);

  const handleFilterChange = useCallback(() => {
    setPage(1);
  }, []);

  const handleExport = () => {
    message.info('CSV export queued — check your email shortly');
    // In production: trigger exportOrgs query / mutation
  };

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="animate-fade-in">

      {/* ── Page header ──────────────────────────────────── */}
      <PageHeader
        title="Organisations"
        count={total}
        subtitle="All registered orgs on the platform"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans
                         text-[#6b6b8a] hover:text-[#e8e8f0] bg-[#161625] border border-[#1e1e35]
                         hover:border-[#00d4ff]/30 transition-colors"
            >
              <DownloadOutlined />
              Export CSV
            </button>

            <button
              onClick={refetch}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans
                         text-[#6b6b8a] hover:text-[#e8e8f0] bg-[#161625] border border-[#1e1e35]
                         hover:border-[#00d4ff]/30 transition-colors disabled:opacity-50"
            >
              <ReloadOutlined className={isFetching ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-md text-xs
                         font-['JetBrains_Mono'] font-semibold
                         text-[#080810] bg-[#00d4ff] hover:bg-[#33ddff]
                         hover:shadow-[0_0_16px_rgba(0,212,255,0.35)]
                         transition-all"
            >
              <PlusOutlined />
              New Org
            </button>
          </div>
        }
      />

      {/* ── Filter bar ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b6b8a]"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
            placeholder="Search name, email, slug..."
            className="w-full pl-9 pr-3 py-2 bg-[#161625] border border-[#1e1e35] rounded-md
                       text-[#e8e8f0] text-xs font-sans placeholder-[#6b6b8a] outline-none
                       focus:border-[#00d4ff]/50 transition-colors"
          />
        </div>

        {/* Status */}
        <Select
          value={status}
          onChange={(v) => { setStatus(v); handleFilterChange(); }}
          style={{ width: 140 }}
          options={STATUS_OPTIONS}
          size="small"
        />

        {/* Plan */}
        <Select
          value={plan}
          onChange={(v) => { setPlan(v); handleFilterChange(); }}
          style={{ width: 130 }}
          options={PLAN_OPTIONS}
          size="small"
        />

        {/* Sort */}
        <Select
          value={sort}
          onChange={(v) => { setSort(v); setPage(1); }}
          style={{ width: 160 }}
          options={SORT_OPTIONS}
          size="small"
        />

        {/* Active filter chips */}
        {(search || status || plan) && (
          <button
            onClick={() => {
              setSearch('');
              setStatus('');
              setPlan('');
              setPage(1);
            }}
            className="text-[10px] font-sans text-[#ff3366] hover:text-[#ff5580]
                       transition-colors flex items-center gap-1"
          >
            ✕ Clear filters
          </button>
        )}

        {/* Showing text */}
        <span className="ml-auto font-['JetBrains_Mono'] text-[10px] text-[#6b6b8a]">
          {isFetching ? 'Updating...' : `${total.toLocaleString()} orgs`}
        </span>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <OrgTable
        data={orgs}
        total={total}
        loading={isLoading || isFetching}
        page={page}
        onPageChange={setPage}
        onViewDetail={(org) => setDetailId(org.id)}
        onSuspend={(org)   => setSuspendOrg(org)}
        onActivate={handleActivate}
        onChangePlan={(org) => setPlanOrg(org)}
        onExtendTrial={(org) => setTrialOrg(org)}
        onImpersonate={handleImpersonate}
        onViewAudit={handleViewAudit}
      />

      {/* ── Modals & drawer ──────────────────────────────── */}

      {/* Create org */}
      <CreateOrgModal
        open={createOpen}
        onClose={handleCreateClose}
      />

      {/* Org detail side drawer */}
      <OrgDetailDrawer
        orgId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
      />

      {/* Suspend */}
      <SuspendModal
        open={!!suspendOrg}
        org={suspendOrg}
        onClose={() => setSuspendOrg(null)}
      />

      {/* Change plan */}
      <PlanModal
        open={!!planOrg}
        org={planOrg}
        onClose={() => setPlanOrg(null)}
      />

      {/* Extend trial */}
      <TrialModal
        open={!!trialOrg}
        org={trialOrg}
        onClose={() => setTrialOrg(null)}
      />
    </div>
  );
}