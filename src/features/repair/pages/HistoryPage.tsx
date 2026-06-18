import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Lock, Search } from 'lucide-react';
import { getRepairHistory } from '../../../lib/api/repairApi';
import { RepairTicket } from '../../../types';
import { formatDate } from '../../../lib/utils/format';
import { useAuthStore } from '../../../store/authStore';
import { PageHeader } from '../../../components/layout/PageHeader';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { Button } from '../../../components/ui/Button';

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const paginatedRepairs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return repairs.slice(start, start + itemsPerPage);
  }, [repairs, currentPage]);

  const totalPages = Math.ceil(repairs.length / itemsPerPage);

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
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              id="historySearch"
              className="input"
              style={{ paddingLeft: 38 }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by repair #, vehicle, or driver"
            />
          </div>
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
          <>
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
                {paginatedRepairs.map((repair) => {
                  const isLocked = repair.status === 'COMPLETED' || repair.status === 'CANCELLED';
                  return (
                    <tr key={repair.id} style={isLocked ? { opacity: 0.65 } : undefined}>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Link to={`/repairs/${repair.id}?mode=readonly`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            {repair.repairNumber}
                          </Link>
                          {isLocked && <Lock size={12} style={{ color: 'var(--muted)' }} />}
                        </div>
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
                          to={`/repairs/${repair.id}?mode=readonly`}
                          className="button secondary"
                          style={{ fontSize: 12, padding: '4px 12px' }}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
                <Button
                  variant="secondary"
                  style={{ padding: '6px 12px', fontSize: 13 }}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  Previous
                </Button>
                <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  style={{ padding: '6px 12px', fontSize: 13 }}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
