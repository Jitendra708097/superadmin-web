/**
 * @module CreateOrgModal
 * @description Superadmin form to create a new organisation + admin user.
 *              Fields: org name, admin details, plan, timezone.
 *              Calls POST /superadmin/organisations.
 */

import { useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import { useCreateOrgMutation } from '@store/api/orgApi.js';
import { PLAN_TIERS, PLAN_LABELS, PLAN_COLORS } from '@utils/constants.js';
import { parseError } from '@utils/errorHandler.js';

const TIMEZONES = [
  { label: 'Asia/Kolkata (IST)',         value: 'Asia/Kolkata'        },
  { label: 'Asia/Dubai (GST)',            value: 'Asia/Dubai'          },
  { label: 'Asia/Singapore (SGT)',        value: 'Asia/Singapore'      },
  { label: 'Asia/Colombo (SLST)',         value: 'Asia/Colombo'        },
  { label: 'Asia/Dhaka (BST)',            value: 'Asia/Dhaka'          },
  { label: 'Asia/Karachi (PKT)',          value: 'Asia/Karachi'        },
  { label: 'Europe/London (GMT/BST)',     value: 'Europe/London'       },
  { label: 'America/New_York (EST/EDT)',  value: 'America/New_York'    },
  { label: 'America/Los_Angeles (PST)',   value: 'America/Los_Angeles' },
  { label: 'UTC',                         value: 'UTC'                 },
];

const PLAN_OPTIONS = [
  PLAN_TIERS.TRIAL,
  PLAN_TIERS.STARTER,
  PLAN_TIERS.GROWTH,
  PLAN_TIERS.ENTERPRISE,
];

export default function CreateOrgModal({ open, onClose }) {
  const [form] = Form.useForm();
  const [createOrg, { isLoading }] = useCreateOrgMutation();

  const handleSubmit = async (values) => {
    try {
      const payload = {
        orgName:        values.orgName.trim(),
        adminFirstName: values.adminFirstName.trim(),
        adminLastName:  values.adminLastName?.trim() || '',
        adminEmail:     values.adminEmail.trim().toLowerCase(),
        adminPhone:     values.adminPhone?.trim() || '',
        plan:           values.plan || PLAN_TIERS.TRIAL,
        timezone:       values.timezone || 'Asia/Kolkata',
      };

      const result = await createOrg(payload).unwrap();

      message.success(
        `Organisation "${payload.orgName}" created successfully!`,
        4,
      );

      form.resetFields();
      onClose(result?.data);
    } catch (err) {
      message.error(parseError(err));
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={560}
      centered
      destroyOnClose
      title={null}
    >
      <div className="p-1">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1e1e35]">
          <div className="w-10 h-10 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/30
                          flex items-center justify-center flex-shrink-0">
            <ApartmentOutlined className="text-[#00d4ff] text-lg" />
          </div>
          <div>
            <h3 className="text-[#e8e8f0] font-sans font-semibold text-sm">
              Create Organisation
            </h3>
            <p className="text-[#6b6b8a] text-xs mt-0.5">
              Provisions a new org + admin account. Welcome email auto-sent.
            </p>
          </div>
        </div>

        {/* ── Form ───────────────────────────────────────── */}
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          requiredMark={false}
          initialValues={{ plan: PLAN_TIERS.TRIAL, timezone: 'Asia/Kolkata' }}
        >

          {/* Org name */}
          <div className="mb-1">
            <span className="text-[10px] text-[#6b6b8a] uppercase tracking-[0.15em] font-sans">
              Organisation
            </span>
          </div>

          <Form.Item
            name="orgName"
            rules={[
              { required: true, message: 'Organisation name is required' },
              { min: 3, message: 'Minimum 3 characters' },
              { max: 100, message: 'Maximum 100 characters' },
            ]}
          >
            <Input
              placeholder="e.g. Acme Corp, TechStart India"
              size="large"
              maxLength={100}
              className="font-sans"
            />
          </Form.Item>

          {/* Admin details */}
          <div className="mb-1 mt-4">
            <span className="text-[10px] text-[#6b6b8a] uppercase tracking-[0.15em] font-sans">
              Admin User
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="adminFirstName"
              rules={[{ required: true, message: 'First name required' }]}
              style={{ marginBottom: 12 }}
            >
              <Input placeholder="First name" maxLength={50} className="font-sans" />
            </Form.Item>

            <Form.Item
              name="adminLastName"
              style={{ marginBottom: 12 }}
            >
              <Input placeholder="Last name (optional)" maxLength={50} className="font-sans" />
            </Form.Item>
          </div>

          <Form.Item
            name="adminEmail"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
            style={{ marginBottom: 12 }}
          >
            <Input
              placeholder="admin@company.com"
              type="email"
              maxLength={200}
              className="font-sans"
            />
          </Form.Item>

          <Form.Item
            name="adminPhone"
            rules={[
              {
                pattern: /^[0-9]{10,15}$/,
                message:  'Enter 10–15 digit phone number',
              },
            ]}
            style={{ marginBottom: 12 }}
          >
            <Input
              placeholder="Phone number (optional)"
              maxLength={15}
              className="font-sans"
            />
          </Form.Item>

          {/* Plan + Timezone row */}
          <div className="mb-1 mt-4">
            <span className="text-[10px] text-[#6b6b8a] uppercase tracking-[0.15em] font-sans">
              Configuration
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="plan" style={{ marginBottom: 12 }}>
              <Select size="large">
                {PLAN_OPTIONS.map((plan) => {
                  const cfg = PLAN_COLORS[plan];
                  return (
                    <Select.Option key={plan} value={plan}>
                      <span
                        style={{ color: cfg.text }}
                        className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider"
                      >
                        {PLAN_LABELS[plan]}
                      </span>
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>

            <Form.Item name="timezone" style={{ marginBottom: 12 }}>
              <Select
                size="large"
                showSearch
                optionFilterProp="label"
                options={TIMEZONES}
                className="font-sans"
              />
            </Form.Item>
          </div>

          {/* Info box */}
          <div className="bg-[#00d4ff]/5 border border-[#00d4ff]/20 rounded-md px-4 py-3 mb-6">
            <p className="text-[#00d4ff] text-[11px] font-sans leading-relaxed">
              ℹ The admin will receive a welcome email with their temporary password
              and a link to the org admin portal. A 14-day trial starts immediately.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-[#1e1e35]">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 rounded-md text-sm font-sans text-[#6b6b8a]
                         hover:text-[#e8e8f0] hover:bg-[#161625] transition-colors
                         disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-md text-sm font-['JetBrains_Mono'] font-semibold
                         text-[#080810] bg-[#00d4ff] hover:bg-[#33ddff]
                         hover:shadow-[0_0_16px_rgba(0,212,255,0.4)]
                         transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-[#080810]/40
                                   border-t-[#080810] rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Organisation →'
              )}
            </button>
          </div>
        </Form>
      </div>
    </Modal>
  );
}