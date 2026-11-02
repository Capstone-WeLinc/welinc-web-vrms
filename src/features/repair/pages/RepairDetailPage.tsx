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
import { getApiErrorMessage, getApiErrorStatus, getInvalidTransition, getPhotoRequired } from '../../../lib/api/errors';
import {
  assignMechanics,
  editTicketDetails,
  unlockRepairTicket,
  updateRepairStatus,
  type EditDetailsPayload,
} from '../../../lib/api/repairApi';
import { useHasTabBar } from '../../../components/layout/useNavSections';
import { useCan } from '../../../lib/permissions/usePermissions';
import type { IssueResolution, RepairStatus, RepairTicket } from '../../../types';
import { ActivitySection } from '../components/ActivitySection';
import { AiDiagnosisSection } from '../components/AiDiagnosisSection';
import { Callout } from '../../../components/shared/Callout';
import { CostsSection } from '../components/CostsSection';
import { AssignMechanicDialog } from '../components/AssignMechanicDialog';
import { NextActionBar } from '../components/NextActionBar';
import { RepairDetailSkeleton } from '../components/RepairDetailSkeleton';
import { SendBackBanner } from '../components/SendBackBanner';
import { IssuesSection } from '../components/IssuesSection';
import { NotesSection, VehicleSection } from '../components/TicketMainSections';
import { TicketNoteDialog } from '../components/TicketNoteDialog';
import { DetailsCard, PeopleCard, StatusCard } from '../components/TicketSidePanel';
import { DocumentsCard } from '../components/DocumentsCard';
import { EditDetailsDialog } from '../components/edit/EditDetailsDialog';
import { TicketFilesProvider } from '../components/TicketFilesProvider';
import { useEditSession } from '../hooks/useEditSession';
import { useRepairTicket } from '../hooks/useRepairTicket';
import { ticketEditable } from '../lib/ticketEdits';
import { photosInFlight } from '../lib/photoUpload';
import {
  canWorkTicket,
  COSTS_SECTION_ID,
  hasCosts,
  isClosed,
  primaryTarget,
  STALE_TICKET_MESSAGE,
  ticketActions,
} from '../lib/nextAction';

