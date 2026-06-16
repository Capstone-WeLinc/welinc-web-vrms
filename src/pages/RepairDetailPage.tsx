import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import {
  getRepair,
  updateRepairStatus,
  updateRepairCosts,
  unlockRepairTicket,
  UpdateCostsPayload,
} from '../lib/api/repairApi';
import { RepairTicket, RepairStatus, AuditLogEntry, RepairPart } from '../types';
import { formatDate } from '../lib/utils/format';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/shared/StatusBadge';
import { useAuthStore } from '../store/authStore';

// ── Constants ─────────────────────────────────────────────────────────────────

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

const ACTION_LABELS: Record<string, string> = {
  STATUS_CHANGE: 'Status Changed',
  COST_UPDATE: 'Costs Updated',
  UNLOCK: 'Ticket Unlocked',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(val?: number | null): string {
  if (val == null) return '—';
  return `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function formatAuditValue(action: string, val?: string | null): string {
  if (!val) return '—';
  if (action === 'COST_UPDATE') {
    try {
      const parsed = JSON.parse(val);
      return `Parts: ₱${parsed.partsCost ?? 0}, Labor: ₱${parsed.laborCost ?? 0}`;
    } catch {
      return val;
    }
  }
  return val;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RepairDetailPage() {
  const { repairId } = useParams<{ repairId: string }>();
  const navigate = useNavigate();
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

  // Cost encoding state
  const [costMode, setCostMode] = useState<'lump' | 'itemized'>('lump');
  const [lumpPartsCost, setLumpPartsCost] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [itemParts, setItemParts] = useState<{ description: string; unitCost: string; quantity: string }[]>([
    { description: '', unitCost: '', quantity: '1' },
  ]);
  const [savingCosts, setSavingCosts] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);
  const [costSuccess, setCostSuccess] = useState(false);

  // Unlock modal state
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Audit log collapse state
  const [auditExpanded, setAuditExpanded] = useState(false);

  // ── Load ticket ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      if (!repairId) { navigate('/repairs'); return; }
      setLoading(true);
      setError(null);
      try {
        const data = await getRepair(repairId);
        setRepair(data);
        setStatus(data.status);
        // Pre-fill cost fields from existing data
        setLaborCost(data.laborCost != null ? String(data.laborCost) : '');
        if (data.isLumpSum !== undefined) {
          setCostMode(data.isLumpSum ? 'lump' : 'itemized');
        }
        if (data.partsCost != null && data.isLumpSum) {
          setLumpPartsCost(String(data.partsCost));
        }
        if (!data.isLumpSum && data.repairParts && data.repairParts.length > 0) {
          setItemParts(
            data.repairParts.map((p) => ({
              description: p.description,
              unitCost: String(p.unitCost),
              quantity: String(p.quantity),
            })),
          );
        }
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
  const isLocked = isTerminal && !repair?.isUnlocked;

  // Cost panel visible when FOR_VERIFICATION, or terminal tickets (COMPLETED/CANCELLED) that are unlocked
  const showCostPanel =
    isAdmin &&
    repair &&
    (repair.status === 'FOR_VERIFICATION' ||
      (isTerminal && repair.isUnlocked));

  // ── Computed totals ──────────────────────────────────────────────────────

  const computedPartsCost = useMemo(() => {
    if (costMode === 'lump') return parseFloat(lumpPartsCost) || 0;
    return itemParts.reduce((sum, p) => {
      const sub = (parseFloat(p.unitCost) || 0) * (parseInt(p.quantity) || 0);
      return sum + sub;
    }, 0);
  }, [costMode, lumpPartsCost, itemParts]);

  const computedTotalCost = computedPartsCost + (parseFloat(laborCost) || 0);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStatusChange = async () => {
    if (!repairId) return;
    if (status === 'CANCELLED' && !cancellationReason.trim()) {
      setError('A cancellation reason is required.');
      return;
    }
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
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Unable to update repair status.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCosts = async () => {
    if (!repairId) return;
    setSavingCosts(true);
    setCostError(null);
    setCostSuccess(false);
    try {
      const payload: UpdateCostsPayload = {
        isLumpSum: costMode === 'lump',
        laborCost: parseFloat(laborCost) || 0,
      };
      if (costMode === 'lump') {
        payload.partsCost = parseFloat(lumpPartsCost) || 0;
      } else {
        payload.parts = itemParts.map((p) => ({
          description: p.description,
          unitCost: parseFloat(p.unitCost) || 0,
          quantity: parseInt(p.quantity) || 1,
        }));
      }
      const updated = await updateRepairCosts(repairId, payload);
      setRepair(updated);
      setCostSuccess(true);
      setTimeout(() => setCostSuccess(false), 3000);
    } catch (err: any) {
      setCostError(err?.response?.data?.message ?? 'Unable to save costs.');
    } finally {
      setSavingCosts(false);
    }
  };

  const handleUnlock = async () => {
    if (!repairId || !unlockReason.trim()) {
      setUnlockError('An unlock reason is required.');
      return;
    }
    setUnlocking(true);
    setUnlockError(null);
    try {
      const updated = await unlockRepairTicket(repairId, unlockReason.trim());
      setRepair(updated);
      setShowUnlockModal(false);
      setUnlockReason('');
    } catch (err: any) {
      setUnlockError(err?.response?.data?.message ?? 'Unable to unlock ticket.');
    } finally {
      setUnlocking(false);
    }
  };

  const addItemPart = () =>
    setItemParts((prev) => [...prev, { description: '', unitCost: '', quantity: '1' }]);

  const removeItemPart = (idx: number) =>
    setItemParts((prev) => prev.filter((_, i) => i !== idx));

  const updateItemPart = (idx: number, field: string, val: string) =>
    setItemParts((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <PageHeader title="Repair Details" subtitle="Loading…" icon={Wrench} action={<Button onClick={() => navigate('/repairs')} variant="secondary">Back</Button>} />
        <div className="card">Loading repair details…</div>
      </div>
    );
  }

  if (error && !repair) {
    return (
      <div>
        <PageHeader title="Repair Details" subtitle="" icon={Wrench} action={<Button onClick={() => navigate('/repairs')} variant="secondary">Back</Button>} />
        <div className="card alert">{error}</div>
      </div>
    );
  }

  if (!repair) {
    return <div className="card">Repair not found.</div>;
  }

  return (
    <div>
      <PageHeader
        title="Repair Details"
        subtitle="View or update a repair ticket."
        icon={Wrench}
        action={
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {isAdmin && isTerminal && !repair.isUnlocked && (
              <Button onClick={() => setShowUnlockModal(true)} variant="secondary">
                Unlock Ticket
              </Button>
            )}
            <Button onClick={() => navigate('/repairs')} variant="secondary">
              Back to repairs
            </Button>
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
            <div className="issue-card" style={{ border: '1px solid #3b82f6', background: '#eff6ff' }}>
              <p className="label" style={{ marginTop: 0, color: '#1d4ed8' }}>Cost Encoding</p>

              {/* Mode toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button
                  id="cost-mode-lump"
                  onClick={() => setCostMode('lump')}
                  style={{
                    padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: costMode === 'lump' ? '#3b82f6' : '#e2e8f0',
                    color: costMode === 'lump' ? '#fff' : '#374151',
                    fontWeight: 600, fontSize: 13,
                  }}
                >
                  Lump Sum
                </button>
                <button
                  id="cost-mode-itemized"
                  onClick={() => setCostMode('itemized')}
                  style={{
                    padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: costMode === 'itemized' ? '#3b82f6' : '#e2e8f0',
                    color: costMode === 'itemized' ? '#fff' : '#374151',
                    fontWeight: 600, fontSize: 13,
                  }}
                >
                  Itemized Parts
                </button>
              </div>

              {/* Lump sum mode */}
              {costMode === 'lump' && (
                <div className="input-group">
                  <label className="label" htmlFor="lump-parts-cost">Parts cost (₱)</label>
                  <input
                    id="lump-parts-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    value={lumpPartsCost}
                    onChange={(e) => setLumpPartsCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Itemized mode */}
              {costMode === 'itemized' && (
                <div style={{ display: 'grid', gap: 12 }}>
                  {itemParts.map((p, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px auto', gap: 8, alignItems: 'end' }}>
                      <div className="input-group" style={{ margin: 0 }}>
                        {idx === 0 && <label className="label" htmlFor={`part-desc-${idx}`}>Description</label>}
                        <input
                          id={`part-desc-${idx}`}
                          className="input"
                          value={p.description}
                          onChange={(e) => updateItemPart(idx, 'description', e.target.value)}
                          placeholder="Part name / description"
                        />
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        {idx === 0 && <label className="label">Unit Cost (₱)</label>}
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={p.unitCost}
                          onChange={(e) => updateItemPart(idx, 'unitCost', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        {idx === 0 && <label className="label">Qty</label>}
                        <input
                          className="input"
                          type="number"
                          min="1"
                          value={p.quantity}
                          onChange={(e) => updateItemPart(idx, 'quantity', e.target.value)}
                        />
                      </div>
                      <button
                        onClick={() => removeItemPart(idx)}
                        disabled={itemParts.length === 1}
                        style={{ padding: '8px 10px', border: 'none', background: '#fee2e2', color: '#dc2626', borderRadius: 6, cursor: 'pointer', marginTop: idx === 0 ? 22 : 0 }}
                        title="Remove part"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    id="add-part-btn"
                    onClick={addItemPart}
                    style={{ padding: '8px 16px', border: '1px dashed #3b82f6', background: 'transparent', color: '#3b82f6', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                  >
                    + Add another part
                  </button>
                </div>
              )}

              {/* Labor cost */}
              <div className="input-group" style={{ marginTop: 16 }}>
                <label className="label" htmlFor="labor-cost">Labor cost (₱)</label>
                <input
                  id="labor-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Total preview */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '12px 0', borderTop: '1px solid #bfdbfe', marginTop: 12 }}>
                <span style={{ color: '#475569' }}>Parts: <strong>{formatCurrency(computedPartsCost)}</strong></span>
                <span style={{ color: '#475569' }}>Labor: <strong>{formatCurrency(parseFloat(laborCost) || 0)}</strong></span>
                <span style={{ color: '#1d4ed8', fontWeight: 700, fontSize: 15 }}>
                  Total: {formatCurrency(computedTotalCost)}
                </span>
              </div>

              {costError && <div className="alert" style={{ marginTop: 8 }}>{costError}</div>}
              {costSuccess && <div style={{ color: '#16a34a', fontWeight: 600, fontSize: 13, marginTop: 8 }}>✓ Costs saved successfully.</div>}

              <div style={{ marginTop: 12 }}>
                <Button id="save-costs-btn" onClick={handleSaveCosts} disabled={savingCosts}>
                  {savingCosts ? 'Saving…' : 'Save costs'}
                </Button>
              </div>
            </div>
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
            <div>
              <button
                id="audit-log-toggle"
                onClick={() => setAuditExpanded((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '8px 0', fontWeight: 600, fontSize: 14, color: '#374151',
                }}
              >
                <span>{auditExpanded ? '▾' : '▸'}</span>
                Audit Log ({repair.auditLog.length} {repair.auditLog.length === 1 ? 'entry' : 'entries'})
              </button>
              {auditExpanded && (
                <div style={{ marginTop: 8, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px' }}>Action</th>
                        <th style={{ padding: '8px 12px' }}>By</th>
                        <th style={{ padding: '8px 12px' }}>Before</th>
                        <th style={{ padding: '8px 12px' }}>After</th>
                        <th style={{ padding: '8px 12px' }}>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repair.auditLog.map((entry: AuditLogEntry) => (
                        <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </td>
                          <td style={{ padding: '8px 12px' }}>{entry.username}</td>
                          <td style={{ padding: '8px 12px', color: '#64748b' }}>
                            {formatAuditValue(entry.action, entry.previousValue)}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#16a34a' }}>
                            {formatAuditValue(entry.action, entry.newValue)}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#94a3b8', fontSize: 12 }}>
                            {formatDate(entry.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
                <Link to="/repairs" className="button secondary">Back</Link>
              </div>
            </>
          )}

          {/* ── Locked terminal state ─────────────────────────────── */}
          {isLocked && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
                This ticket is <strong>locked</strong> (status: {repair.status.replace('_', ' ')}).
                {isAdmin && ' Use the "Unlock Ticket" button above to make edits (reason required).'}
              </p>
              <div style={{ marginTop: 12 }}>
                <Link to="/repairs" className="button secondary">Back to repairs</Link>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Unlock Modal ──────────────────────────────────────────── */}
      {showUnlockModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12, padding: 32,
              maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 8px' }}>Unlock Ticket</h3>
            <p style={{ color: '#64748b', marginBottom: 20, fontSize: 14 }}>
              You are about to unlock this <strong>{repair.status.replace('_', ' ')}</strong> ticket for editing.
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
                onClick={() => { setShowUnlockModal(false); setUnlockReason(''); setUnlockError(null); }}
                disabled={unlocking}
              >
                Cancel
              </Button>
              <Button id="confirm-unlock-btn" onClick={handleUnlock} disabled={unlocking || !unlockReason.trim()}>
                {unlocking ? 'Unlocking…' : 'Unlock ticket'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
