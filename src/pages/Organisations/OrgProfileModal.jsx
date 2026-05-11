import { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { useUpdateOrgProfileMutation } from '@store/api/orgApi.js';
import { parseError } from '@utils/errorHandler.js';

const TIMEZONES = [
  { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
  { label: 'Asia/Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Asia/Singapore (SGT)', value: 'Asia/Singapore' },
  { label: 'Asia/Colombo (SLST)', value: 'Asia/Colombo' },
  { label: 'Asia/Dhaka (BST)', value: 'Asia/Dhaka' },
  { label: 'Asia/Karachi (PKT)', value: 'Asia/Karachi' },
  { label: 'Europe/London (GMT/BST)', value: 'Europe/London' },
  { label: 'America/New_York (EST/EDT)', value: 'America/New_York' },
  { label: 'America/Los_Angeles (PST)', value: 'America/Los_Angeles' },
  { label: 'UTC', value: 'UTC' },
];

export default function OrgProfileModal({ open, org, onClose }) {
  const [form] = Form.useForm();
  const [updateOrgProfile, { isLoading }] = useUpdateOrgProfileMutation();

  useEffect(() => {
    if (open && org) {
      form.setFieldsValue({
        name: org.name,
        timezone: org.timezone || org.settings?.timezone || 'Asia/Kolkata',
        country: org.settings?.country || '',
      });
    }
  }, [form, open, org]);

  const handleSubmit = async (values) => {
    try {
      await updateOrgProfile({
        id: org.id,
        name: values.name.trim(),
        timezone: values.timezone,
        country: values.country?.trim() || '',
      }).unwrap();
      message.success('Organisation profile updated');
      onClose();
    } catch (err) {
      message.error(parseError(err));
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Save"
      confirmLoading={isLoading}
      destroyOnClose
      title="Edit Organisation"
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="name"
          label="Organisation name"
          rules={[
            { required: true, message: 'Organisation name is required' },
            { min: 3, message: 'Minimum 3 characters' },
            { max: 100, message: 'Maximum 100 characters' },
          ]}
        >
          <Input maxLength={100} />
        </Form.Item>

        <Form.Item
          name="timezone"
          label="Timezone"
          rules={[{ required: true, message: 'Timezone is required' }]}
        >
          <Select showSearch optionFilterProp="label" options={TIMEZONES} />
        </Form.Item>

        <Form.Item
          name="country"
          label="Country"
          rules={[{ max: 80, message: 'Maximum 80 characters' }]}
        >
          <Input maxLength={80} placeholder="Optional" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