/** Primary is the forward move or Unlock; secondary is Return to mechanic (spec 0014, AC-15). */
type DialogKind = 'primary' | 'secondary' | 'cancel' | null;

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
  const holdsVerify = useCan('ticket.verify');
  const seesActivity = useCan('audit.view');
  // Spec 0012: ai.use shows the AI panel (its key leaves while AI is off, AC-13). Whether the
  // "What fixed it" step runs comes from the move's `needs` (spec 0014, AC-13)
  const usesAi = useCan('ai.use');
  const hasTabBar = useHasTabBar();
  const { showToast } = useToast();
  const { state, ticket, loadedAt, errorCode, errorMessage, replace, reload, retry } = useRepairTicket(repairId);
  const [dialog, setDialog] = useState<DialogKind>(null);
  // Spec 0019: the edit dialogs, one at a time, each with the ticket it opened with (AC-22)
  const edits = useEditSession();

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
  // Spec 0014, AC-15: every button comes from the moves the server sent
  const actions = ticketActions(ticket, holdsVerify);
  const { primary, secondary, cancel } = actions;
  const move = primary?.kind === 'move' ? primary.move : null;
  // The bottom bar shows only when this user has a primary button.
  const barLabel = !readOnly && primary ? (primary.kind === 'move' ? primary.move.label : primary.label) : null;
  const barSecondary = barLabel && secondary ? secondary.label : null;
  const moveTo = primaryTarget(actions);

  // A 409 closes the dialog, says so, and shows the latest ticket with its own next action.
  const handleStale = () => {
    setDialog(null);
    edits.close();
    showToast(STALE_TICKET_MESSAGE, 'error');
    void reload();
  };

  /** AC-19: a move the server no longer allows closes the dialog, says why and reloads. */
  const handleRefused = (err: unknown) => {
    if (getApiErrorStatus(err) === 409) {
      handleStale();
      return true;
    }
    // Spec 0018: a photo rule the ticket no longer meets is handled the same way
    const invalid = getInvalidTransition(err) ?? getPhotoRequired(err);
    if (!invalid) return false;
    setDialog(null);
    showToast(invalid, 'error');
    void reload();
    return true;
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
      // Other 400s show their message inside the dialog, with the typed note kept
      if (!handleRefused(err)) throw err;
    }
  };

  const unlock = async (reason: string) => {
    try {
      const updated = await unlockRepairTicket(ticket.id, reason.trim(), ticket.updatedAt);
      setDialog(null);
      replace(updated);
      showToast(`${rep} is unlocked.`, 'success');
    } catch (err) {
      if (getApiErrorStatus(err) === 409) return handleStale();
      // A 400 means someone else unlocked it first.
      if (getApiErrorStatus(err) !== 400) throw err;
      setDialog(null);
      showToast(getApiErrorMessage(err, 'This ticket can’t be unlocked right now.'), 'error');
      void reload();
    }
  };

  const assign = async (mechanicIds: string[]) => {
    try {
      const updated = await assignMechanics(ticket.id, mechanicIds, ticket.updatedAt);
      setDialog(null);
      replace(updated);
      showToast(`${rep} is assigned.`, 'success');
    } catch (err) {
      // A stale ticket or a ticket that is no longer Open closes the dialog and reloads, like the other actions
      if (handleRefused(err)) return;
      throw err;
    }
  };

  // Spec 0019, AC-18: a save replaces the ticket; a 409 closes the dialog and reloads, other errors stay in it
  const saveDetails = async (payload: EditDetailsPayload) => {
    try {
      const updated = await editTicketDetails(ticket.id, payload);
      edits.close();
      replace(updated);
      showToast(`${rep} is updated.`, 'success');
    } catch (err) {
      if (getApiErrorStatus(err) === 409) return handleStale();
      throw err;
    }
  };

  // Spec 0019, AC-1 and AC-2: the Edit buttons follow the ticket's flags and lock state
  const canEditDetails = !readOnly && ticket.can.edit && ticketEditable(ticket);

  const noMechanic =
    ticket.can.administer && (moveTo === 'IN_PROGRESS' || moveTo === 'FOR_VERIFICATION') && (ticket.mechanics ?? []).length === 0;
  const noCosts = seesCosts && moveTo === 'CLOSED' && !hasCosts(ticket);

  return (
    // Keyed by ticket, so a link to another ticket (similar repairs) starts every section fresh.
    <div key={ticket.id} className={barLabel ? (barSecondary ? 'pb-36 md:pb-20 lg:pb-0' : 'pb-20 lg:pb-0') : undefined}>
      <BackLink to={back.to} label={back.label} />
      <PageHeader title={rep} subtitle={ticket.vehicleModel ? `${ticket.vehiclePlate} · ${ticket.vehicleModel}` : ticket.vehiclePlate} icon={Wrench} />
      {ticket.lastRejection && <SendBackBanner key={`${ticket.lastRejection.at}:${loadedAt}`} rejection={ticket.lastRejection} now={loadedAt} />}

      {/* Spec 0017: one file list and one upload queue for the photos and the Documents card. Spec 0018: a
          file change reloads the ticket (its photo rules), and photos still in the queue hold Start work. */}
      <TicketFilesProvider ticketId={ticket.id} onFilesChanged={reload}>
        {({ queue }) => {
          const shown = photosInFlight(queue.items) ? ticketActions(ticket, holdsVerify, true) : actions;
          return (
            <>
              <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
                <aside aria-label="Ticket summary" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20 lg:col-start-3 lg:row-start-1">
                  <StatusCard
                    ticket={ticket}
                    readOnly={readOnly}
                    actions={shown}
                    onPrimary={() => setDialog('primary')}
                    onSecondary={() => setDialog('secondary')}
                    onCancel={() => setDialog('cancel')}
                  />
                  <DetailsCard ticket={ticket} now={loadedAt} />
                  <PeopleCard ticket={ticket} />
                  {/* Spec 0017, AC-27: receipts and other documents are cost paperwork */}
                  {seesCosts && <DocumentsCard />}
                </aside>

                <div className="flex min-w-0 flex-col gap-4 lg:col-span-2 lg:col-start-1 lg:row-start-1">
                  <NotesSection ticket={ticket} />
                  <VehicleSection
                    ticket={ticket}
                    action={
                      canEditDetails ? (
                        <Button variant="outline" size="sm" aria-label="Edit vehicle and driver" onClick={() => edits.open('details', ticket)}>
                          Edit
                        </Button>
                      ) : null
                    }
                  />
                  <IssuesSection ticket={ticket} canWork={!readOnly && canWorkTicket(ticket)} onChanged={replace} onStale={handleStale} />
                  {usesAi && <AiDiagnosisSection ticket={ticket} />}
                  {seesCosts && <CostsSection ticket={ticket} readOnly={readOnly} onSaved={replace} onReload={reload} />}
                  {seesActivity && <ActivitySection ticketId={ticket.id} />}
                </div>
              </div>

              {barLabel && (
                <NextActionBar
                  label={barLabel}
                  secondaryLabel={barSecondary}
                  aboveTabBar={hasTabBar}
                  blockedReason={shown.blocked}
                  onAction={() => setDialog('primary')}
                  onSecondary={() => setDialog('secondary')}
                />
              )}
            </>
          );
        }}
      </TicketFilesProvider>

      {move && (
        <TicketNoteDialog
          open={dialog === 'primary'}
          onOpenChange={(open) => setDialog(open ? 'primary' : null)}
          title={`${move.label} on ${rep}?`}
          fieldLabel="Remarks"
          confirmLabel={move.label}
          // Keyed by version, so the per issue blocks start from the ticket as it is now
          key={ticket.updatedAt}
          resolutionIssues={move.needs === 'resolutions' ? (ticket.issues ?? []) : undefined}
          onSubmit={(note, resolutions) => changeStatus(move.to, { remarks: note.trim() || undefined, resolutions })}
        >
          {noMechanic && <Callout tone="warning">No mechanic is assigned yet.</Callout>}
          {noCosts && (
            <Callout tone="warning">
              {ticket.can.editCosts ? (
                <>
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
                </>
              ) : (
                <p>No costs recorded yet. An Admin will need to unlock this ticket to add them.</p>
              )}
            </Callout>
          )}
        </TicketNoteDialog>
      )}

      {secondary && (
        <TicketNoteDialog
          open={dialog === 'secondary'}
          onOpenChange={(open) => setDialog(open ? 'secondary' : null)}
          title={`${secondary.label} ${rep}?`}
          description="The ticket goes back to In progress. Ticked steps and saved notes stay."
          fieldLabel="What needs fixing?"
          requiredMessage="Say what needs fixing."
          minLength={5}
          confirmLabel={secondary.label}
          key={`back-${ticket.updatedAt}`}
          onSubmit={(note) => changeStatus(secondary.to, { remarks: note.trim() })}
        />
      )}

      {cancel && (
        <TicketNoteDialog
          open={dialog === 'cancel'}
          onOpenChange={(open) => setDialog(open ? 'cancel' : null)}
          title={`Cancel ${rep}?`}
          fieldLabel="Cancellation reason"
          requiredMessage="Enter a reason for cancelling."
          confirmLabel={cancel.label}
          cancelLabel="Keep ticket"
          destructive
          onSubmit={(reason) => changeStatus(cancel.to, { cancellationReason: reason.trim() })}
        />
      )}

      {primary?.kind === 'assign' && (
        <AssignMechanicDialog
          open={dialog === 'primary'}
          onOpenChange={(open) => setDialog(open ? 'primary' : null)}
          repairNumber={rep}
          onSubmit={assign}
        />
      )}

      {edits.session?.kind === 'details' && (
        <EditDetailsDialog
          key={edits.session.n}
          open={edits.session.open}
          onOpenChange={(open) => !open && edits.close()}
          ticket={edits.session.ticket}
          onSave={saveDetails}
        />
      )}

      {primary?.kind === 'unlock' && (
        <TicketNoteDialog
          open={dialog === 'primary'}
          onOpenChange={(open) => setDialog(open ? 'primary' : null)}
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
