import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ErrorState } from '../../../components/shared/ErrorState';
import { PlateChip } from '../../../components/shared/PlateChip';
import { useCan } from '../../../lib/permissions/usePermissions';
import { useAuthStore } from '../../../store/authStore';
import { dueLabel } from '../../../lib/utils/due';
import type { RepairTicket } from '../../../types';
import { useDashboardData } from '../hooks/useDashboardData';
import { useMechanicRoster } from '../hooks/useMechanicRoster';
import { useReleasedTickets } from '../hooks/useReleasedTickets';
import { mechanicWorkList, signOffNames, timeInStatus, verificationQueue, waitTone } from '../lib/attention';
import { buildTeam, type TeamSummary } from '../lib/team';
import { DashboardPanel, PanelEmpty } from './DashboardPanel';
import { DashboardSkeleton } from './DashboardSkeleton';
import { DashboardTicketRow, TicketRowList } from './DashboardTicketRow';
import { LastUpdated } from './LastUpdated';
import { ReleasedNotice } from './ReleasedNotice';
import { TeamSection } from './TeamSection';
import { TruncationNote } from './TruncationNote';

const VERIFY_LIMIT = 8;

function todayLabel(time: number) {
  return new Date(time).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** The secondary numbers as one quiet line: said once, here, never as tiles. */
function FloorLine({ summary, extra }: { summary: TeamSummary | undefined; extra: string[] }) {
  const parts = summary
    ? [`${summary.working} working`, `${summary.waiting} not started`, `${summary.free} free`, ...extra]
    : extra;
  if (parts.length === 0) return null;
  return (
    <p className="text-sm text-muted-foreground tabular-nums">
      {parts.map((part, index) => (
        <span key={part}>
          {index > 0 && <span aria-hidden="true"> · </span>}
          {part}
        </span>
      ))}
    </p>
  );
}

/** The one thing the Chief acts on, with the one button that starts it. */
function SignOffSummary({ count, oldest, now }: { count: number; oldest: RepairTicket | undefined; now: number }) {
  if (count === 0 || !oldest) {
    return (
      <div className="flex items-center gap-3">
        <CircleCheck aria-hidden="true" className="size-6 shrink-0 text-status-completed-fg" />
        <p className="text-lg font-semibold text-foreground">Nothing waiting for verification.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="flex flex-wrap items-baseline gap-x-3 text-lg font-semibold text-foreground">
          <span className="text-4xl font-semibold tracking-tight text-foreground tabular-nums">{count}</span>
          {count === 1 ? 'repair waiting for verification' : 'repairs waiting for verification'}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          Oldest
          <PlateChip plate={oldest.vehiclePlate} />
          <span>
            by {signOffNames(oldest.mechanics)}, waiting {timeInStatus(oldest.statusChangedAt, now)}
          </span>
        </p>
      </div>
      <Button asChild className="h-11 shrink-0 px-5">
        <Link to={`/repairs/${oldest.id}`}>
          Verify the oldest
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

const WAIT_TONE = {
  fresh: 'text-muted-foreground',
  stale: 'font-medium text-status-pending-fg',
  late: 'font-medium text-destructive',
} as const;

/** A For verification row: plate, who did it and how long it has waited, then what the job was. */
function QueueRow({ ticket, now }: { ticket: RepairTicket; now: number }) {
  const names = ticket.mechanics?.map((m) => m.name).join(', ');
  const tone = waitTone(ticket.statusChangedAt, now);
  return (
    <li>
      <Link
        to={`/repairs/${ticket.id}`}
        title={`${ticket.repairNumber}${names ? ` · ${names}` : ''}`}
        className="flex min-h-11 flex-col gap-1 px-4 py-3 outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none md:px-5"
      >
        <span className="flex items-center gap-3">
          <PlateChip plate={ticket.vehiclePlate} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{signOffNames(ticket.mechanics)}</span>
          <span className={cn('shrink-0 text-xs tabular-nums', WAIT_TONE[tone])}>
            {timeInStatus(ticket.statusChangedAt, now)}
          </span>
        </span>
        {ticket.issueDescription && (
          <span className="line-clamp-1 text-sm text-muted-foreground">{ticket.issueDescription}</span>
        )}
      </Link>
    </li>
  );
}

/**
 * Spec 0022 (replacing spec 0015's tiles, tables and pipeline on this view), reworked after a
 * design review: the For verification count and its one action lead, the rest of the floor is one line
 * of text, then the queue and My work beside the Team roster from 1280px. Below that they stack
 * in the same order, so reading and tab order never change.
 */
export function ChiefDashboard() {
  const user = useAuthStore((state) => state.user);
  const seesTeam = useCan('mechanics.view');
  const { active, fetchedAt, state, errorMessage, refreshFailed, truncated, retry, refresh } = useDashboardData({
    includeHistory: false,
  });
  const roster = useMechanicRoster(seesTeam);
  const released = useReleasedTickets(seesTeam);

  const derived = useMemo(() => {
    const queue = verificationQueue(active);
    return {
      queueCount: queue.length,
      queue: queue.slice(0, VERIFY_LIMIT),
      work: mechanicWorkList(
        active.filter((t) => t.can.work),
        fetchedAt,
      ),
    };
  }, [active, fetchedAt]);

  const team = useMemo(
    () => (seesTeam && roster.state === 'ready' ? buildTeam(roster.rows, active, user?.id, fetchedAt) : null),
    [seesTeam, roster.state, roster.rows, active, user?.id, fetchedAt],
  );

  const extra: string[] = [];
  if (team && team.noMechanic.length > 0) extra.push(`${team.noMechanic.length} with no mechanic`);
  if (!seesTeam) extra.push(`${derived.work.length} in my work`);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          {state === 'ready' && <p className="text-sm text-muted-foreground">{todayLabel(fetchedAt)}</p>}
        </div>
        {state === 'ready' && <LastUpdated fetchedAt={fetchedAt} refreshFailed={refreshFailed} />}
      </header>

      {state === 'loading' && <DashboardSkeleton admin={false} tiles={false} />}

      {state === 'error' && (
        <ErrorState
          title="We couldn’t load the dashboard"
          message={errorMessage ?? 'The dashboard didn’t load.'}
          onRetry={retry}
        />
      )}

      {state === 'ready' && (
        <>
          {truncated && <TruncationNote rows={active.length} />}

          <section
            aria-label="At a glance"
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 md:p-6"
          >
            <SignOffSummary count={derived.queueCount} oldest={derived.queue[0]} now={fetchedAt} />
            <div className="border-t border-border pt-4">
              <FloorLine summary={team?.summary} extra={extra} />
            </div>
          </section>

          <ReleasedNotice rows={released} now={fetchedAt} />

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
            <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
              <DashboardPanel
                id="verify-heading"
                title="For verification"
                count={derived.queueCount > 0 ? derived.queueCount : undefined}
                action={
                  derived.queueCount > VERIFY_LIMIT && (
                    <Button asChild variant="ghost" size="sm" className="-mr-2 min-h-11 shrink-0 md:min-h-8">
                      <Link to="/repairs?status=FOR_VERIFICATION">
                        See all
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  )
                }
              >
                {derived.queue.length === 0 ? (
                  <PanelEmpty>Nothing to verify.</PanelEmpty>
                ) : (
                  <TicketRowList label="Tickets ready to verify, oldest first">
                    {derived.queue.map((ticket) => (
                      <QueueRow key={ticket.id} ticket={ticket} now={fetchedAt} />
                    ))}
                  </TicketRowList>
                )}
              </DashboardPanel>

              <DashboardPanel id="my-work-heading" title="My work" count={derived.work.length || undefined}>
                {derived.work.length === 0 ? (
                  <PanelEmpty>Nothing assigned to you.</PanelEmpty>
                ) : (
                  <TicketRowList label="My work, overdue first, then by due date">
                    {derived.work.map((ticket) => {
                      const due = dueLabel(ticket, fetchedAt);
                      return <DashboardTicketRow key={ticket.id} ticket={ticket} facts={due ? [due] : []} />;
                    })}
                  </TicketRowList>
                )}
              </DashboardPanel>
            </div>

            {seesTeam && (
              <div className="min-w-0 xl:col-span-3">
                <TeamSection roster={roster} team={team} fetchedAt={fetchedAt} onTicketsChanged={refresh} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
