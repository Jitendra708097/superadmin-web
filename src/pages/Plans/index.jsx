import { useEffect, useMemo, useState } from 'react';
import { Form, Input, InputNumber, Modal, Select, Switch, Table, Tag, message } from 'antd';
import { EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { useGetPlansQuery, useSavePlanMutation } from '@store/api/planApi.js';
import PageHeader from '@components/common/PageHeader.jsx';
import MonoValue from '@components/common/MonoValue.jsx';
import PlanBadge from '@components/common/PlanBadge.jsx';
import { PLAN_LABELS } from '@utils/constants.js';
import { formatINR, formatNumber } from '@utils/formatters.js';
import { parseError } from '@utils/errorHandler.js';

const BILLING_TYPES = [
  { label: 'Free', value: 'free' },
  { label: 'Per employee', value: 'per_employee' },
  { label: 'Flat monthly', value: 'flat' },
  { label: 'Custom', value: 'custom' },
];

const FEATURE_FIELDS = [
  ['mobile_attendance', 'Mobile attendance'],
  ['web_attendance', 'Web attendance'],
  ['face_verification', 'Face verification'],
  ['geofence', 'Geofence'],
  ['leave_management', 'Leave management'],
  ['regularisation', 'Regularisation'],
  ['multi_branch', 'Multi branch'],
  ['audit_logs', 'Audit logs'],
  ['integrations', 'Integrations'],
  ['priority_support', 'Priority support'],
  ['custom_retention', 'Custom retention'],
];

function priceText(plan) {
  if (plan.billingType === 'per_employee') return `${formatINR(plan.pricePerEmployee)}/emp/mo`;
  if (plan.billingType === 'flat') return `${formatINR(plan.monthlyPrice)}/mo`;
  if (plan.billingType === 'custom') return 'Custom';
  return 'Free';
}

function limitText(value) {
  return value == null ? 'Unlimited' : formatNumber(value);
}

function PlanEditor({ open, plan, onClose }) {
  const [form] = Form.useForm();
  const [savePlan, { isLoading }] = useSavePlanMutation();
  const initialValues = plan ? {
    name: plan.name,
    description: plan.description,
    billingType: plan.billingType,
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: plan.yearlyPrice,
    pricePerEmployee: plan.pricePerEmployee,
    trialDays: plan.trialDays,
    employeeLimit: plan.employeeLimit,
    branchLimit: plan.branchLimit,
    managerLimit: plan.managerLimit,
    storageLimitMb: plan.storageLimitMb,
    attendanceRetentionDays: plan.attendanceRetentionDays,
    isActive: plan.isActive,
    isPublic: plan.isPublic,
    sortOrder: plan.sortOrder,
    reports: plan.features?.reports || 'basic',
    features: plan.features || {},
  } : {};

  useEffect(() => {
    if (open && plan) {
      form.setFieldsValue(initialValues);
    }
  }, [form, open, plan]);

  const handleSubmit = async (values) => {
    try {
      await savePlan({
        ...values,
        code: plan.code,
        features: {
          ...(values.features || {}),
          reports: values.reports,
        },
      }).unwrap();
      message.success(`${PLAN_LABELS[plan.code] || plan.name} plan saved`);
      onClose();
    } catch (err) {
      message.error(parseError(err));
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      centered
      forceRender
      title={<span className="text-[#e8e8f0] text-sm">Edit {plan?.name}</span>}
      styles={{ body: { background: '#0f0f1a' }, header: { background: '#0f0f1a', borderBottomColor: '#1e1e35' } }}
    >
      {plan && (
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleSubmit}
          initialValues={initialValues}
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name required' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="billingType" label="Billing type">
              <Select options={BILLING_TYPES} />
            </Form.Item>
          </div>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} maxLength={240} showCount />
          </Form.Item>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="pricePerEmployee" label="Price / employee">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="monthlyPrice" label="Monthly flat">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="yearlyPrice" label="Yearly flat">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="trialDays" label="Trial days">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="employeeLimit" label="Employee limit">
              <InputNumber min={0} placeholder="Unlimited" className="w-full" />
            </Form.Item>
            <Form.Item name="branchLimit" label="Branch limit">
              <InputNumber min={0} placeholder="Unlimited" className="w-full" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="managerLimit" label="Manager limit">
              <InputNumber min={0} placeholder="Unlimited" className="w-full" />
            </Form.Item>
            <Form.Item name="storageLimitMb" label="Storage MB">
              <InputNumber min={0} placeholder="Unlimited" className="w-full" />
            </Form.Item>
            <Form.Item name="attendanceRetentionDays" label="Retention days">
              <InputNumber min={0} placeholder="Unlimited" className="w-full" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="reports" label="Reports">
              <Select
                options={[
                  { label: 'Basic', value: 'basic' },
                  { label: 'Full', value: 'full' },
                  { label: 'Advanced', value: 'advanced' },
                ]}
              />
            </Form.Item>
            <Form.Item name="sortOrder" label="Sort order">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4">
            {FEATURE_FIELDS.map(([key, label]) => (
              <Form.Item
                key={key}
                name={['features', key]}
                label={label}
                valuePropName="checked"
                className="mb-2"
              >
                <Switch size="small" />
              </Form.Item>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-[#1e1e35] pt-4 mt-2">
            <div className="flex items-center gap-5">
              <Form.Item name="isActive" valuePropName="checked" className="mb-0">
                <Switch size="small" checkedChildren="Active" unCheckedChildren="Off" />
              </Form.Item>
              <Form.Item name="isPublic" valuePropName="checked" className="mb-0">
                <Switch size="small" checkedChildren="Public" unCheckedChildren="Hidden" />
              </Form.Item>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-sm font-sans text-[#6b6b8a] hover:text-[#e8e8f0] hover:bg-[#161625]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-md text-sm font-['JetBrains_Mono'] font-semibold text-[#080810] bg-[#00d4ff] hover:bg-[#33ddff] disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>
        </Form>
      )}
    </Modal>
  );
}

export default function PlansPage() {
  const [editingPlan, setEditingPlan] = useState(null);
  const { data, isLoading, isFetching, refetch } = useGetPlansQuery(undefined, {
    pollingInterval: 60000,
  });
  const plans = data?.data?.plans || [];

  const totals = useMemo(() => plans.reduce((acc, plan) => {
    acc.orgs += Number(plan.usage?.orgCount || 0);
    acc.revenue += Number(plan.usage?.revenue || 0);
    return acc;
  }, { orgs: 0, revenue: 0 }), [plans]);

  const columns = [
    {
      title: 'Plan',
      dataIndex: 'code',
      render: (_, plan) => (
        <div className="min-w-0">
          <PlanBadge plan={plan.code} />
          <div className="text-xs text-[#e8e8f0] mt-1">{plan.name}</div>
          <div className="text-[11px] text-[#6b6b8a] max-w-[360px] truncate">{plan.description}</div>
        </div>
      ),
    },
    { title: 'Billing', dataIndex: 'billingType', width: 150, render: (_, plan) => <MonoValue value={priceText(plan)} color="cyan" size="xs" /> },
    { title: 'Employees', dataIndex: 'employeeLimit', width: 110, render: (value) => <MonoValue value={limitText(value)} color="muted" size="xs" /> },
    { title: 'Branches', dataIndex: 'branchLimit', width: 100, render: (value) => <MonoValue value={limitText(value)} color="muted" size="xs" /> },
    { title: 'Orgs', dataIndex: ['usage', 'orgCount'], width: 80, align: 'right', render: (value) => <MonoValue value={formatNumber(value || 0)} color="muted" size="xs" /> },
    { title: 'MRR', dataIndex: ['usage', 'revenue'], width: 110, align: 'right', render: (value) => <span className="font-['JetBrains_Mono'] text-xs text-[#ffaa00]">{formatINR(value || 0)}</span> },
    {
      title: 'State',
      width: 110,
      render: (_, plan) => (
        <div className="flex gap-1">
          <Tag color={plan.isActive ? 'green' : 'red'}>{plan.isActive ? 'Active' : 'Off'}</Tag>
          {plan.isPublic && <Tag color="blue">Public</Tag>}
        </div>
      ),
    },
    {
      title: '',
      width: 72,
      align: 'right',
      render: (_, plan) => (
        <button
          type="button"
          onClick={() => setEditingPlan(plan)}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[#6b6b8a] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"
          title="Edit plan"
        >
          <EditOutlined />
        </button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Plans" subtitle="Trial, Standard, and Enterprise policy, pricing, and limits" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-4">
          <div className="text-[10px] text-[#6b6b8a] uppercase tracking-[0.15em]">Plans</div>
          <div className="text-2xl text-[#e8e8f0] font-['JetBrains_Mono'] mt-2">{plans.length}</div>
        </div>
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-4">
          <div className="text-[10px] text-[#6b6b8a] uppercase tracking-[0.15em]">Assigned orgs</div>
          <div className="text-2xl text-[#e8e8f0] font-['JetBrains_Mono'] mt-2">{formatNumber(totals.orgs)}</div>
        </div>
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-4">
          <div className="text-[10px] text-[#6b6b8a] uppercase tracking-[0.15em]">Estimated MRR</div>
          <div className="text-2xl text-[#ffaa00] font-['JetBrains_Mono'] mt-2">{formatINR(totals.revenue, { compact: true })}</div>
        </div>
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#6b6b8a] uppercase tracking-[0.15em]">Refresh</div>
            <div className="text-xs text-[#8a8aa8] mt-2">{isFetching ? 'Updating...' : 'Live policy data'}</div>
          </div>
          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-[#6b6b8a] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"
            title="Refresh plans"
          >
            <ReloadOutlined />
          </button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={plans}
        rowKey="code"
        loading={isLoading}
        pagination={false}
      />

      <PlanEditor
        open={Boolean(editingPlan)}
        plan={editingPlan}
        onClose={() => setEditingPlan(null)}
      />
    </div>
  );
}
