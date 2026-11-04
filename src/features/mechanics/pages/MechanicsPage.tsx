import { HardHat } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { BadgePill } from '../../../components/shared/BadgePill';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { WORK_LABELS } from '../../user-management/lib/workload';
import { useMechanicRoster } from '../hooks/useMechanicRoster';

const STATE_CLASSES = {
  occupied: 'bg-status-in-progress-bg text-status-in-progress-fg',
  free: 'bg-status-completed-bg text-status-completed-fg',
} as const;

/** Spec 0022: the read only workload screen for people with mechanics.view. */
export function MechanicsPage() {
  const roster = useMechanicRoster();

  return (
    <div>
      <PageHeader title="Mechanics" subtitle="Who is busy, and with what." icon={HardHat} />
      {roster.state === 'loading' && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading the mechanics…
        </p>
      )}
      {roster.state === 'error' && <ErrorState message={roster.errorMessage ?? ''} onRetry={roster.retry} />}
      {roster.state === 'ready' && roster.rows.length === 0 && <EmptyState title="No mechanics yet" icon={HardHat} />}
      {roster.state === 'ready' && roster.rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {roster.rows.map((row) => {
            const state = row.occupied ? 'occupied' : 'free';
            return (
              <li key={row.authUserId} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate font-medium">{row.name}</span>
                  {row.role === 'CHIEF_MECHANIC' && (
                    <BadgePill className="bg-role-chief-mechanic-bg text-role-chief-mechanic-fg">Chief</BadgePill>
                  )}
                </span>
                <BadgePill className={STATE_CLASSES[state]}>{WORK_LABELS[state]}</BadgePill>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
