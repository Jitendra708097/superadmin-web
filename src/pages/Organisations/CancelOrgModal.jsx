import { useState } from 'react';
import { Modal, Input, message } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import { useCancelOrgMutation } from '@store/api/orgApi.js';
import { parseError } from '@utils/errorHandler.js';

const { TextArea } = Input;

export default function CancelOrgModal({ open, org, onClose }) {
  const [reason, setReason] = useState('');
  const [cancelOrg, { isLoading }] = useCancelOrgMutation();

  const handleConfirm = async () => {
    if (!reason.trim()) {
      message.error('Reason is required');
      return;
    }

    try {
      await cancelOrg({ id: org.id, reason: reason.trim() }).unwrap();
      message.success(`${org.name} cancelled`);
      setReason('');
      onClose();
    } catch (err) {
      message.error(parseError(err));
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal open={open} onCancel={handleClose} footer={null} width={460} centered title={null}>
      <div className="p-1">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-[#ff3366]/10 border border-[#ff3366]/30 flex items-center justify-center flex-shrink-0">
            <CloseCircleOutlined className="text-[#ff3366] text-base" />
          </div>
          <div>
            <h3 className="text-[#e8e8f0] font-sans font-semibold text-sm">
              Cancel Organisation
            </h3>
            <p className="text-[#6b6b8a] text-xs mt-0.5">
              This marks <span className="text-[#e8e8f0] font-medium">{org?.name}</span> as cancelled and ends access.
            </p>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-[10px] text-[#6b6b8a] uppercase tracking-widest mb-2 font-sans">
            Reason for cancellation <span className="text-[#ff3366]">*</span>
          </label>
          <TextArea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Customer requested cancellation, contract ended..."
            rows={3}
            maxLength={500}
            showCount
            className="font-sans text-sm"
          />
        </div>

        <div className="bg-[#ff3366]/8 border border-[#ff3366]/20 rounded-md px-3 py-2.5 mb-5">
          <p className="text-[#ff3366] text-xs font-sans">
            This records a cancellation lifecycle event and terminates active organisation sessions.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded text-sm font-sans text-[#6b6b8a] hover:text-[#e8e8f0] hover:bg-[#161625] transition-colors"
          >
            Keep Organisation
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            className="px-4 py-1.5 rounded text-sm font-sans font-medium bg-[#ff3366] text-white hover:bg-[#ff5580] disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Cancelling...' : 'Cancel Organisation'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
