import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Lock } from 'lucide-react';
import { getRepairs } from '../lib/api/repairApi';
import { RepairStatus, RepairTicket } from '../types';
import { formatDate } from '../lib/utils/format';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/shared/StatusBadge';

const statusOptions: Array<{ value: RepairStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'FOR_VERIFICATION', label: 'For Verification' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function RepairListPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RepairStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getRepairs(search, status || undefined);
        setRepairs(data);
      } catch (err) {
        setError('Unable to load repair tickets.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [search, status]);

  const filteredCount = useMemo(() => repairs.length, [repairs]);

  return (
    <div>
      <PageHeader
        title="Repair Tickets"
        subtitle={isAdmin ? 'Open repair tickets for VRMS.' : 'Your assigned repair tickets.'}
        icon={Wrench}
        action={isAdmin ? (
          <Link to="/repairs/new" className="button">
            New Repair Ticket
          </Link>
        ) : undefined}
      />

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1.5fr 1fr', alignItems: 'flex-end' }}>
          <div className="input-group">
            <label className="label" htmlFor="search">
              Search repairs
            </label>
            <input
              id="search"
              className="input"
              placeholder="Search by repair number, vehicle, or driver"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="label" htmlFor="statusFilter">
              Status filter
            </label>
            <select
              id="statusFilter"
              className="select"
              value={status}
              onChange={(event) => setStatus(event.target.value as RepairStatus | '')}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading repair tickets…</p>
        ) : error ? (
          <div className="alert">{error}</div>
        ) : repairs.length === 0 ? (
          <p>No open tickets found.</p>
        ) : (
          <>
            <p style={{ marginTop: 0, marginBottom: 16, color: '#475569' }}>
              Showing {filteredCount} repair ticket{filteredCount === 1 ? '' : 's'}.
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Repair #</th>
                  <th>Vehicle</th>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {repairs.map((repair) => {
                  const isLocked = repair.status === 'COMPLETED' || repair.status === 'CANCELLED';
                  return (
                    <tr key={repair.id} style={isLocked ? { opacity: 0.65 } : undefined}>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Link to={`/repairs/${repair.id}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            {repair.repairNumber}
                          </Link>
                          {isLocked && <Lock size={12} style={{ color: 'var(--muted)' }} />}
                        </div>
                      </td>
                      <td>{repair.vehiclePlate}</td>
                      <td>{repair.issueDescription}</td>
                      <td>
                        <StatusBadge status={repair.status} />
                      </td>
                      <td>{formatDate(repair.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
