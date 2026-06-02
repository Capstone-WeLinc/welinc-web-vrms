import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRepairs } from '../lib/api/repairApi';
import { RepairStatus, RepairTicket } from '../types';
import { buildStatusClass, formatDate } from '../lib/utils/format';
import { Button } from '../components/ui/Button';

const statusOptions: Array<{ value: RepairStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'FOR_VERIFICATION', label: 'For Verification' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function RepairListPage() {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h2 className="page-title">Repair Tickets</h2>
          <p style={{ margin: 0, color: '#374151' }}>Open repair tickets for VRMS.</p>
        </div>
        <Link to="/repairs/new" className="button">
          New Repair Ticket
        </Link>
      </div>

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
                {repairs.map((repair) => (
                  <tr key={repair.id}>
                    <td>
                      <Link to={`/repairs/${repair.id}`} style={{ color: '#1d4ed8' }}>
                        {repair.repairNumber}
                      </Link>
                    </td>
                    <td>{repair.vehiclePlate}</td>
                    <td>{repair.issueDescription}</td>
                    <td>
                      <span className={buildStatusClass(repair.status)}>{repair.status.replace('_', ' ')}</span>
                    </td>
                    <td>{formatDate(repair.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
