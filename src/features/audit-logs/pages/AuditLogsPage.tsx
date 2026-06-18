import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Search } from 'lucide-react';
import { getAuditLogs, AuditEntry } from '../../../lib/api/repairApi';
import { formatDate } from '../../../lib/utils/format';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState('');
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
  }, [search]);

  const filteredLogs = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return logs;
    return logs.filter((log) => 
      log.user.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term)
    );
  }, [logs, search]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

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

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="input-group" style={{ margin: 0 }}>
          <label className="label" htmlFor="auditSearch" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={16} /> Search logs
          </label>
          <input
            id="auditSearch"
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by email address or action details..."
          />
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
