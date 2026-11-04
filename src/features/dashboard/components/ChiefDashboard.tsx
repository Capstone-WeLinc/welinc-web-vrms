import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LayoutDashboard, ShieldCheck, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useCan } from '../../../lib/permissions/usePermissions';
import { useAuthStore } from '../../../store/authStore';
import { dueLabel } from '../../../lib/utils/due';
import { useDashboardData } from '../hooks/useDashboardData';
import { greeting, mechanicWorkList, signOffNames, verificationQueue, waitingText } from '../lib/attention';
import { DashboardPanel, PanelEmpty } from './DashboardPanel';
import { DashboardSkeleton } from './DashboardSkeleton';
import { DashboardTicketRow, TicketRowList } from './DashboardTicketRow';
import { LastUpdated } from './LastUpdated';
import { TeamSection } from './TeamSection';
import { TruncationNote } from './TruncationNote';

const SIGN_OFF_LIMIT = 8;

/**
 * Spec 0022 (replacing spec 0015's tiles, tables and pipeline on this view): Sign off, My work and
 * Team. Below 1280px they stack in that order; from 1280px Sign off and My work sit in a narrow
 * left column and Team in a wide right one, so reading and tab order stay the same (AC-5, AC-6).
 */
export function ChiefDashboard() {
  const user = useAuthStore((state) => state.user);
  const seesTeam = useCan('mechanics.view');
  const { active, fetchedAt, state, errorMessage, refreshFailed, truncated, retry, refresh } = useDashboardData({
    includeHistory: false,
  });

  const derived = useMemo(() => {
    const queue = verificationQueue(active);
    return {
      queueCount: queue.length,
      queue: queue.slice(0, SIGN_OFF_LIMIT),
      work: mechanicWorkList(
        active.filter((t) => t.can.work),
        fetchedAt,
      ),
    };
  }, [active, fetchedAt]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${greeting(user?.name)} Here's what is waiting for you.`}
        icon={LayoutDashboard}
      />

      {state === 'loading' && <DashboardSkeleton admin={false} tiles={false} />}

      {state === 'error' && (
        <ErrorState
          title="We couldn’t load the dashboard"
          message={errorMessage ?? 'The dashboard didn’t load.'}
          onRetry={retry}
        />
      )}

      {state === 'ready' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <LastUpdated fetchedAt={fetchedAt} refreshFailed={refreshFailed} />
            {truncated && <TruncationNote rows={active.length} />}
          </div>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-5 xl:gap-6">
            <div className="flex min-w-0 flex-col gap-4 xl:col-span-2 xl:gap-6">
              <DashboardPanel
                id="sign-off-heading"
                title="Waiting for your sign off"
                icon={ShieldCheck}
                tone="verification"
                count={derived.queueCount}
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
                  <PanelEmpty icon={CheckCircle2}>Nothing waiting for your sign off.</PanelEmpty>
                ) : (
                  <TicketRowList label="Tickets waiting for your sign off, oldest first">
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

              <DashboardPanel id="my-work-heading" title="My work" icon={Wrench} tone="progress" count={derived.work.length}>
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
                <TeamSection active={active} fetchedAt={fetchedAt} onTicketsChanged={refresh} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
