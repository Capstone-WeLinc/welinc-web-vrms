import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { RepairTicket } from '../../../types';
import { formatDate } from '../../../lib/utils/format';
import { StatusBadge } from '../../../components/shared/StatusBadge';

interface RecentRepairsTableProps {
  repairs: RepairTicket[];
  loading: boolean;
  error: string | null;
}

export function RecentRepairsTable({ repairs, loading, error }: RecentRepairsTableProps) {
  if (loading) {
    return (
      <div aria-live="polite" aria-busy="true">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton-table-row">
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert">{error}</div>;
  }

  if (repairs.length === 0) {
    return <p>No repair tickets found.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Repair #</th>
          <th>Vehicle</th>
          <th>Driver</th>
          <th>Cost</th>
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
                  {isLocked && <Lock size={12} style={{ color: 'var(--muted-foreground)' }} />}
                </div>
              </td>
              <td>{repair.vehiclePlate}</td>
              <td>{repair.driverName}</td>
              <td>₱{(repair.totalCost ?? 0).toLocaleString()}</td>
              <td>
                <StatusBadge status={repair.status} />
              </td>
              <td>{formatDate(repair.updatedAt)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
