import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, LayoutDashboard, ShieldCheck, UserCheck, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ErrorState } from '../../../components/shared/ErrorState';
import { KpiCard } from '../../../components/shared/KpiCard';
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

/** A team number, or a dash while the roster loads or after it failed (Team shows why). */
function teamValue(summary: TeamSummary | undefined, key: keyof TeamSummary) {
  return summary ? summary[key] : <span aria-label="Not loaded">—</span>;
}

/**
 * Spec 0022 (replacing spec 0015's tiles, tables and pipeline on this view), reworked after a
 * design review: one band of headline numbers, each said only there, then Ready to verify and My
 * work in a narrow left column and the Team card grid in a wide right one from 1280px. Below that
 * they stack in the same order, so reading and tab order never change.
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
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <LastUpdated fetchedAt={fetchedAt} refreshFailed={refreshFailed} />
            {truncated && <TruncationNote rows={active.length} />}
          </div>

          <section aria-label="At a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <KpiCard
              caption="Ready to verify"
              value={derived.queueCount}
              icon={ShieldCheck}
              tone={derived.queueCount > 0 ? 'highlight' : 'default'}
            />
            {seesTeam ? (
              <>
                <KpiCard caption="Mechanics working" value={teamValue(team?.summary, 'working')} icon={Wrench} />
                <KpiCard caption="Work waiting" value={teamValue(team?.summary, 'waiting')} icon={Clock} />
                <KpiCard caption="Free mechanics" value={teamValue(team?.summary, 'free')} icon={UserCheck} tone="success" />
              </>
            ) : (
              <KpiCard caption="My work" value={derived.work.length} icon={Wrench} />
            )}
          </section>

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-5 xl:gap-6">
            <div className="flex min-w-0 flex-col gap-5 xl:col-span-2 xl:gap-6">
              <DashboardPanel
                id="verify-heading"
                title="Ready to verify"
                icon={ShieldCheck}
                tone="verification"
                action={
                  derived.queue.length > 0 && (
                    <Button asChild variant="ghost" size="sm" className="min-h-11 shrink-0 md:min-h-8">
                      <Link to="/repairs?status=FOR_VERIFICATION">
                        See all
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  )
                }
              >
                {derived.queue.length === 0 ? (
                  <PanelEmpty icon={CheckCircle2}>Nothing to verify.</PanelEmpty>
                ) : (
                  <TicketRowList label="Tickets ready to verify, oldest first">
                    {derived.queue.map((ticket) => (
                      <DashboardTicketRow
                        key={ticket.id}
                        ticket={ticket}
                        facts={[
                          { text: signOffNames(ticket.mechanics), title: ticket.mechanics?.map((m) => m.name).join(', ') },
                          { text: waitingText(ticket, fetchedAt) },
                        ]}
                      />
                    ))}
                  </TicketRowList>
                )}
              </DashboardPanel>

              <DashboardPanel
                id="my-work-heading"
                title="My work"
                icon={Wrench}
                tone="progress"
                count={seesTeam ? derived.work.length : undefined}
              >
                {derived.work.length === 0 ? (
                  <PanelEmpty icon={CheckCircle2}>Nothing assigned to you.</PanelEmpty>
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
