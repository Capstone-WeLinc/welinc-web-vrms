import { useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { SearchX, ShieldAlert, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/PageHeader';
import { BackLink } from '../../../components/shared/BackLink';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { statusLabel } from '../../../components/shared/statusLabels';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { unlockRepairTicket, updateRepairStatus } from '../../../lib/api/repairApi';
import { useHasTabBar } from '../../../components/layout/useNavSections';
import { useCan } from '../../../lib/permissions/usePermissions';
import type { IssueResolution, RepairStatus, RepairTicket } from '../../../types';
import { ActivitySection } from '../components/ActivitySection';
import { AiDiagnosisSection } from '../components/AiDiagnosisSection';
import { Callout } from '../../../components/shared/Callout';
import { CostsSection } from '../components/CostsSection';
import { NextActionBar } from '../components/NextActionBar';
import { RepairDetailSkeleton } from '../components/RepairDetailSkeleton';
import { IssuesSection } from '../components/IssuesSection';
import { NotesSection, VehicleSection } from '../components/TicketMainSections';
import { TicketNoteDialog } from '../components/TicketNoteDialog';
import { DetailsCard, PeopleCard, StatusCard } from '../components/TicketSidePanel';
import { useRepairTicket } from '../hooks/useRepairTicket';
import {
  canCancel,
  canWorkTicket,
  COSTS_SECTION_ID,
  hasCosts,
  isClosed,
  nextAction,
  STALE_TICKET_MESSAGE,
} from '../lib/nextAction';

type DialogKind = 'status' | 'cancel' | 'unlock' | null;

/** The list passes its own URL as `state.from`, so Back returns to the same filters and page. */
function backLink(ticket: RepairTicket | null, from: unknown) {
  if (ticket && isClosed(ticket)) return { to: '/history', label: 'Back to history' };
  const listUrl = typeof from === 'string' && from.startsWith('/repairs') ? from : '/repairs';
  return { to: listUrl, label: 'Back to repairs' };
}

function scrollToCosts() {
  const section = document.getElementById(COSTS_SECTION_ID);
  section?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  section?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

export function RepairDetailPage() {
  const { repairId = '' } = useParams<{ repairId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const readOnly = searchParams.get('mode') === 'readonly';
  // Page level keys; what this caller may do on this ticket comes from ticket.can (spec 0011, AC-22)
  const seesCosts = useCan('ticket.costs.view');
  const seesActivity = useCan('audit.view');
  const hasTabBar = useHasTabBar();
  const { showToast } = useToast();
  const { state, ticket, loadedAt, errorCode, errorMessage, replace, reload, retry } = useRepairTicket(repairId);
  const [dialog, setDialog] = useState<DialogKind>(null);

  const back = backLink(ticket, (location.state as { from?: unknown } | null)?.from);

  if (state !== 'ready' || !ticket) {
    let body;
    if (state === 'loading') {
      return <RepairDetailSkeleton />;
    } else if (errorCode === 404) {
      body = <EmptyState title="Repair ticket not found" icon={SearchX} action={<Button asChild variant="outline"><Link to="/repairs">Back to repairs</Link></Button>} />;
    } else if (errorCode === 403) {
      body = (
        <EmptyState
          title="This ticket isn’t assigned to you"
          icon={ShieldAlert}
          action={<Button asChild variant="outline"><Link to="/repairs">Back to repairs</Link></Button>}
        />
      );
    } else {
      body = <ErrorState title="We couldn’t load this ticket" message={errorMessage ?? 'This repair ticket didn’t load.'} onRetry={retry} />;
    }
    return (
      <div>
        <BackLink to="/repairs" label="Back to repairs" />
        <PageHeader title="Repair ticket" icon={Wrench} />
        <div className="rounded-xl border border-border bg-card shadow-xs">{body}</div>
      </div>
    );
  }

  const rep = ticket.repairNumber;
  const action = nextAction(ticket);
  const administers = ticket.can.administer;
  // The bottom bar shows only when AC-14 gives this user a button.
  const barLabel = !readOnly && action.kind !== 'note' ? action.label : null;
  const moveTo = action.kind === 'move' ? action.to : null;

  // AC-19: a 409 closes the dialog, says so, and shows the latest ticket with its own next action.
  const handleStale = () => {
    setDialog(null);
    showToast(STALE_TICKET_MESSAGE, 'error');
    void reload();
  };

  const changeStatus = async (
    to: RepairStatus,
    extras: { remarks?: string; cancellationReason?: string; resolutions?: IssueResolution[] },
  ) => {
    try {
      const updated = await updateRepairStatus(ticket.id, to, { ...extras, lastUpdatedAt: ticket.updatedAt });
      setDialog(null);
      replace(updated);
      showToast(`${rep} moved to ${statusLabel(updated.status)}.`, 'success');
    } catch (err) {
      if (getApiErrorStatus(err) === 409) return handleStale();
      throw err;
    }
  };

  const unlock = async (reason: string) => {
    try {
      const updated = await unlockRepairTicket(ticket.id, reason.trim());
      setDialog(null);
      replace(updated);
      showToast(`${rep} is unlocked.`, 'success');
    } catch (err) {
      // Unlock has no lastUpdatedAt; a 400 means someone else unlocked it or it reopened.
      if (getApiErrorStatus(err) !== 400) throw err;
      setDialog(null);
      showToast(getApiErrorMessage(err, 'This ticket can’t be unlocked right now.'), 'error');
      void reload();
    }
  };

  const openAction = () => setDialog(action.kind === 'unlock' ? 'unlock' : 'status');
  const noMechanic = administers && (moveTo === 'IN_PROGRESS' || moveTo === 'FOR_VERIFICATION') && (ticket.mechanics ?? []).length === 0;
  const noCosts = seesCosts && moveTo === 'CLOSED' && !hasCosts(ticket);

  return (
    // Keyed by ticket, so a link to another ticket (similar repairs) starts every section fresh.
    <div key={ticket.id} className={barLabel ? 'pb-20 lg:pb-0' : undefined}>
      <BackLink to={back.to} label={back.label} />
      <PageHeader title={rep} subtitle={ticket.vehicleModel ? `${ticket.vehiclePlate} · ${ticket.vehicleModel}` : ticket.vehiclePlate} icon={Wrench} />

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <aside aria-label="Ticket summary" className="flex flex-col gap-4 lg:sticky lg:top-20 lg:col-start-3 lg:row-start-1">
          <StatusCard
            ticket={ticket}
            readOnly={readOnly}
            action={action}
            showCancel={!readOnly && canCancel(ticket)}
            onAction={openAction}
            onCancel={() => setDialog('cancel')}
          />
          <DetailsCard ticket={ticket} now={loadedAt} />
          <PeopleCard ticket={ticket} />
        </aside>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <NotesSection ticket={ticket} />
          <VehicleSection ticket={ticket} />
          <IssuesSection ticket={ticket} canWork={!readOnly && canWorkTicket(ticket)} onChanged={replace} onStale={handleStale} />
          <AiDiagnosisSection ticket={ticket} />
          {seesCosts && <CostsSection ticket={ticket} readOnly={readOnly} onSaved={replace} onReload={reload} />}
          {seesActivity && <ActivitySection ticketId={ticket.id} />}
        </div>
      </div>

      {barLabel && <NextActionBar label={barLabel} aboveTabBar={hasTabBar} onAction={openAction} />}

      {action.kind === 'move' && (
        <TicketNoteDialog
          open={dialog === 'status'}
          onOpenChange={(open) => setDialog(open ? 'status' : null)}
          title={`${action.label} on ${rep}?`}
          fieldLabel="Remarks"
          confirmLabel={action.label}
          // Keyed by version, so the per issue blocks start from the ticket as it is now
          key={ticket.updatedAt}
          resolutionIssues={action.to === 'FOR_VERIFICATION' ? (ticket.issues ?? []) : undefined}
          onSubmit={(note, resolutions) => changeStatus(action.to, { remarks: note.trim() || undefined, resolutions })}
        >
          {noMechanic && <Callout tone="warning">No mechanic is assigned yet.</Callout>}
          {noCosts && (
            <Callout tone="warning">
              <p>No costs are recorded yet. Once closed, the ticket locks, and costs can only be added after an unlock.</p>
              <Button
                type="button"
                variant="link"
                className="h-auto px-0"
                onClick={() => {
                  setDialog(null);
                  // After the dialog's close animation hands focus back, move to Costs.
                  window.setTimeout(scrollToCosts, 250);
                }}
              >
                Go to costs
              </Button>
            </Callout>
          )}
        </TicketNoteDialog>
      )}

      {canCancel(ticket) && (
        <TicketNoteDialog
          open={dialog === 'cancel'}
          onOpenChange={(open) => setDialog(open ? 'cancel' : null)}
          title={`Cancel ${rep}?`}
          fieldLabel="Cancellation reason"
          requiredMessage="Enter a reason for cancelling."
          confirmLabel="Cancel ticket"
          cancelLabel="Keep ticket"
          destructive
          onSubmit={(reason) => changeStatus('CANCELLED', { cancellationReason: reason.trim() })}
        />
      )}

      {action.kind === 'unlock' && (
        <TicketNoteDialog
          open={dialog === 'unlock'}
          onOpenChange={(open) => setDialog(open ? 'unlock' : null)}
          title={`Unlock ${rep}?`}
          description="Unlocking lets you edit costs. Saving costs locks it again."
          fieldLabel="Reason"
          requiredMessage="Enter a reason for unlocking."
          confirmLabel="Unlock ticket"
          onSubmit={unlock}
        />
      )}
    </div>
  );
}
