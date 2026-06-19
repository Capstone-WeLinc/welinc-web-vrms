import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wrench, Lock, Search, MoreVertical, Settings, Eye } from 'lucide-react';
import { getRepairs } from '../../../lib/api/repairApi';
import { RepairStatus, RepairTicket } from '../../../types';
import { formatDate } from '../../../lib/utils/format';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/authStore';
import { PageHeader } from '../../../components/layout/PageHeader';
import { StatusBadge } from '../../../components/shared/StatusBadge';

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
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RepairStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const navigate = useNavigate();
  const itemsPerPage = 10;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getRepairs(search, status || undefined, currentPage, itemsPerPage);
        setRepairs(response.data);
        setTotalCount(response.total);
      } catch (err) {
        setError('Unable to load repair tickets.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [search, status, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status]);

  // The total pages based on the server's totalCount
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

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

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
         <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '600px' }}>
           <div style={{ position: 'relative', flex: 1 }}>
             <Search size={18} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--muted)' }} />
             <input
               id="search"
               className="input"
               style={{ paddingLeft: 38 }}
               placeholder="Search by repair number, vehicle, or driver"
               value={search}
               onChange={(event) => setSearch(event.target.value)}
             />
           </div>
           <select
             id="statusFilter"
             className="select"
             value={status}
             onChange={(event) => setStatus(event.target.value as RepairStatus | '')}
             style={{ width: '160px' }}
           >
             {statusOptions.map((option) => (
               <option key={option.value} value={option.value}>
                 {option.label}
               </option>
             ))}
           </select>
         </div>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading repair tickets…</p>
        ) : error ? (
          <div className="alert">{error}</div>
        ) : repairs.length === 0 ? (
          <p>No tickets found.</p>
        ) : (
          <>
            <p style={{ marginTop: 0, marginBottom: 16, color: '#475569' }}>
              Showing {totalCount} repair ticket{totalCount === 1 ? '' : 's'}.
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Repair #</th>
                  <th>Vehicle</th>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {repairs.map((repair) => {
                  const isLocked = (repair.status === 'COMPLETED' || repair.status === 'CANCELLED') && !repair.isUnlocked;
                  return (
                    <tr key={repair.id}>
                      <td style={isLocked ? { opacity: 0.65 } : undefined}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Link to={`/repairs/${repair.id}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            {repair.repairNumber}
                          </Link>
                          {isLocked && <Lock size={12} style={{ color: 'var(--muted)' }} />}
                        </div>
                      </td>
                      <td style={isLocked ? { opacity: 0.65 } : undefined}>{repair.vehiclePlate}</td>
                      <td style={isLocked ? { opacity: 0.65 } : undefined}>{repair.issueDescription}</td>
                      <td style={isLocked ? { opacity: 0.65 } : undefined}>
                        <StatusBadge status={repair.status} />
                      </td>
                      <td style={isLocked ? { opacity: 0.65 } : undefined}>{formatDate(repair.updatedAt)}</td>
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
                                style={{ padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                onClick={() => { navigate(`/repairs/${repair.id}?mode=readonly`); setOpenMenuId(null); }}
                              >
                                <Eye size={14} /> View Details
                              </button>
                              {(!isLocked || isAdmin) && (
                                <button
                                  className="sidebar-btn"
                                  style={{ padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                  onClick={() => { navigate(`/repairs/${repair.id}`); setOpenMenuId(null); }}
                                >
                                  <Settings size={14} /> Edit Ticket
                                </button>
                              )}
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
                  {pageNumbers.map(page => (
                    <button
                      key={page}
                      className={currentPage === page ? "button small" : "button secondary small"}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
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
