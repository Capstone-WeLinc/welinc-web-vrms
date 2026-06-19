import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Search } from 'lucide-react';
import { getAuditLogs, AuditEntry } from '../../../lib/api/repairApi';
import { formatDate } from '../../../lib/utils/format';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';

const actionFilterOptions = [
  { value: '', label: 'All Actions' },
  { value: 'status', label: 'Status Changes' },
  { value: 'costs', label: 'Cost Updates' },
  { value: 'unlock', label: 'Unlocks' },
  { value: 'create', label: 'Creations' },
];

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function loadLogs() {
      setError(null);
      setLoading(true);
      try {
        const data = await getAuditLogs();
        setLogs(data);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
        setError('Unable to load audit logs.');
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, actionFilter]);

  const filteredLogs = useMemo(() => {
    const term = search.toLowerCase().trim();
    let result = logs;

    if (actionFilter) {
      result = result.filter((log) => {
        const actionLower = log.action.toLowerCase();
        if (actionFilter === 'status') return actionLower.includes('status') || actionLower.includes('changed status');
        if (actionFilter === 'costs') return actionLower.includes('cost');
        if (actionFilter === 'unlock') return actionLower.includes('unlock');
        if (actionFilter === 'create') return actionLower.includes('create') || actionLower.includes('created');
        return true;
      });
    }

    if (term) {
      result = result.filter((log) => 
        log.user.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term)
      );
    }

    return result;
  }, [logs, search, actionFilter]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

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

  const renderActionText = (log: AuditEntry) => {
    const match = log.action.match(/(REP-\d{8}-\d{4})/);
    if (match && log.ticketId) {
      const ticketNum = match[1];
      const parts = log.action.split(ticketNum);
      return (
        <>
          {parts[0]}
          <Link 
            to={`/repairs/${log.ticketId}`} 
            style={{ 
              color: 'var(--primary)', 
              fontWeight: 700, 
              textDecoration: 'underline' 
            }}
          >
            {ticketNum}
          </Link>
          {parts[1]}
        </>
      );
    }
    return log.action;
  };

  return (
    <div>
      <PageHeader
        title="System Audit Logs"
        subtitle="Historical trail of administrative and operational activities."
        icon={ClipboardList}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
         <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '600px' }}>
           <div style={{ position: 'relative', flex: 1 }}>
             <Search size={18} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--muted)' }} />
             <input
               id="auditSearch"
               className="input"
               style={{ paddingLeft: 38 }}
               value={search}
               onChange={(event) => setSearch(event.target.value)}
               placeholder="Search by email address or action details..."
             />
           </div>
           <select
             id="auditActionFilter"
             className="select"
             value={actionFilter}
             onChange={(event) => setActionFilter(event.target.value)}
             style={{ width: '160px' }}
           >
             {actionFilterOptions.map((option) => (
               <option key={option.value} value={option.value}>
                 {option.label}
               </option>
             ))}
           </select>
         </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Audit Trail Records</h3>
          {!loading && !error && (
            <span style={{ 
              fontSize: '12px', 
              color: 'var(--muted)', 
              fontWeight: 600,
              backgroundColor: 'var(--surface-alt)',
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              Showing {filteredLogs.length} of {logs.length} records
            </span>
          )}
        </div>

        {loading ? (
          <p>Loading audit logs…</p>
        ) : error ? (
          <div className="alert">{error}</div>
        ) : filteredLogs.length === 0 ? (
          <p>No audit trail records found.</p>
        ) : (
          <>
            <div className="table-scroll" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '150px' }}>User</th>
                    <th>Action</th>
                    <th style={{ width: '220px' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => {
                    let badgeBg = 'rgba(26, 31, 110, 0.1)';
                    let badgeColor = 'var(--primary)';
                    const lowercaseAction = log.action.toLowerCase();
                    
                    if (lowercaseAction.includes('complete') || lowercaseAction.includes('verification')) {
                      badgeBg = 'var(--success-soft)';
                      badgeColor = 'var(--success)';
                    } else if (lowercaseAction.includes('unlock')) {
                      badgeBg = 'var(--warning-soft)';
                      badgeColor = 'var(--warning)';
                    } else if (lowercaseAction.includes('cancel')) {
                      badgeBg = 'var(--danger-soft)';
                      badgeColor = 'var(--danger)';
                    }

                    return (
                      <tr key={log.id}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)' }}>{log.user}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              fontSize: '10px',
                              backgroundColor: badgeBg,
                              color: badgeColor,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              flexShrink: 0
                            }}>
                              {log.action.split(' ')[0]}
                            </span>
                            <span style={{ fontSize: '13px', lineHeight: 1.4 }}>{renderActionText(log)}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--muted)', fontSize: '13px' }}>
                          {formatDate(log.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 14px', borderTop: '1px solid var(--border)', marginTop: 20 }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
                  Page {currentPage} of {totalPages} (Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length})
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="button secondary small"
                    style={{ padding: '6px 12px', fontSize: 13 }}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  {pageNumbers.map(page => (
                    <button
                      key={page}
                      className={currentPage === page ? "button small" : "button secondary small"}
                      style={{ padding: '6px 12px', fontSize: 13 }}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="button secondary small"
                    style={{ padding: '6px 12px', fontSize: 13 }}
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
