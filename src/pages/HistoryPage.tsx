import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { getRepairHistory } from '../lib/api/repairApi';
import { RepairTicket } from '../types';
import { formatDate } from '../lib/utils/format';
import { useAuthStore } from '../store/authStore';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/shared/StatusBadge';

function formatCurrency(val?: number | null): string {
  if (val == null) return '—';
  return `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

export function HistoryPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      setError(null);
      setLoading(true);
      try {
        const data = await getRepairHistory(search);
        setRepairs(data);
      } catch (err) {
        setError('Unable to load repair history.');
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [search]);

  return (
    <div>
      <PageHeader
        title="Repair History"
        subtitle="Historical log of all completed and cancelled repairs."
        icon={History}
      />
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="input-group">
          <label className="label" htmlFor="historySearch">
            Search history
          </label>
          <input
            id="historySearch"
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by repair #, vehicle, or driver"
          />
        </div>
      </div>
      <div className="card">
        {loading ? (
          <p>Loading completed repairs…</p>
        ) : error ? (
          <div className="alert">{error}</div>
        ) : repairs.length === 0 ? (
          <p>No history records available.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Repair #</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Garage</th>
                <th>Status</th>
                {isAdmin && <th>Total Cost</th>}
                <th>Closed At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {repairs.map((repair) => (
                <tr key={repair.id}>
                  <td>
                    <Link to={`/repairs/${repair.id}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      {repair.repairNumber}
                    </Link>
                  </td>
                  <td>{repair.vehiclePlate}</td>
                  <td>{repair.driverName}</td>
                  <td>{repair.garageLocation ?? '—'}</td>
                  <td>
                    <StatusBadge status={repair.status} />
                  </td>
                  {isAdmin && <td>{formatCurrency(repair.totalCost)}</td>}
                  <td>{formatDate(repair.completedAt ?? repair.updatedAt)}</td>
                  <td>
                    <Link
                      to={`/repairs/${repair.id}`}
                      className="button secondary"
                      style={{ fontSize: 12, padding: '4px 12px' }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
