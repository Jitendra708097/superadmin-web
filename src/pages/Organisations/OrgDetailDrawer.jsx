/**
 * @module OrgDetailDrawer
 * @description Slide-in org detail panel — 640px wide, tabbed.
 *              Tabs: Overview, Employees, Attendance, Billing, Audit.
 */

import { useState } from 'react';
import { Drawer, Tabs, Table, Spin, message, Input, Select } from 'antd';
import {
  useGetOrgByIdQuery, useGetOrgEmployeesQuery,
  useGetOrgAttendanceSummaryQuery, useGetOrgBillingHistoryQuery,
  useResendOrgInviteMutation,
  useAddOrgNoteMutation,
} from '@store/api/orgApi.js';
import { useGetOrgAuditLogsQuery } from '@store/api/auditApi.js';
import OrgStatusBadge from '@components/common/OrgStatusBadge.jsx';
import PlanBadge      from '@components/common/PlanBadge.jsx';
import MonoValue      from '@components/common/MonoValue.jsx';
import { formatINR, formatDate, formatDateTime, formatNumber } from '@utils/formatters.js';
import { AUDIT_ACTION_COLORS } from '@utils/constants.js';
import BillingAlertModal from './BillingAlertModal.jsx';
import OrgProfileModal from './OrgProfileModal.jsx';
import TransferOwnerModal from './TransferOwnerModal.jsx';
import { parseError } from '@utils/errorHandler.js';
import { useDebounce } from '@hooks/useDebounce.js';

function getInviteErrorMessage(error) {
  const code = error?.data?.error?.code || error?.response?.data?.error?.code;

  if (code === 'SA_043') {
    return 'Invite cannot be resent because this admin has already completed first login. Ask them to use Forgot Password.';
  }

  if (code === 'SA_042') {
    return 'Invite cannot be sent because no active organisation admin was found.';
  }

  return parseError(error);
}

const EMPLOYEE_ROLE_OPTIONS = [
  { label: 'All roles', value: 'all' },
  { label: 'Admin', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Employee', value: 'employee' },
];

const EMPLOYEE_STATUS_OPTIONS = [
  { label: 'All status', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
];

const { TextArea } = Input;

function DetailRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1e1e35] last:border-0">
      <span className="text-[#6b6b8a] text-xs font-sans">{label}</span>
      {mono
        ? <MonoValue value={value} color="cyan" size="xs" />
        : <span className="text-[#e8e8f0] text-xs font-sans text-right max-w-[240px] truncate">{value || '—'}</span>
      }
    </div>
  );
}

