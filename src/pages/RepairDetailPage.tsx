import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getRepair, updateRepairStatus } from '../lib/api/repairApi';
import { RepairTicket, RepairStatus } from '../types';
import { buildStatusClass, formatDate } from '../lib/utils/format';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/shared/StatusBadge';
import { useAuthStore } from '../store/authStore';

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

export function RepairDetailPage() {
  const { repairId } = useParams<{ repairId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const statusOptions = isAdmin ? allStatusOptions : mechanicStatusOptions;
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

  const mechanics = useMemo(() => repair?.mechanics ?? [], [repair]);

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
        <div className="card" style={{ maxWidth: 900 }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: 12 }}>Repair Number</p>
              <h3 style={{ margin: '8px 0 0' }}>{repair.repairNumber}</h3>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <StatusBadge status={repair.status} />
              <p style={{ margin: 0, color: '#475569' }}>
                Updated {formatDate(repair.updatedAt)}
              </p>
              <p style={{ margin: 0, color: '#475569' }}>
                Created {formatDate(repair.createdAt)}
              </p>
            </div>

            <div className="detail-grid">
              <div>
                <p className="label">Account type</p>
                <p>{repair.accountType ?? 'Online'}</p>
              </div>
              {repair.corporation ? (
                <div>
                  <p className="label">Corporation</p>
                  <p>{repair.corporation}</p>
                </div>
              ) : null}
              <div>
                <p className="label">Garage location</p>
                <p>{repair.garageLocation ?? 'Not assigned'}</p>
              </div>
              <div>
                <p className="label">Odometer</p>
                <p>{repair.odometerReading != null ? `${repair.odometerReading.toLocaleString()} km` : 'Not recorded'}</p>
              </div>
              <div>
                <p className="label">Priority</p>
                <p>{repair.priority ?? 'Medium'}</p>
              </div>
              <div>
                <p className="label">Shop name</p>
                <p>{repair.shopName ?? 'Not assigned'}</p>
              </div>
            </div>

            <div>
              <p className="label">Vehicle plate</p>
              <p>{repair.vehiclePlate}</p>
            </div>

            <div>
              <p className="label">Driver</p>
              <p>{repair.driverName}</p>
            </div>

            <div>
              <p className="label">Issue description</p>
              <p>{repair.issueDescription}</p>
            </div>

            {mechanics.length > 0 && (
              <div>
                <p className="label">Assigned mechanics</p>
                <div className="mechanic-list">
                  {mechanics.map((mechanic) => (
                    <span key={mechanic.id} className="tag-pill">
                      {mechanic.name}{mechanic.isOutsourced ? ' (outsourced)' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {repair.issues && repair.issues.length > 0 && (
              <div>
                <p className="label">Logged issues</p>
                <div style={{ display: 'grid', gap: 14 }}>
                  {repair.issues.map((issue, index) => (
                    <div key={issue.id} className="issue-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <strong>Issue {index + 1}</strong>
                        <span className="tag-pill">{issue.vehicleSystem}</span>
                      </div>
                      <p style={{ margin: '10px 0 2px' }}><strong>Root cause:</strong> {issue.rootCause}</p>
                      <p style={{ margin: 0 }}>{issue.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {repair.shopChangeLog && repair.shopChangeLog.length > 0 && (
              <div>
                <p className="label">Shop change history</p>
                <div style={{ display: 'grid', gap: 12 }}>
                  {repair.shopChangeLog.map((entry, index) => (
                    <div key={`${entry.changedAt}-${index}`} className="issue-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <span>{entry.changedBy}</span>
                        <span style={{ color: '#475569', fontSize: 12 }}>{formatDate(entry.changedAt)}</span>
                      </div>
                      <p style={{ margin: '8px 0 2px' }}><strong>Before:</strong> {entry.previousValue}</p>
                      <p style={{ margin: 0 }}><strong>After:</strong> {entry.newValue}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status controls — hidden for terminal tickets; mechanics can't complete/cancel */}
            {!TERMINAL.includes(repair.status) && (
              <>
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
                    Back
                  </Link>
                </div>
              </>
            )}
            {TERMINAL.includes(repair.status) && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link to="/repairs" className="button secondary">
                  Back to repairs
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card">Repair not found.</div>
      )}
    </div>
  );
}
