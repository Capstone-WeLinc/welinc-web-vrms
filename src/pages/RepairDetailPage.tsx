import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getRepair, updateRepairStatus } from '../lib/api/repairApi';
import { RepairTicket, RepairStatus } from '../types';
import { buildStatusClass, formatDate } from '../lib/utils/format';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/shared/StatusBadge';

const statusOptions: Array<{ value: RepairStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'FOR_VERIFICATION', label: 'For Verification' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function RepairDetailPage() {
  const { repairId } = useParams<{ repairId: string }>();
  const navigate = useNavigate();
  const [repair, setRepair] = useState<RepairTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<RepairStatus>('PENDING');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!repairId) {
        navigate('/repairs');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await getRepair(repairId);
        setRepair(data);
        setStatus(data.status);
      } catch (err) {
        setError('Unable to load repair details.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [repairId, navigate]);

  const handleStatusChange = async () => {
    if (!repairId) return;
    setSaving(true);
    setError(null);

    try {
      const updated = await updateRepairStatus(repairId, status);
      setRepair(updated);
    } catch (err) {
      setError('Unable to update repair status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Repair Details"
        subtitle="View or update a repair ticket."
        action={
          <Button onClick={() => navigate('/repairs')} variant="secondary">
            Back to repairs
          </Button>
        }
      />
      {loading ? (
        <div className="card">Loading repair details…</div>
      ) : error ? (
        <div className="card alert">{error}</div>
      ) : repair ? (
        <div className="card" style={{ maxWidth: 760 }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: 12 }}>Repair Number</p>
              <h3 style={{ margin: '8px 0 0' }}>{repair.repairNumber}</h3>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <StatusBadge status={repair.status} />
              <p style={{ margin: 0, color: '#475569' }}>
                Updated {formatDate(repair.updatedAt)}
              </p>
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div>
                <p className="label">Vehicle Plate</p>
                <p>{repair.vehiclePlate}</p>
              </div>
              <div>
                <p className="label">Driver</p>
                <p>{repair.driverName}</p>
              </div>
            </div>
            <div>
              <p className="label">Issue Description</p>
              <p>{repair.issueDescription}</p>
            </div>
            <div>
              <p className="label">Total Cost</p>
              <p>{repair.totalCost != null ? `₱ ${repair.totalCost.toFixed(2)}` : 'Unassigned'}</p>
            </div>
            <div className="input-group">
              <label className="label" htmlFor="status">
                Update status
              </label>
              <select
                id="status"
                className="select"
                value={status}
                onChange={(event) => setStatus(event.target.value as RepairStatus)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {error ? <div className="alert">{error}</div> : null}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Button onClick={handleStatusChange} disabled={saving || status === repair.status}>
                {saving ? 'Saving…' : 'Save status'}
              </Button>
              <Link to="/repairs" className="button secondary">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">Repair not found.</div>
      )}
    </div>
  );
}