export default function OrgDetailDrawer({ orgId, open, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [billingAlertOpen, setBillingAlertOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [employeePage, setEmployeePage] = useState(1);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeRole, setEmployeeRole] = useState('all');
  const [employeeStatus, setEmployeeStatus] = useState('all');
  const [noteText, setNoteText] = useState('');
  const [resendInvite, { isLoading: resendingInvite }] = useResendOrgInviteMutation();
  const [addOrgNote, { isLoading: addingNote }] = useAddOrgNoteMutation();
  const debouncedEmployeeSearch = useDebounce(employeeSearch, 300);

  const employeeParams = {
    page: employeePage,
    limit: 10,
    ...(debouncedEmployeeSearch ? { search: debouncedEmployeeSearch } : {}),
    ...(employeeRole !== 'all' ? { role: employeeRole } : {}),
    ...(employeeStatus !== 'all' ? { status: employeeStatus } : {}),
  };

  const { data: orgData, isLoading: orgLoading } = useGetOrgByIdQuery(orgId, { skip: !orgId });
  const { data: empData,   isLoading: empLoading   } = useGetOrgEmployeesQuery({ id: orgId, params: employeeParams }, { skip: !orgId || activeTab !== 'employees' });
  const { data: attData,   isLoading: attLoading   } = useGetOrgAttendanceSummaryQuery(orgId, { skip: !orgId || activeTab !== 'attendance' });
  const { data: billData,  isLoading: billLoading  } = useGetOrgBillingHistoryQuery({ id: orgId, params: {} }, { skip: !orgId || activeTab !== 'billing' });
  const { data: auditData, isLoading: auditLoading } = useGetOrgAuditLogsQuery({ orgId, params: { limit: 20 } }, { skip: !orgId || activeTab !== 'audit' });

  const org     = orgData?.data;
  const emps    = empData?.data?.employees || [];
  const empTotal = empData?.data?.total || 0;
  const att     = attData?.data || {};
  const bills   = billData?.data?.invoices || [];
  const currentEstimate = billData?.data?.currentEstimate || null;
  const audits  = auditData?.data?.logs    || [];
  const notes = org?.settings?.supportNotes || [];

  const empColumns = [
    { title: 'Name',  dataIndex: 'name',  render: (v) => <span className="text-xs text-[#e8e8f0]">{v}</span> },
    { title: 'Email', dataIndex: 'email', render: (v) => <MonoValue value={v} color="muted" size="xs" /> },
    { title: 'Dept',  dataIndex: 'department', render: (v) => <span className="text-xs text-[#6b6b8a]">{v?.name || '—'}</span> },
    { title: 'Status', dataIndex: 'status', render: (v) => <OrgStatusBadge status={v} /> },
  ];

  const billColumns = [
    { title: 'Date',   dataIndex: 'date',   render: (v) => <MonoValue value={formatDate(v)} color="muted" size="xs" /> },
    { title: 'Amount', dataIndex: 'amount', render: (v) => <span className="font-['JetBrains_Mono'] text-xs text-[#ffaa00]">{formatINR(v)}</span> },
    { title: 'Status', dataIndex: 'status', render: (v) => (
      <span className={`text-[10px] font-['JetBrains_Mono'] uppercase ${v === 'paid' ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>{v}</span>
    )},
  ];

  const auditColumns = [
    { title: 'Time',   dataIndex: 'createdAt', width: 140, render: (v) => <MonoValue value={formatDateTime(v)} color="muted" size="xs" /> },
    { title: 'Action', dataIndex: 'action',    render: (v) => (
      <span style={{ color: AUDIT_ACTION_COLORS[v] || '#6b6b8a' }} className="text-[10px] font-['JetBrains_Mono']">{v}</span>
    )},
    { title: 'By', dataIndex: 'performedByName', render: (v) => <span className="text-xs text-[#6b6b8a]">{v || 'System'}</span> },
  ];

  const handleResendInvite = async () => {
    try {
      const result = await resendInvite(orgId).unwrap();
      if (result?.data?.queued || result?.queued) {
        const adminEmail = result?.data?.adminEmail || result?.adminEmail || org?.ownerEmail || 'the admin';
        message.success(`Invite email queued for ${adminEmail}. Ask them to check Inbox, Spam, and Promotions.`, 6);
      } else {
        message.warning(result?.data?.deliveryNote || result?.data?.error || result?.error || 'Invite email was not queued. Check SMTP/queue health.', 6);
      }
    } catch (err) {
      message.error(getInviteErrorMessage(err), 7);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) {
      message.error('Note is required');
      return;
    }

    try {
      await addOrgNote({ id: orgId, note: noteText.trim() }).unwrap();
      setNoteText('');
      message.success('Organisation note added');
    } catch (err) {
      message.error(parseError(err));
    }
  };

  const tabs = [
    {
      key:   'overview',
      label: 'Overview',
      children: orgLoading ? (
        <div className="flex justify-center py-10"><Spin /></div>
      ) : org ? (
        <div className="space-y-1">
          <DetailRow label="Org ID"         value={org.id}                  mono />
          <DetailRow label="Name"           value={org.name}                     />
          <DetailRow label="Slug"           value={`@${org.slug}`}               />
          <DetailRow label="Owner Email"    value={org.ownerEmail}               />
          <DetailRow label="Invite Status"  value={org.settings?.invite?.queued ? 'Queued for email delivery' : org.settings?.invite?.error ? `Failed: ${org.settings.invite.error}` : 'Not sent yet'} />
          <DetailRow label="Invite Last Tried" value={formatDateTime(org.settings?.invite?.lastAttemptAt)} />
          <DetailRow label="Plan"           value={<PlanBadge plan={org.plan} />} />
          <DetailRow label="Status"         value={<OrgStatusBadge status={org.status} />} />
          <DetailRow label="Health"         value={`${org.healthScore ?? 0}/100 - ${org.healthLabel || 'Unknown'}`} />
          <DetailRow label="Health Notes"   value={(org.healthReasons || []).join(', ')} />
          <DetailRow label="Employees"      value={formatNumber(org.employeeCount)} mono />
          <DetailRow label="Branches"       value={org.branchCount}          mono />
          <DetailRow label="MRR"            value={formatINR(org.mrr || 0)}       />
          <DetailRow label="Joined"         value={formatDate(org.createdAt)}     />
          <DetailRow label="Trial Ends"     value={formatDate(org.trialEndsAt)}   />
          {org.suspendedAt && <DetailRow label="Suspended At" value={formatDateTime(org.suspendedAt)} />}
          {org.suspensionReason && <DetailRow label="Suspension Reason" value={org.suspensionReason} />}
          <DetailRow label="Timezone"       value={org.settings?.timezone}        />
          <DetailRow label="Country"        value={org.settings?.country}         />
          {org.settings?.lastProfileUpdate && (
            <DetailRow label="Profile Updated" value={formatDateTime(org.settings.lastProfileUpdate.updatedAt)} />
          )}
            {org.settings?.lastPlanChange && (
              <DetailRow label="Last Plan Reason" value={org.settings.lastPlanChange.reason} />
            )}
            {org.settings?.lastPlanChange?.effectiveAt && (
              <DetailRow label="Plan Effective" value={formatDateTime(org.settings.lastPlanChange.effectiveAt)} />
            )}
            {org.settings?.lastOwnerTransfer && (
              <DetailRow label="Owner Transfer" value={formatDateTime(org.settings.lastOwnerTransfer.changedAt)} />
            )}
          {org.settings?.lastTrialExtension && (
            <DetailRow label="Last Trial Reason" value={org.settings.lastTrialExtension.reason} />
          )}
          <div className="pt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setProfileOpen(true)}
              disabled={!org}
              className="px-3 py-1.5 rounded-md text-xs font-['JetBrains_Mono'] font-semibold text-[#e8e8f0] bg-[#161625] border border-[#1e1e35] hover:border-[#00d4ff]/40 disabled:opacity-50"
            >
              Edit Profile
            </button>
            <button
              onClick={() => setOwnerOpen(true)}
              disabled={!org}
              className="px-3 py-1.5 rounded-md text-xs font-['JetBrains_Mono'] font-semibold text-[#e8e8f0] bg-[#161625] border border-[#1e1e35] hover:border-[#a855f7]/40 disabled:opacity-50"
            >
              Transfer Owner
            </button>
            <button
              onClick={handleResendInvite}
              disabled={!org || resendingInvite}
              className="px-3 py-1.5 rounded-md text-xs font-['JetBrains_Mono'] font-semibold text-[#080810] bg-[#00d4ff] hover:bg-[#33ddff] disabled:opacity-50"
            >
              {resendingInvite ? 'Sending...' : 'Resend Admin Invite'}
            </button>
          </div>
        </div>
      ) : null,
    },
    {
      key: 'lifecycle',
      label: 'Lifecycle',
      children: orgLoading ? (
        <div className="flex justify-center py-10"><Spin /></div>
      ) : org ? (
        <div className="space-y-3">
          {[
            { label: 'Created', at: org.createdAt, detail: `Plan: ${org.plan}` },
            org.settings?.invite && { label: 'Invite Attempt', at: org.settings.invite.lastAttemptAt, detail: org.settings.invite.error || `Queued for ${org.settings.invite.email || 'admin email delivery'}` },
            org.settings?.lastPlanChange && { label: 'Plan Changed', at: org.settings.lastPlanChange.changedAt, detail: `${org.settings.lastPlanChange.from} -> ${org.settings.lastPlanChange.to}: ${org.settings.lastPlanChange.reason}` },
            org.settings?.lastOwnerTransfer && { label: 'Owner Transferred', at: org.settings.lastOwnerTransfer.changedAt, detail: `${org.settings.lastOwnerTransfer.toEmployeeEmail}: ${org.settings.lastOwnerTransfer.reason}` },
            org.settings?.lastTrialExtension && { label: 'Trial Extended', at: org.settings.lastTrialExtension.changedAt, detail: org.settings.lastTrialExtension.reason },
            org.settings?.lastProfileUpdate && { label: 'Profile Updated', at: org.settings.lastProfileUpdate.updatedAt, detail: `Previous name: ${org.settings.lastProfileUpdate.previousName || '-'}` },
            org.suspendedAt && { label: 'Suspended', at: org.suspendedAt, detail: org.suspensionReason },
            org.settings?.lastActivation && { label: 'Activated', at: org.settings.lastActivation.activatedAt, detail: org.settings.lastActivation.reason },
            org.cancelledAt && { label: 'Cancelled', at: org.cancelledAt, detail: org.cancellationReason },
          ].filter(Boolean).map((event) => (
            <div key={`${event.label}-${event.at}`} className="bg-[#161625] border border-[#1e1e35] rounded-md p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#e8e8f0] text-xs font-sans font-medium">{event.label}</span>
                <MonoValue value={formatDateTime(event.at)} color="muted" size="xs" />
              </div>
              <p className="text-[#6b6b8a] text-xs mt-1">{event.detail || '-'}</p>
            </div>
          ))}
        </div>
      ) : null,
    },
    {
      key: 'notes',
      label: 'Notes',
      children: orgLoading ? (
        <div className="flex justify-center py-10"><Spin /></div>
      ) : org ? (
        <div className="space-y-4">
          <div className="bg-[#161625] border border-[#1e1e35] rounded-md p-3">
            <label className="block text-[10px] text-[#6b6b8a] uppercase tracking-widest mb-2 font-sans">
              Internal note
            </label>
            <TextArea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Add support, billing, or lifecycle context..."
              rows={3}
              maxLength={1000}
              showCount
            />
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={handleAddNote}
                disabled={addingNote || !noteText.trim()}
                className="px-3 py-1.5 rounded-md text-xs font-['JetBrains_Mono'] font-semibold text-[#080810] bg-[#00d4ff] hover:bg-[#33ddff] disabled:opacity-50"
              >
                {addingNote ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>

          {notes.length ? notes.map((entry) => (
            <div key={entry.id || entry.createdAt} className="bg-[#161625] border border-[#1e1e35] rounded-md p-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[#e8e8f0] text-xs font-sans font-medium">
                  {entry.createdByName || 'Superadmin'}
                </span>
                <MonoValue value={formatDateTime(entry.createdAt)} color="muted" size="xs" />
              </div>
              <p className="text-[#c9c9d6] text-xs leading-5 whitespace-pre-wrap">{entry.note}</p>
            </div>
          )) : (
            <div className="text-[#6b6b8a] text-xs font-sans py-8 text-center">
              No internal notes yet.
            </div>
          )}
        </div>
      ) : null,
    },
    {
      key:   'employees',
      label: 'Employees',
      children: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px_140px] gap-2">
            <Input.Search
              value={employeeSearch}
              onChange={(event) => {
                setEmployeeSearch(event.target.value);
                setEmployeePage(1);
              }}
              placeholder="Search name, email, code"
              allowClear
              size="small"
            />
            <Select
              value={employeeRole}
              onChange={(value) => {
                setEmployeeRole(value);
                setEmployeePage(1);
              }}
              options={EMPLOYEE_ROLE_OPTIONS}
              size="small"
            />
            <Select
              value={employeeStatus}
              onChange={(value) => {
                setEmployeeStatus(value);
                setEmployeePage(1);
              }}
              options={EMPLOYEE_STATUS_OPTIONS}
              size="small"
            />
          </div>
          <Table
            columns={empColumns}
            dataSource={emps}
            rowKey="id"
            size="small"
            loading={empLoading}
            pagination={{
              current: employeePage,
              pageSize: 10,
              total: empTotal,
              size: 'small',
              showSizeChanger: false,
            }}
            onChange={(pagination) => setEmployeePage(pagination.current || 1)}
          />
        </div>
      ),
    },
    {
      key:   'attendance',
      label: 'Attendance',
      children: attLoading ? (
        <div className="flex justify-center py-10"><Spin /></div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Present Today',  value: att.present,   color: 'text-[#00ff88]' },
            { label: 'Absent',         value: att.absent,    color: 'text-[#ff3366]' },
            { label: 'Late',           value: att.late,      color: 'text-[#ffaa00]' },
            { label: 'Checked In Now', value: att.checkedIn, color: 'text-[#00d4ff]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#161625] rounded-md p-3 border border-[#1e1e35]">
              <div className="text-[#6b6b8a] text-[10px] uppercase tracking-widest mb-1">{label}</div>
              <div className={`font-['JetBrains_Mono'] text-2xl font-bold ${color}`}>{value ?? '—'}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      key:   'billing',
      label: 'Billing',
      children: (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setBillingAlertOpen(true)}
              disabled={!org}
              className="px-3 py-1.5 rounded-md text-xs font-['JetBrains_Mono'] font-semibold text-[#080810] bg-[#00d4ff] hover:bg-[#33ddff] disabled:opacity-50"
            >
              Send Billing Alert
            </button>
          </div>
          <Table
            columns={billColumns}
            dataSource={bills.length > 0 ? bills : currentEstimate ? [currentEstimate] : []}
            rowKey="id"
            size="small"
            loading={billLoading}
            pagination={{ pageSize: 10, size: 'small' }}
          />
        </div>
      ),
    },
    {
      key:   'audit',
      label: 'Audit',
      children: (
        <Table
          columns={auditColumns}
          dataSource={audits}
          rowKey="id"
          size="small"
          loading={auditLoading}
          pagination={{ pageSize: 10, size: 'small' }}
        />
      ),
    },
  ];

  return (
    <>
      <Drawer
      open={open}
      onClose={onClose}
      width={640}
      title={null}
      closeIcon={null}
      styles={{ body: { padding: 0, background: '#0f0f1a' }, header: { display: 'none' } }}
    >
      {/* Drawer header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e35]
                      bg-[#0f0f1a] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20
                          flex items-center justify-center text-[#00d4ff] text-sm
                          font-['JetBrains_Mono'] font-bold">
            {org?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#e8e8f0] font-sans font-semibold text-sm">
                {org?.name || 'Loading...'}
              </span>
              {org && <OrgStatusBadge status={org.status} />}
              {org && <PlanBadge plan={org.plan} />}
            </div>
            {org && (
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#6b6b8a]">
                @{org.slug}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded text-[#6b6b8a]
                     hover:text-[#e8e8f0] hover:bg-[#161625] transition-colors text-lg"
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabs}
          size="small"
        />
      </div>
      </Drawer>
      {org && (
        <BillingAlertModal
          open={billingAlertOpen}
          org={org}
          onClose={() => setBillingAlertOpen(false)}
        />
      )}
      {org && (
        <OrgProfileModal
          open={profileOpen}
          org={org}
          onClose={() => setProfileOpen(false)}
        />
      )}
      {org && (
        <TransferOwnerModal
          open={ownerOpen}
          org={org}
          onClose={() => setOwnerOpen(false)}
        />
      )}
    </>
  );
}
