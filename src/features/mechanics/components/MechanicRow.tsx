import { useId } from 'react';
import { BadgePill } from '../../../components/shared/BadgePill';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { statusLabel } from '../../../components/shared/statusLabels';
import type { MechanicRosterRow } from '../../../lib/api/vrmsConfigApi';
import { cn } from '@/lib/utils';
import { WORK_LABELS } from '../../user-management/lib/workload';
import { COUNTED_STATUSES, workStateOfRow } from '../lib/mechanicsList';

const STATE_CLASSES = {
  // Occupied wears In progress's color, since that is what makes someone occupied (as on the Users page)
  occupied: 'bg-status-in-progress-bg text-status-in-progress-fg',
  free: 'bg-status-completed-bg text-status-completed-fg',
} as const;

interface MechanicRowProps {
  row: MechanicRosterRow;
  /** Two people on the list share this name, so the email shows inline (AC-6). */
  showEmail: boolean;
  onOpen: (row: MechanicRosterRow) => void;
}

/** One person on the Mechanics screen: a button named after them that opens their open tickets (AC-6, AC-10). */
export function MechanicRow({ row, showEmail, onOpen }: MechanicRowProps) {
  const detailsId = useId();
  const state = workStateOfRow(row);

  return (
    <li>
      <button
        type="button"
        aria-label={row.name}
        aria-describedby={detailsId}
        title={row.email ?? undefined}
        onClick={() => onOpen(row)}
        className="flex min-h-11 w-full flex-col gap-2 px-4 py-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:flex-row md:items-center md:justify-between md:gap-4"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 font-medium break-words text-foreground">{row.name}</span>
            {row.role === 'CHIEF_MECHANIC' && (
              <BadgePill className="bg-role-chief-mechanic-bg text-role-chief-mechanic-fg">Chief</BadgePill>
            )}
            {!row.isActive && <StatusBadge status="INACTIVE" />}
          </span>
          {showEmail && row.email && <span className="text-xs break-all text-muted-foreground">{row.email}</span>}
        </span>
        <span id={detailsId} className="flex flex-wrap items-center gap-x-4 gap-y-1 md:shrink-0 md:justify-end">
          <BadgePill className={STATE_CLASSES[state]}>{WORK_LABELS[state]}</BadgePill>
          <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {COUNTED_STATUSES.map((status) => {
              const count = row.byStatus[status] ?? 0;
              return (
                <span key={status} className="whitespace-nowrap">
                  <span className="text-muted-foreground">{statusLabel(status)}</span>{' '}
                  <span className={cn('tabular-nums', count === 0 ? 'text-muted-foreground' : 'font-semibold text-foreground')}>
                    {count.toLocaleString()}
                  </span>
                  <span className="sr-only">,</span>
                </span>
              );
            })}
          </span>
        </span>
      </button>
    </li>
  );
}
