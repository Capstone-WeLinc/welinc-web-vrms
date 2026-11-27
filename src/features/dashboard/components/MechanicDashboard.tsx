import { useMemo } from 'react';

import { PageHeader } from '../../../components/layout/PageHeader';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useAuthStore } from '../../../store/authStore';
import { useDashboardData } from '../hooks/useDashboardData';
import { countMechanicOverdue, greeting, isWaiting, mechanicWorkGroups } from '../lib/attention';
import { dueLabel } from '../../../lib/utils/due';
import { AttentionTiles, type AttentionTile } from './AttentionTiles';
import { DashboardSkeleton } from './DashboardSkeleton';
import { LastUpdated } from './LastUpdated';
import { TicketAttentionTable } from './TicketAttentionTable';
import { TruncationNote } from './TruncationNote';
import type { RepairTicket } from '../../../types';

export function MechanicDashboard() {
  const user = useAuthStore((state) => state.user);
  const { active, fetchedAt, state, errorMessage, refreshFailed, truncated, retry } = useDashboardData({
    includeHistory: false,
  });

  const derived = useMemo(() => {
    // Overdue counts only ASSIGNED and IN_PROGRESS, so the tile matches the overdue rows in the list.
    const overdue = countMechanicOverdue(active, fetchedAt);
    const tiles: AttentionTile[] = [
      { caption: 'To start', value: active.filter((t) => t.status === 'ASSIGNED').length, href: '/repairs?status=ASSIGNED' },
      { caption: 'In progress', value: active.filter((t) => t.status === 'IN_PROGRESS').length, href: '/repairs?status=IN_PROGRESS' },
      { caption: 'Overdue', value: overdue, href: '/repairs?overdue=1' },
      // Waits on the sign off roles, not on the mechanic, so it is never hot here.
      { caption: 'Waiting for sign off', value: active.filter(isWaiting).length, href: '/repairs?status=FOR_VERIFICATION' },
    ];
    return { tiles, groups: mechanicWorkGroups(active, fetchedAt) };
  }, [active, fetchedAt]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        context={`${greeting(user?.name)} Here's your work, most urgent first.`}
      />

      {state === 'loading' && <DashboardSkeleton admin={false} />}

      {state === 'error' && (
        <ErrorState
          kind="page"
          title="We couldn’t load your repairs"
          message={errorMessage ?? 'The dashboard didn’t load.'}
          onRetry={retry}
        />
      )}

      {state === 'ready' && (
        <div className="flex flex-col gap-6">
          <LastUpdated fetchedAt={fetchedAt} refreshFailed={refreshFailed} />

          <div className="flex flex-col gap-3">
            <AttentionTiles tiles={derived.tiles} />
            {truncated && <TruncationNote rows={active.length} />}
          </div>

          <section aria-labelledby="my-work-heading" className="flex flex-col gap-3">
            <div>
              <h2 id="my-work-heading" className="text-subheading font-semibold text-foreground">
                My work
              </h2>
              <p className="text-body text-muted-foreground">Overdue first, then due soon, then by due date.</p>
            </div>
            {/* Spec 0030, AC-12: Overdue and Due soon as their own groups, shown only when they have rows */}
            {derived.groups.overdue.length > 0 && (
              <WorkGroup id="overdue" title="Overdue" rows={derived.groups.overdue} fetchedAt={fetchedAt} />
            )}
            {derived.groups.dueSoon.length > 0 && (
              <WorkGroup id="due-soon" title="Due soon" rows={derived.groups.dueSoon} fetchedAt={fetchedAt} />
            )}
            {(derived.groups.rest.length > 0 || (derived.groups.overdue.length === 0 && derived.groups.dueSoon.length === 0)) && (
              <WorkGroup
                id="rest"
                title={derived.groups.overdue.length + derived.groups.dueSoon.length > 0 ? 'Later' : null}
                rows={derived.groups.rest}
                fetchedAt={fetchedAt}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function WorkGroup({ id, title, rows, fetchedAt }: { id: string; title: string | null; rows: RepairTicket[]; fetchedAt: number }) {
  return (
    <div className="flex flex-col gap-2">
      {title && (
        <h3 id={`work-${id}-heading`} className="text-body font-semibold text-foreground">
          {title} <span className="font-normal text-muted-foreground tabular-nums">{rows.length}</span>
        </h3>
      )}
      <TicketAttentionTable
        rows={rows}
        dueLabel={(t) => dueLabel(t, fetchedAt)}
        label={title ? `My ${title.toLowerCase()} tickets` : 'My active tickets'}
        empty={{ title: 'No active repairs assigned to you right now.' }}
        showAllLink={id === 'rest' || title === null}
      />
    </div>
  );
}
