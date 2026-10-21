import { AuditEntry } from '../../../lib/api/repairApi';

interface AuditTrailWidgetProps {
  audits: AuditEntry[];
}

export function AuditTrailWidget({ audits }: AuditTrailWidgetProps) {
  const auditCount = audits.length;
  const lastAudit = audits[0] ? new Date(audits[0].timestamp) : null;

  return (
    <div className="card report-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--divider)', paddingBottom: 12, marginBottom: 16 }}>
        <div>
          <h3 className="subheading" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0 }}>
            Audit Trail
            <span style={{ 
              backgroundColor: 'var(--primary-soft)', 
              color: 'var(--primary)', 
              padding: '2px 8px', 
              borderRadius: 12, 
              fontSize: 12, 
              fontWeight: 600 
            }}>
              {auditCount}
            </span>
          </h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: 13 }}>Recent system activities & security events</p>
        </div>
        {lastAudit && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Event</p>
            <p style={{ margin: '2px 0 0 0', fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>
              {lastAudit.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, position: 'relative', paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
        {audits.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '20px 0', textAlign: 'center' }}>No audit trail entries recorded yet.</p>
        ) : (
          audits.slice(0, 4).map((a) => {
            let indicatorColor = 'var(--primary)';
            if (a.action.includes('COMPLETED') || a.action.includes('Verification')) {
              indicatorColor = 'var(--success)';
            } else if (a.action.includes('Unlock') || a.action.includes('unlocked')) {
              indicatorColor = 'var(--warning)';
            } else if (a.action.includes('Cancelled') || a.action.includes('lockout')) {
              indicatorColor = 'var(--danger)';
            }

            return (
              <div key={a.id} style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: -23,
                  top: 4,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: indicatorColor,
                  border: '2px solid white',
                  boxShadow: '0 0 0 1px var(--border)'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>@{a.user}</span>
                      <span style={{ 
                        fontSize: 10, 
                        backgroundColor: 'var(--surface-alt)', 
                        color: 'var(--muted)', 
                        padding: '1px 6px', 
                        borderRadius: 4, 
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {a.action.split(' ')[0]}
                      </span>
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>{a.action}</div>
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
