import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Wrench, ArrowLeft } from 'lucide-react';
import { getRepair, updateRepairStatus } from '../../../lib/api/repairApi';
import { RepairTicket, RepairStatus } from '../../../types';
import { formatDate } from '../../../lib/utils/format';
import { Button } from '../../../components/ui/Button';
import { PageHeader } from '../../../components/layout/PageHeader';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { useAuthStore } from '../../../store/authStore';
import { CostEncodingPanel } from '../components/CostEncodingPanel';
import { AuditLogCollapsible } from '../components/AuditLogCollapsible';
import { UnlockTicketModal } from '../components/UnlockTicketModal';
import { useToast } from '../../../context/ToastContext';
import ConfirmModal from '../../../components/ConfirmModal';
import { useConfirm } from '../../../hooks/useConfirm';

const allStatusOptions: Array<{ value: RepairStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'FOR_VERIFICATION', label: 'For Verification' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const mechanicStatusOptions: Array<{ value: RepairStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'FOR_VERIFICATION', label: 'For Verification' },
];

const TERMINAL: RepairStatus[] = ['COMPLETED', 'CANCELLED'];

function formatCurrency(val?: number | null): string {
  if (val == null) return '—';
  return `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

export function RepairDetailPage() {
  const { repairId } = useParams<{ repairId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReadOnlyMode = searchParams.get('mode') === 'readonly';
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const statusOptions = isAdmin ? allStatusOptions : mechanicStatusOptions;

  // Core state
  const [repair, setRepair] = useState<RepairTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update state
  const [status, setStatus] = useState<RepairStatus>('PENDING');
  const [remarks, setRemarks] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Unlock modal state
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const { showToast } = useToast();
  const { confirmState, triggerConfirm, closeConfirm } = useConfirm();

  useEffect(() => {
    async function load() {
      if (!repairId) { navigate('/repairs'); return; }
      setLoading(true);
      setError(null);
      try {
        const data = await getRepair(repairId);
        setRepair(data);
        setStatus(data.status);
      } catch {
        setError('Unable to load repair details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [repairId, navigate]);

  const mechanics = useMemo(() => repair?.mechanics ?? [], [repair]);
  const isTerminal = repair ? TERMINAL.includes(repair.status) : false;
  const isLocked = isReadOnlyMode || (isTerminal && !repair?.isUnlocked);

  const showCostPanel =
    !isReadOnlyMode &&
    isAdmin &&
    repair &&
    (repair.status === 'FOR_VERIFICATION' ||
      (isTerminal && repair.isUnlocked));

  const executeStatusChange = async () => {
    if (!repairId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateRepairStatus(repairId, status, {
        cancellationReason: status === 'CANCELLED' ? cancellationReason : undefined,
        remarks: remarks.trim() || undefined,
      });
      setRepair(updated);
      setRemarks('');
      setCancellationReason('');
      showToast(`Repair status updated to ${status.replace('_', ' ')} successfully.`, 'success');
    } catch (err: any) {
      const displayMsg = err?.response?.data?.message ?? 'Unable to update repair status.';
      setError(displayMsg);
      showToast(displayMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = () => {
    if (!repairId) return;
    if (status === 'CANCELLED' && !cancellationReason.trim()) {
      setError('A cancellation reason is required.');
      return;
    }

    const statusLabel = allStatusOptions.find((o) => o.value === status)?.label || status;

    triggerConfirm({
      title: 'Update Repair Status?',
      message: `Are you sure you want to change the repair status to "${statusLabel}"?`,
      confirmText: 'Save Status',
      onConfirm: executeStatusChange,
    });
  };

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => navigate('/repairs')} className="sidebar-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
             <ArrowLeft size={16} /> Back to repairs
          </button>
        </div>
        <PageHeader title="Repair Details" subtitle="Loading…" icon={Wrench} />
        <div className="card">Loading repair details…</div>
      </div>
    );
  }

  if (error && !repair) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => navigate('/repairs')} className="sidebar-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
             <ArrowLeft size={16} /> Back to repairs
          </button>
        </div>
        <PageHeader title="Repair Details" subtitle="" icon={Wrench} />
        <div className="card alert">{error}</div>
      </div>
    );
  }

  if (!repair) {
    return <div className="card">Repair not found.</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate('/repairs')} className="sidebar-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
           <ArrowLeft size={16} /> Back to repairs
        </button>
      </div>
      <PageHeader
        title="Repair Details"
        subtitle="View or update a repair ticket."
        icon={Wrench}
        action={
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {isAdmin && isTerminal && !repair.isUnlocked && !isReadOnlyMode && (
              <Button onClick={() => setShowUnlockModal(true)} variant="secondary">
                Unlock Ticket
              </Button>
            )}
          </div>
        }
      />

      <div className="card" style={{ maxWidth: 960 }}>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* ── Header ─────────────────────────────────────────────── */}
          <div>
            <p style={{ margin: 0, color: '#6b7280', fontSize: 12 }}>Repair Number</p>
            <h3 style={{ margin: '8px 0 0' }}>{repair.repairNumber}</h3>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge status={repair.status} />
            {repair.isUnlocked && (
              <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                Unlocked for editing
              </span>
            )}
            <p style={{ margin: 0, color: '#475569' }}>Updated {formatDate(repair.updatedAt)}</p>
            <p style={{ margin: 0, color: '#475569' }}>Created {formatDate(repair.createdAt)}</p>
            {repair.completedAt && (
              <p style={{ margin: 0, color: '#475569' }}>Completed {formatDate(repair.completedAt)}</p>
            )}
          </div>

          {/* ── Core Details ───────────────────────────────────────── */}
          <div className="detail-grid">
            <div>
              <p className="label">Garage location</p>
              <p>{repair.garageLocation ?? 'Not assigned'}</p>
            </div>
            <div>
              <p className="label">Odometer</p>
              <p>{repair.odometerReading != null ? `${repair.odometerReading.toLocaleString()} km` : 'Not recorded'}</p>
            </div>
            {repair.cancellationReason && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="label">Cancellation reason</p>
                <p style={{ color: '#dc2626' }}>{repair.cancellationReason}</p>
              </div>
            )}
            {repair.failedVerificationReason && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="label">Failed verification reason</p>
                <p style={{ color: '#dc2626' }}>{repair.failedVerificationReason}</p>
              </div>
            )}
            {repair.remarks && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="label">Remarks</p>
                <p style={{ fontStyle: 'italic' }}>{repair.remarks}</p>
              </div>
            )}
          </div>

          <div>
            <p className="label">Vehicle plate</p>
            <p>{repair.vehiclePlate}</p>
          </div>
          <div>
            <p className="label">Driver</p>
            <p>
              {repair.driverName}
              {isAdmin && repair.driverIsVerified != null && (
                <span style={{ marginLeft: 8, fontSize: 12, color: repair.driverIsVerified ? '#16a34a' : '#dc2626' }}>
                  {repair.driverIsVerified ? '✓ Verified' : '⚠ Unverified'}
                </span>
              )}
            </p>
          </div>

          {/* ── Mechanics ─────────────────────────────────────────── */}
          {mechanics.length > 0 && (
            <div>
              <p className="label">Assigned mechanics</p>
              <div className="mechanic-list">
                {mechanics.map((mechanic) => (
                  <span key={mechanic.id} className="tag-pill">
                    {mechanic.name}{mechanic.isOutsourced ? ` (outsourced${mechanic.shopName ? ` — ${mechanic.shopName}` : ''})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Issues ───────────────────────────────────────────── */}
          {repair.issues && repair.issues.length > 0 && (
            <div>
              <p className="label">Logged issues</p>
              <div style={{ display: 'grid', gap: 14 }}>
                {repair.issues.map((issue, index) => (
                  <div key={issue.id} className="issue-card">
                    <strong>Issue {index + 1}</strong>
                    <p style={{ margin: '8px 0 0' }}>{issue.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Cost Summary (Admin only) ─────────────────────────── */}
          {isAdmin && (repair.totalCost != null || repair.partsCost != null || repair.laborCost != null) && (
            <div className="issue-card" style={{ background: 'var(--surface-2, #f8fafc)' }}>
              <p className="label" style={{ marginTop: 0 }}>Cost summary</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                <div>
                  <p className="label">Parts cost</p>
                  <p style={{ fontWeight: 600 }}>{formatCurrency(repair.partsCost)}</p>
                </div>
                <div>
                  <p className="label">Labor cost</p>
                  <p style={{ fontWeight: 600 }}>{formatCurrency(repair.laborCost)}</p>
                </div>
                <div>
                  <p className="label">Total cost</p>
                  <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>{formatCurrency(repair.totalCost)}</p>
                </div>
              </div>
              {repair.isLumpSum === false && repair.repairParts && repair.repairParts.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p className="label">Itemized parts</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px' }}>Description</th>
                        <th style={{ padding: '6px 8px' }}>Unit Cost</th>
                        <th style={{ padding: '6px 8px' }}>Qty</th>
                        <th style={{ padding: '6px 8px' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repair.repairParts.map((p, i) => (
                        <tr key={p.id ?? i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px' }}>{p.description}</td>
                          <td style={{ padding: '6px 8px' }}>{formatCurrency(p.unitCost)}</td>
                          <td style={{ padding: '6px 8px' }}>{p.quantity}</td>
                          <td style={{ padding: '6px 8px' }}>{formatCurrency(p.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Cost Encoding Panel (Admin only, available at FOR_VERIFICATION+) ─ */}
          {showCostPanel && (
            <CostEncodingPanel
              repairId={repairId!}
              repair={repair}
              onSaveSuccess={(updated) => setRepair(updated)}
              formatCurrency={formatCurrency}
            />
          )}

          {/* ── Shop Change Log (Admin only) ──────────────────────── */}
          {isAdmin && repair.shopChangeLog && repair.shopChangeLog.length > 0 && (
            <div>
              <p className="label">Shop change history</p>
              <div style={{ display: 'grid', gap: 12 }}>
                {repair.shopChangeLog.map((entry, index) => (
                  <div key={`${entry.changedAt}-${index}`} className="issue-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{entry.changedBy}</span>
                      <span style={{ color: '#475569', fontSize: 12 }}>{formatDate(entry.changedAt)}</span>
                    </div>
                    <p style={{ margin: '8px 0 2px' }}><strong>Before:</strong> {entry.previousValue}</p>
                    <p style={{ margin: 0 }}><strong>After:</strong> {entry.newValue}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Audit Log (Admin only, collapsible) ───────────────── */}
          {isAdmin && repair.auditLog && repair.auditLog.length > 0 && (
            <AuditLogCollapsible
              auditLog={repair.auditLog}
              formatDate={formatDate}
            />
          )}

          {/* ── Status Controls (visible for non-locked tickets) ───── */}
          {!isLocked && (
            <>
              <div className="input-group">
                <label className="label" htmlFor="status">Update status</label>
                <select
                  id="status"
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as RepairStatus)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {status === 'CANCELLED' && (
                <div className="input-group">
                  <label className="label" htmlFor="cancel-reason">Cancellation reason <span style={{ color: '#dc2626' }}>*</span></label>
                  <textarea
                    id="cancel-reason"
                    className="input"
                    rows={3}
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Provide a reason for cancellation…"
                    style={{ resize: 'vertical' }}
                  />
                </div>
              )}

              <div className="input-group">
                <label className="label" htmlFor="remarks">Remarks (optional)</label>
                <textarea
                  id="remarks"
                  className="input"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any notes about this status change…"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {error && <div className="alert">{error}</div>}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Button
                  id="save-status-btn"
                  onClick={handleStatusChange}
                  disabled={saving || status === repair.status}
                >
                  {saving ? 'Saving…' : 'Save status'}
                </Button>
              </div>
            </>
          )}

          {/* ── Locked terminal state ─────────────────────────────── */}
          {isLocked && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
                This ticket is <strong>locked</strong> (status: {repair.status.replace('_', ' ')}).
                {isAdmin && !isReadOnlyMode && ' Use the "Unlock Ticket" button above to make edits (reason required).'}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* ── Unlock Modal ──────────────────────────────────────────── */}
      {showUnlockModal && (
        <UnlockTicketModal
          repairId={repairId!}
          repairNumber={repair.repairNumber}
          repairStatus={repair.status}
          onUnlockSuccess={(updated) => setRepair(updated)}
          onClose={() => setShowUnlockModal(false)}
        />
      )}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
