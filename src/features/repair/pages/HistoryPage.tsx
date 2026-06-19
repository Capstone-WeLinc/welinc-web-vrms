import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { History, Lock, Search, MoreVertical, Eye } from 'lucide-react';
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
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const navigate = useNavigate();
  const itemsPerPage = 10;

  useEffect(() => {
    async function loadHistory() {
      setError(null);
      setLoading(true);
      try {
        const response = await getRepairHistory(search, currentPage, itemsPerPage);
        setRepairs(response.data);
        setTotalCount(response.total);
      } catch (err) {
        setError('Unable to load repair history.');
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [search, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  return (
    <div>
      <PageHeader
        title="Repair History"
        subtitle="Historical log of all completed and cancelled repairs."
        icon={History}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
         <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '600px' }}>
           <div style={{ position: 'relative', flex: 1 }}>
             <Search size={18} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--muted)' }} />
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
                {repairs.map((repair) => {
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
                        <div style={{ position: 'relative' }}>
                          <button
                            className="button-icon"
                            onClick={() => setOpenMenuId(openMenuId === repair.id ? null : repair.id)}
                            onBlur={() => setTimeout(() => setOpenMenuId(null), 150)}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuId === repair.id && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              zIndex: 10,
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              boxShadow: 'var(--elevation)',
                              padding: '4px',
                              minWidth: '160px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}>
                              <button
                                className="sidebar-btn"
                                style={{ padding: '8px 12px', fontSize: '13px' }}
                                onClick={() => { navigate(`/repairs/${repair.id}?mode=readonly`); setOpenMenuId(null); }}
                              >
                                <Eye size={14} /> View Details
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 14px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
                  Page {currentPage} of {totalPages} (Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount})
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="button secondary small"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <button
                    className="button secondary small"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
