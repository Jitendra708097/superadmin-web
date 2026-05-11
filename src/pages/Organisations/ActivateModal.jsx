import { useState } from 'react';
import { Modal, Input, message } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useActivateOrgMutation } from '@store/api/orgApi.js';
import { parseError } from '@utils/errorHandler.js';

const { TextArea } = Input;

export default function ActivateModal({ open, org, onClose }) {
  const [reason, setReason] = useState('');
  const [activateOrg, { isLoading }] = useActivateOrgMutation();

  const handleConfirm = async () => {
    if (!reason.trim()) {
      message.error('Reason is required');
      return;
    }

    try {
      await activateOrg({ id: org.id, reason: reason.trim() }).unwrap();
      message.success(`${org.name} activated`);
      setReason('');
      onClose();
    } catch (err) {
      message.error(parseError(err));
    }
  };

  const handleCancel = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal open={open} onCancel={handleCancel} footer={null} width={440} centered>
      <div className="p-1">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center">
            <CheckCircleOutlined className="text-[#00ff88] text-base" />
          </div>
          <div>
            <h3 className="text-[#e8e8f0] font-sans font-semibold text-sm">Activate Organisation</h3>
            <p className="text-[#6b6b8a] text-xs mt-0.5">
              Restore access for <span className="text-[#e8e8f0] font-medium">{org?.name}</span>.
            </p>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-[10px] text-[#6b6b8a] uppercase tracking-widest mb-2 font-sans">
            Reason for activation <span className="text-[#ff3366]">*</span>
          </label>
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Payment resolved, support review complete..."
            rows={3}
            maxLength={500}
            showCount
          />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={handleCancel} className="px-4 py-1.5 rounded text-sm font-sans text-[#6b6b8a] hover:text-[#e8e8f0] hover:bg-[#161625] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            className="px-4 py-1.5 rounded text-sm font-sans font-medium bg-[#00ff88] text-[#080810] hover:bg-[#35ffaa] disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Activating...' : 'Activate Organisation'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
