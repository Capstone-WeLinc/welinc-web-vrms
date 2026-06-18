import { useState } from 'react';
import { unlockRepairTicket } from '../../../lib/api/repairApi';
import { RepairTicket } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';

interface UnlockTicketModalProps {
  repairId: string;
  repairNumber: string;
  repairStatus: string;
  onUnlockSuccess: (updated: RepairTicket) => void;
  onClose: () => void;
}

export function UnlockTicketModal({
  repairId,
  repairNumber,
  repairStatus,
  onUnlockSuccess,
  onClose,
}: UnlockTicketModalProps) {
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleUnlock = async () => {
    if (!unlockReason.trim()) {
      setUnlockError('An unlock reason is required.');
      return;
    }
    setUnlocking(true);
    setUnlockError(null);
    try {
      const updated = await unlockRepairTicket(repairId, unlockReason.trim());
      onUnlockSuccess(updated);
      showToast(`Repair ticket ${repairNumber} has been unlocked successfully.`, 'success');
      onClose();
    } catch (err: any) {
      const displayMsg = err?.response?.data?.message ?? 'Unable to unlock ticket.';
      setUnlockError(displayMsg);
      showToast(displayMsg, 'error');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 32,
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <h3 style={{ margin: '0 0 8px' }}>Unlock Ticket</h3>
        <p style={{ color: '#64748b', marginBottom: 20, fontSize: 14 }}>
          You are about to unlock this <strong>{repairStatus.replace('_', ' ')}</strong> ticket for editing.
          This action will be permanently recorded in the audit log.
        </p>
        <div className="input-group">
          <label className="label" htmlFor="unlock-reason">
            Reason for unlocking <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            id="unlock-reason"
            className="input"
            rows={3}
            value={unlockReason}
            onChange={(e) => setUnlockReason(e.target.value)}
            placeholder="Explain why this ticket needs to be edited…"
            style={{ resize: 'vertical' }}
          />
        </div>
        {unlockError && <div className="alert" style={{ marginTop: 8 }}>{unlockError}</div>}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={unlocking}
          >
            Cancel
          </Button>
          <Button
            id="confirm-unlock-btn"
            onClick={handleUnlock}
            disabled={unlocking || !unlockReason.trim()}
          >
            {unlocking ? 'Unlocking…' : 'Unlock ticket'}
          </Button>
        </div>
      </div>
    </div>
  );
}
