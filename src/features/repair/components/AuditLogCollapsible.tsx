import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AuditLogEntry } from '../../../types';

interface AuditLogCollapsibleProps {
  auditLog: AuditLogEntry[];
  formatDate: (date: string) => string;
}

const ACTION_LABELS: Record<string, string> = {
  STATUS_CHANGE: 'Status Changed',
  COST_UPDATE: 'Costs Updated',
  UNLOCK: 'Ticket Unlocked',
};

function formatAuditValue(action: string, val?: string | null): string {
  if (!val) return '—';
  if (action === 'COST_UPDATE') {
    try {
      const parsed = JSON.parse(val);
      return `Parts: ₱${parsed.partsCost ?? 0}, Labor: ₱${parsed.laborCost ?? 0}`;
    } catch {
      return val;
    }
  }
  return val;
}

export function AuditLogCollapsible({ auditLog, formatDate }: AuditLogCollapsibleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        id="audit-log-toggle"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--surface-alt, #f1f5f9)',
          border: '1px solid var(--border, #cbd5e1)',
          borderRadius: '8px',
          padding: '8px 16px',
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--text, #334155)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: 10
        }}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Audit Log ({auditLog.length} {auditLog.length === 1 ? 'entry' : 'entries'})
      </button>
      {expanded && (
        <div style={{ marginTop: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Action</th>
                <th style={{ padding: '8px 12px' }}>By</th>
                <th style={{ padding: '8px 12px' }}>Before</th>
                <th style={{ padding: '8px 12px' }}>After</th>
                <th style={{ padding: '8px 12px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry: AuditLogEntry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{entry.email}</td>
                  <td style={{ padding: '8px 12px', color: '#64748b' }}>
                    {formatAuditValue(entry.action, entry.previousValue)}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#16a34a' }}>
                    {formatAuditValue(entry.action, entry.newValue)}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#94a3b8', fontSize: 12 }}>
                    {formatDate(entry.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
