import { useState } from 'react';
import { Modal, Input, Select, Spin, message } from 'antd';
import { UserSwitchOutlined } from '@ant-design/icons';
import { useGetOrgEmployeesQuery, useTransferOrgOwnerMutation } from '@store/api/orgApi.js';
import { parseError } from '@utils/errorHandler.js';

const { TextArea } = Input;

export default function TransferOwnerModal({ open, org, onClose }) {
  const [employeeId, setEmployeeId] = useState(null);
  const [reason, setReason] = useState('');
  const { data, isLoading: employeesLoading } = useGetOrgEmployeesQuery(
    { id: org?.id, params: { limit: 100, status: 'active' } },
    { skip: !open || !org?.id }
  );
  const [transferOwner, { isLoading }] = useTransferOrgOwnerMutation();
  const employees = data?.data?.employees || [];

  const handleConfirm = async () => {
    if (!employeeId) {
      message.error('Select the new owner');
      return;
    }
    if (!reason.trim()) {
      message.error('Reason is required');
      return;
    }

    try {
      await transferOwner({ id: org.id, employeeId, reason: reason.trim() }).unwrap();
      message.success('Organisation owner transferred');
      setEmployeeId(null);
      setReason('');
      onClose();
    } catch (err) {
      message.error(parseError(err));
    }
  };

  const handleClose = () => {
    setEmployeeId(null);
    setReason('');
    onClose();
  };

  return (
    <Modal open={open} onCancel={handleClose} footer={null} width={480} centered title={null}>
      <div className="p-1">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-[#a855f7]/10 border border-[#a855f7]/30 flex items-center justify-center flex-shrink-0">
            <UserSwitchOutlined className="text-[#a855f7] text-base" />
          </div>
          <div>
            <h3 className="text-[#e8e8f0] font-sans font-semibold text-sm">Transfer Owner</h3>
            <p className="text-[#6b6b8a] text-xs mt-0.5">
              Current owner: <span className="text-[#e8e8f0]">{org?.ownerEmail || 'Not set'}</span>
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[10px] text-[#6b6b8a] uppercase tracking-widest mb-2 font-sans">
            New owner
          </label>
          {employeesLoading ? (
            <div className="flex justify-center py-4"><Spin /></div>
          ) : (
            <Select
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="Select active employee"
              showSearch
              optionFilterProp="label"
              className="w-full"
              options={employees.map((employee) => ({
                value: employee.id,
                label: `${employee.name} - ${employee.email}`,
                disabled: employee.id === org?.ownerId,
              }))}
            />
          )}
        </div>

        <div className="mb-5">
          <label className="block text-[10px] text-[#6b6b8a] uppercase tracking-widest mb-2 font-sans">
            Reason <span className="text-[#ff3366]">*</span>
          </label>
          <TextArea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Primary admin changed, customer requested owner transfer..."
            rows={3}
            maxLength={500}
            showCount
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded text-sm font-sans text-[#6b6b8a] hover:text-[#e8e8f0] hover:bg-[#161625] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !employeeId || !reason.trim()}
            className="px-4 py-1.5 rounded text-sm font-sans font-medium bg-[#a855f7] text-white hover:bg-[#b56cff] disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Transferring...' : 'Transfer Owner'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
