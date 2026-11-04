import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useCan } from '../../../lib/permissions/usePermissions';
import { useAuthStore } from '../../../store/authStore';
import { dueLabel } from '../../../lib/utils/due';
import { useDashboardData } from '../hooks/useDashboardData';
import { useMechanicRoster } from '../hooks/useMechanicRoster';
import { greeting, mechanicWorkList, signOffNames, verificationQueue, waitingText } from '../lib/attention';
import { buildTeam, type TeamSummary } from '../lib/team';
import { DashboardPanel, PanelEmpty } from './DashboardPanel';
import { DashboardSkeleton } from './DashboardSkeleton';
import { DashboardTicketRow, TicketRowList } from './DashboardTicketRow';
import { LastUpdated } from './LastUpdated';
import { TeamSection } from './TeamSection';
import { TruncationNote } from './TruncationNote';

const VERIFY_LIMIT = 8;

type Stat = { label: string; value: ReactNode };

/** A team number, or a dash while the roster loads or after it failed (Team shows why). */
function teamValue(summary: TeamSummary | undefined, key: keyof TeamSummary): ReactNode {
  return summary ? summary[key] : <span aria-label="Not loaded">—</span>;
}

// Hairlines between cells: one row of four from 1024px, two by two below it
function cellBorders(index: number, count: number) {
  return cn(
    index % 2 === 1 && 'border-l',
    index >= 2 && 'border-t lg:border-t-0',
    index > 0 && 'lg:border-l',
    count === 2 && 'lg:col-span-2',
  );
}

/** The headline numbers as one scoreboard: each said once, here, and nowhere else on the page. */
function Scoreboard({ stats }: { stats: Stat[] }) {
  return (
    <dl aria-label="At a glance" className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div key={stat.label} className={cn('flex flex-col-reverse gap-0.5 border-border px-5 py-4', cellBorders(index, stats.length))}>
          <dt className="text-sm text-muted-foreground">{stat.label}</dt>
          <dd className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Spec 0022 (replacing spec 0015's tiles, tables and pipeline on this view), reworked after a
 * design review: a scoreboard of headline numbers, then Ready to verify and My work in a narrow
 * left column and the Team grid in a wide right one from 1280px. Below that they stack in the
 * same order, so reading and tab order never change.
 */
export function ChiefDashboard() {
  const user = useAuthStore((state) => state.user);
  const seesTeam = useCan('mechanics.view');
  const { active, fetchedAt, state, errorMessage, refreshFailed, truncated, retry, refresh } = useDashboardData({
    includeHistory: false,
  });
  const roster = useMechanicRoster(seesTeam);

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

  const stats: Stat[] = seesTeam
    ? [
        { label: 'Ready to verify', value: derived.queueCount },
        { label: 'Mechanics working', value: teamValue(team?.summary, 'working') },
        { label: 'With work waiting', value: teamValue(team?.summary, 'waiting') },
        { label: 'Free mechanics', value: teamValue(team?.summary, 'free') },
      ]
    : [
        { label: 'Ready to verify', value: derived.queueCount },
        { label: 'My work', value: derived.work.length },
      ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${greeting(user?.name)} Here's your shop floor today.`}
        icon={LayoutDashboard}
      />

      {state === 'loading' && <DashboardSkeleton admin={false} />}

      {state === 'error' && (
        <ErrorState
          title="We couldn’t load the dashboard"
          message={errorMessage ?? 'The dashboard didn’t load.'}
          onRetry={retry}
        />
      )}

      {state === 'ready' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <LastUpdated fetchedAt={fetchedAt} refreshFailed={refreshFailed} />
            {truncated && <TruncationNote rows={active.length} />}
          </div>

          <Scoreboard stats={stats} />

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
            <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
              <DashboardPanel
                id="verify-heading"
                title="Ready to verify"
                action={
                  derived.queue.length > 0 && (
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
                      <DashboardTicketRow
                        key={ticket.id}
                        ticket={ticket}
                        // Every row here is For verification, so line 1 names who did the work instead
                        lead={
                          <span
                            title={ticket.mechanics?.map((m) => m.name).join(', ')}
                            className="min-w-0 truncate text-sm text-foreground"
                          >
                            {signOffNames(ticket.mechanics)}
                          </span>
                        }
                        facts={[{ text: waitingText(ticket, fetchedAt) }]}
                      />
                    ))}
                  </TicketRowList>
                )}
              </DashboardPanel>

              <DashboardPanel id="my-work-heading" title="My work" count={seesTeam ? derived.work.length : undefined}>
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
        </div>
      )}
    </div>
  );
}
