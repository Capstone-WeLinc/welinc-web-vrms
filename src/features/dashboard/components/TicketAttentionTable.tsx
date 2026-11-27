import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '../../../components/shared/data-table/DataTable';
import type { Column } from '../../../components/shared/data-table/types';
import { MechanicProblemBadge } from '../../../components/shared/MechanicProblemBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import type { RepairTicket } from '../../../types';
import type { DueLabel } from '../../../lib/utils/due';

interface TicketAttentionTableProps {
  rows: RepairTicket[];
  /** Due column text for a row, measured against the hook's fetchedAt. */
  dueLabel: (ticket: RepairTicket) => DueLabel;
  label: string;
  empty: { title: string; description?: string; icon?: LucideIcon };
  /** The View all repairs link under the table; off for all but the last of several groups. */
  showAllLink?: boolean;
}

export function TicketAttentionTable({ rows, dueLabel, label, empty, showAllLink = true }: TicketAttentionTableProps) {
  const navigate = useNavigate();

  const columns: Column<RepairTicket>[] = [
    { id: 'repair', header: 'Repair #', mobile: 'title', cell: (t) => t.repairNumber },
    { id: 'vehicle', header: 'Vehicle', mobile: 'subtitle', cell: (t) => t.vehiclePlate },
    { id: 'status', header: 'Status', mobile: 'badge', cell: (t) => (
        <span className="flex flex-wrap items-center gap-1">
          <StatusBadge status={t.status} />
          <MechanicProblemBadge ticket={t} />
        </span>
      ),
    },
    {
      id: 'due',
      header: 'Due',
      mobile: 'field',
      cell: (t) => {
        const due = dueLabel(t);
        if (!due) return null;
        return <span className={cn(due.overdue && 'font-medium text-destructive', due.dueSoon && 'font-medium text-warning')}>{due.text}</span>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(t) => t.id}
        state="ready"
        label={label}
        empty={empty}
        onRowClick={(t) => navigate(`/repairs/${t.id}`)}
      />
      {showAllLink && (
        <Button asChild variant="link" className="self-end px-0">
          <Link to="/repairs">
            View all repairs
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      )}
    </div>
  );
}
