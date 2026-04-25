/**
 * @module BillingAlertModal
 * @description Modal for sending a billing alert email to the organisation admin.
 */

import { useEffect, useState } from 'react';
import { Modal, Select, Input, message } from 'antd';
import { useSendBillingAlertMutation } from '@store/api/orgApi.js';
import { parseError } from '@utils/errorHandler.js';

const ALERT_OPTIONS = [
  { value: 'payment_due', label: 'Payment Due' },
  { value: 'payment_overdue', label: 'Payment Overdue' },
  { value: 'payment_failed', label: 'Payment Failed' },
  { value: 'suspension_warning', label: 'Suspension Warning' },
  { value: 'organisation_suspended', label: 'Organisation Suspended' },
  { value: 'trial_expiring', label: 'Trial Expiring' },
];

export default function BillingAlertModal({ open, org, onClose }) {
  const [alertType, setAlertType] = useState('payment_due');
  const [customMessage, setCustomMessage] = useState('');
  const [sendBillingAlert, { isLoading }] = useSendBillingAlertMutation();

  useEffect(() => {
    if (open) {
      setAlertType('payment_due');
      setCustomMessage('');
    }
  }, [open]);

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleSend = async () => {
    try {
      await sendBillingAlert({
        id: org.id,
        alertType,
        customMessage: customMessage.trim() || undefined,
      }).unwrap();

      message.success(`Billing alert queued for ${org.name}`);
      onClose();
    } catch (error) {
      message.error(parseError(error));
    }
  };

  return (
    <Modal open={open} onCancel={handleCancel} footer={null} width={460} centered>
      <div className="space-y-4">
        <div>
          <h3 className="text-[#e8e8f0] font-sans font-semibold text-sm">Send Billing Alert</h3>
          <p className="text-[#6b6b8a] text-xs mt-1">
            This sends an email to the organisation admin for {org?.name}.
          </p>
        </div>

        <div>
          <label className="block text-[10px] text-[#6b6b8a] uppercase tracking-widest mb-2">Alert Type</label>
          <Select
            value={alertType}
            onChange={setAlertType}
            options={ALERT_OPTIONS}
            className="w-full"
            size="large"
          />
        </div>

        <div>
          <label className="block text-[10px] text-[#6b6b8a] uppercase tracking-widest mb-2">Custom Message</label>
          <Input.TextArea
            value={customMessage}
            onChange={(event) => setCustomMessage(event.target.value)}
            rows={4}
            placeholder="Optional extra context for the org admin..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded-md text-xs font-sans text-[#6b6b8a] hover:text-[#e8e8f0] bg-[#161625] border border-[#1e1e35]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleSend}
            className="px-4 py-2 rounded-md text-xs font-['JetBrains_Mono'] font-semibold text-[#080810] bg-[#00d4ff] hover:bg-[#33ddff] disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Alert'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
