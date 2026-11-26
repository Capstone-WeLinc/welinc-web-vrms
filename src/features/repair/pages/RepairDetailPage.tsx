import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/PageHeader';
import { BackLink } from '../../../components/shared/BackLink';
import { RecordNotFound } from '../../../components/shared/RecordNotFound';
import { GateScene } from '../../../components/brand/scenes/GateScene';
import { ScenePanel } from '../../../components/brand/scenes/ScenePanel';
import { ErrorState } from '../../../components/shared/ErrorState';
import { statusLabel } from '../../../components/shared/statusLabels';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage, getApiErrorStatus, getDriverExists, getInvalidTransition, getPhotoRequired } from '../../../lib/api/errors';
import {
  addTicketIssue,
  editTicketDetails,
  editTicketIssue,
  pickOutsideShop,
  removeTicketIssue,
  saveIssueChecklist,
  setMechanics,
  unlockRepairTicket,
  updateRepairStatus,
  type EditDetailsPayload,
} from '../../../lib/api/repairApi';
import { useHasTabBar } from '../../../components/layout/useNavSections';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useCan } from '../../../lib/permissions/usePermissions';
import type { IssueResolution, RepairIssue, RepairStatus, RepairTicket } from '../../../types';
import { ActivitySection } from '../components/ActivitySection';
import { AiDiagnosisSection } from '../components/AiDiagnosisSection';
import { Callout } from '../../../components/shared/Callout';
import { CostsSection } from '../components/CostsSection';
import { AssignMechanicDialog } from '../components/AssignMechanicDialog';
import { NextActionBar } from '../components/NextActionBar';
import { RepairDetailSkeleton } from '../components/RepairDetailSkeleton';
import { SendBackBanner } from '../components/SendBackBanner';
import { IssuesSection } from '../components/IssuesSection';
import { PhotosCard } from '../components/PhotosCard';
import { TicketNoteDialog } from '../components/TicketNoteDialog';
import { DetailsCard, NotesCard, PeopleCard, StatusCard } from '../components/TicketSidePanel';
import { TicketHeader } from '../components/TicketHeader';
import { DocumentsCard } from '../components/DocumentsCard';
import { EditDetailsDialog } from '../components/edit/EditDetailsDialog';
import { IssueEditDialog, type IssueSave } from '../components/edit/IssueEditDialog';
import { OutsideShopDialog } from '../components/edit/OutsideShopDialog';
import { ChecklistEditDialog, type ChecklistSave } from '../components/edit/ChecklistEditDialog';
import { canEditChecklist, STALE_CHECKLIST_MESSAGE } from '../lib/checklist';
import { confirm } from '../../../components/shared/confirm/confirm';
import { TicketFilesProvider } from '../components/TicketFilesProvider';
import { useEditSession } from '../hooks/useEditSession';
import { useRepairTicket } from '../hooks/useRepairTicket';
import { editNeedsReason, issueRemovalSummary, ticketEditable } from '../lib/ticketEdits';
import { photosInFlight, PHOTOS_SECTION_ID } from '../lib/photoUpload';
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

const motion = (): ScrollBehavior => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

function scrollToCosts() {
  const section = document.getElementById(COSTS_SECTION_ID);
  section?.scrollIntoView({ behavior: motion() });
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
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<DialogKind>(null);
  // Spec 0029, AC-36: the late outside shop pick
  const [shopOpen, setShopOpen] = useState(false);
  // Spec 0024, AC-18: from 1024px the sidebar sits on the right; below, one column in the phone order
  const wide = useMediaQuery('(min-width: 1024px)');
  const { state, ticket, loadedAt, errorCode, errorMessage, replace, reload, retry } = useRepairTicket(repairId, {
    // The status dialogs are keyed on the ticket's version, so a refetch would clear a typed note
    paused: dialog !== null,
    // Spec 0019, AC-23: removed from the ticket (403) or the ticket is gone (404) while it was open
    onGone: (code) => {
      showToast(
        code === 403 && ticket ? `You’re no longer assigned to ${ticket.repairNumber}.` : 'This ticket is no longer available.',
        'warning',
      );
      navigate('/repairs', { replace: true });
    },
  });
  // Spec 0019: the edit dialogs, one at a time, each with the ticket it opened with (AC-22)
  const edits = useEditSession();

  const back = backLink(ticket, (location.state as { from?: unknown } | null)?.from);

  if (state !== 'ready' || !ticket) {
    let body;
    if (state === 'loading') {
      return <RepairDetailSkeleton />;
    } else if (errorCode === 404) {
      body = (
        <RecordNotFound
          scenes="pair"
          title="Repair ticket not found"
          line="It may have been deleted, or the link has a typo. Check the ticket number and try again."
          action={<Button asChild variant="outline"><Link to="/repairs">Back to repairs</Link></Button>}
        />
      );
    } else if (errorCode === 403) {
      body = (
        <ScenePanel
          scene={<GateScene />}
          title="This ticket isn’t assigned to you"
          actions={<Button asChild variant="outline"><Link to="/repairs">Back to repairs</Link></Button>}
        />
      );
    } else {
      body = <ErrorState kind="page" reassure={false} title="We couldn’t load this ticket" message={errorMessage ?? 'This repair ticket didn’t load.'} onRetry={retry} />;
    }
    return (
      <div>
        <BackLink to="/repairs" label="Back to repairs" />
        <PageHeader title="Repair ticket" />
        {body}
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
      const updated = await setMechanics(ticket.id, mechanicIds, { lastUpdatedAt: ticket.updatedAt });
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
      // DRIVER_EXISTS is also a 409, but the dialog shows it with "Use <name>" (AC-4); only a stale ticket reloads
      if (getApiErrorStatus(err) === 409 && !getDriverExists(err)) return handleStale();
      throw err;
    }
  };

  // Spec 0019, AC-9: the full list, from the ticket as the dialog opened
  const saveMechanics = async (opened: RepairTicket, mechanicIds: string[], reason?: string) => {
    try {
      const updated = await setMechanics(ticket.id, mechanicIds, { lastUpdatedAt: opened.updatedAt, reason });
      edits.close();
      replace(updated);
      showToast(`Mechanics on ${rep} are updated.`, 'success');
    } catch (err) {
      if (getApiErrorStatus(err) === 409) return handleStale();
      throw err;
    }
  };

  // Spec 0029, AC-36: the outside shop on a ticket outsourced before the picker
  const saveShop = async (opened: RepairTicket, vmmsProviderId: string) => {
    try {
      const updated = await pickOutsideShop(ticket.id, { lastUpdatedAt: opened.updatedAt, vmmsProviderId });
      setShopOpen(false);
      replace(updated);
      showToast(`Outside shop saved on ${rep}.`, 'success');
    } catch (err) {
      if (getApiErrorStatus(err) === 409) {
        setShopOpen(false);
        return handleStale();
      }
      throw err;
    }
  };

  // Spec 0019, AC-14 and AC-15: add or reword an issue, from the ticket as the dialog opened
  const saveIssue = async (opened: RepairTicket, issueId: string | undefined, save: IssueSave) => {
    try {
      const base = { lastUpdatedAt: opened.updatedAt, reason: save.reason };
      const updated =
        save.mode === 'add'
          ? await addTicketIssue(ticket.id, {
              ...base,
              categoryId: save.categoryId,
              rootCause: save.rootCause,
              description: save.description,
              knowledgeEntryId: save.knowledgeEntryId,
            })
          : await editTicketIssue(ticket.id, issueId!, { ...base, categoryId: save.categoryId, text: save.text });
      edits.close();
      replace(updated);
      showToast(save.mode === 'add' ? `Issue added to ${rep}.` : `Issue on ${rep} is updated.`, 'success');
    } catch (err) {
      if (getApiErrorStatus(err) === 409) return handleStale();
      throw err;
    }
  };

  // Spec 0023, AC-6 and AC-17: the issue's full list; a 409 closes the dialog, reloads and says why
  const saveChecklist = async (issueId: string, save: ChecklistSave) => {
    try {
      const updated = await saveIssueChecklist(ticket.id, issueId, save);
      edits.close();
      replace(updated);
      showToast(`Steps on ${rep} are saved.`, 'success');
    } catch (err) {
      if (getApiErrorStatus(err) === 409) {
        edits.close();
        showToast(STALE_CHECKLIST_MESSAGE, 'error');
        void reload();
        return;
      }
      throw err;
    }
  };

  /** AC-16: remove after a confirm naming what goes with it; a closed ticket asks for the reason too. */
  const removeIssue = async (issue: RepairIssue, taggedPhotos: number) => {
    const detail = issueRemovalSummary(issue, taggedPhotos);
    if (editNeedsReason(ticket)) {
      edits.open('removeIssue', ticket, { issueId: issue.id, detail });
      return;
    }
    const ok = await confirm({ title: 'Remove this issue?', description: detail, confirmText: 'Remove issue', tone: 'destructive' });
    if (!ok) return;
    try {
      await sendRemoval(ticket, issue.id);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Couldn’t remove the issue. Try again.'), 'error');
    }
  };

  const sendRemoval = async (opened: RepairTicket, issueId: string, reason?: string) => {
    try {
      const updated = await removeTicketIssue(ticket.id, issueId, { lastUpdatedAt: opened.updatedAt, reason });
      edits.close();
      replace(updated);
      showToast(`Issue removed from ${rep}.`, 'success');
    } catch (err) {
      if (getApiErrorStatus(err) === 409) return handleStale();
      throw err;
    }
  };

  // Spec 0019, AC-1 and AC-2: the Edit buttons follow the ticket's flags and lock state
  const canEditDetails = !readOnly && ticket.can.edit && ticketEditable(ticket);
  const canEditMechanics = !readOnly && ticket.can.assign && ticketEditable(ticket);

  /**
   * AC-13: scroll to the Photos card and focus the needed group's add tile (the file picker can't start after the
   * click); with no tile (the group is full, or the viewer can't add), its heading.
   */
  const goToPhotos = () => {
    const card = document.getElementById(PHOTOS_SECTION_ID);
    card?.scrollIntoView({ behavior: motion(), block: 'start' });
    (
      card?.querySelector<HTMLElement>('[data-photo-needed]') ??
      card?.querySelector<HTMLElement>('[data-photo-add]') ??
      card?.querySelector<HTMLElement>('h2')
    )?.focus({ preventScroll: true });
  };

  const noMechanic =
    ticket.can.administer && (moveTo === 'IN_PROGRESS' || moveTo === 'FOR_VERIFICATION') && (ticket.mechanics ?? []).length === 0;
  const noCosts = seesCosts && moveTo === 'CLOSED' && !hasCosts(ticket);

  return (
    // Keyed by ticket, so a link to another ticket (similar repairs) starts every section fresh.
    <div key={ticket.id} className={barLabel ? (barSecondary ? 'pb-36 md:pb-20 lg:pb-0' : 'pb-20 lg:pb-0') : undefined}>
      <BackLink to={back.to} label={back.label} />
      <TicketHeader ticket={ticket} onPickShop={ticket.can.edit ? () => setShopOpen(true) : undefined} />
      {shopOpen && (
        <OutsideShopDialog open onOpenChange={setShopOpen} repairNumber={ticket.repairNumber} onSave={(id) => saveShop(ticket, id)} />
      )}
      {ticket.lastRejection && <SendBackBanner key={ticket.lastRejection.at} rejection={ticket.lastRejection} now={loadedAt} />}

      {/* Spec 0017: one file list and one upload queue for the photos and the Documents card. Spec 0018: a
          file change reloads the ticket (its photo rules), and photos still in the queue hold Start work. */}
      <TicketFilesProvider ticketId={ticket.id} onFilesChanged={reload}>
        {({ queue }) => {
          const shown = photosInFlight(queue.items) ? ticketActions(ticket, holdsVerify, true) : actions;
          const status = (variant: 'card' | 'line') => (
            <StatusCard
              ticket={ticket}
              now={loadedAt}
              readOnly={readOnly}
              actions={shown}
              variant={variant}
              onPrimary={() => setDialog('primary')}
              onSecondary={() => setDialog('secondary')}
              onCancel={() => setDialog('cancel')}
              onPhotosBlocked={goToPhotos}
            />
          );
          const notes = <NotesCard ticket={ticket} />;
          const people = (
            <PeopleCard
              ticket={ticket}
              action={
                canEditMechanics ? (
                  <Button variant="outline" size="sm" aria-label="Edit mechanics" onClick={() => edits.open('mechanics', ticket)}>
                    Edit
                  </Button>
                ) : null
              }
            />
          );
          const details = (
            <DetailsCard
              ticket={ticket}
              now={loadedAt}
              action={
                canEditDetails ? (
                  <Button variant="outline" size="sm" aria-label="Edit vehicle and driver" onClick={() => edits.open('details', ticket)}>
                    Edit
                  </Button>
                ) : null
              }
            />
          );
          // Spec 0017, AC-27: receipts and other documents are cost paperwork
          const documents = seesCosts ? <DocumentsCard /> : null;
          return (
            <>
              {/* The main column keeps its place in the tree at every width, so a resize never resets the issue rows */}
              <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
                {wide && (
                  <aside aria-label="Ticket summary" className="sticky top-20 col-start-3 row-start-1 flex min-w-0 flex-col gap-4">
                    {status('card')}
                    {notes}
                    {people}
                    {details}
                    {documents}
                  </aside>
                )}

                <div className="flex min-w-0 flex-col gap-4 lg:col-span-2 lg:col-start-1 lg:row-start-1">
                  {!wide && status('line')}
                  {!wide && notes}
                  <IssuesSection
                    ticket={ticket}
                    canWork={!readOnly && canWorkTicket(ticket)}
                    onChanged={replace}
                    onStale={handleStale}
                    onEditSteps={
                      !readOnly && canEditChecklist(ticket) ? (issue) => edits.open('checklist', ticket, { issueId: issue.id }) : null
                    }
                    edit={
                      canEditDetails
                        ? {
                            onAdd: () => edits.open('addIssue', ticket),
                            onEdit: (issue) => edits.open('editIssue', ticket, { issueId: issue.id }),
                            onRemove: (issue, photos) => void removeIssue(issue, photos),
                          }
                        : null
                    }
                  />
                  <PhotosCard ticket={ticket} blockedBy={shown.blockedBy} />
                  {usesAi && <AiDiagnosisSection ticket={ticket} />}
                  {seesCosts && <CostsSection ticket={ticket} readOnly={readOnly} onSaved={replace} onReload={reload} />}
                  {!wide && people}
                  {!wide && details}
                  {!wide && documents}
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
          status={ticket.status}
          onSubmit={assign}
        />
      )}

      {edits.session?.kind === 'mechanics' && (
        <AssignMechanicDialog
          key={edits.session.n}
          open={edits.session.open}
          onOpenChange={(open) => !open && edits.close()}
          repairNumber={rep}
          status={edits.session.ticket.status}
          current={edits.session.ticket.mechanics ?? []}
          needsReason={editNeedsReason(edits.session.ticket)}
          onSubmit={(ids, reason) => saveMechanics(edits.session!.ticket, ids, reason)}
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

      {(edits.session?.kind === 'addIssue' || edits.session?.kind === 'editIssue') && (
        <IssueEditDialog
          key={edits.session.n}
          open={edits.session.open}
          onOpenChange={(open) => !open && edits.close()}
          ticket={edits.session.ticket}
          issue={edits.session.ticket.issues?.find((i) => i.id === edits.session?.issueId)}
          onSave={(save) => saveIssue(edits.session!.ticket, edits.session!.issueId, save)}
        />
      )}

      {edits.session?.kind === 'checklist' &&
        (() => {
          const issueId = edits.session.issueId!;
          const openedIssue = edits.session.ticket.issues?.find((i) => i.id === issueId);
          if (!openedIssue) return null;
          return (
            <ChecklistEditDialog
              key={edits.session.n}
              open={edits.session.open}
              onOpenChange={(open) => !open && edits.close()}
              issue={openedIssue}
              latestSteps={ticket.issues?.find((i) => i.id === issueId)?.steps ?? []}
              onSave={(save) => saveChecklist(issueId, save)}
            />
          );
        })()}

      {edits.session?.kind === 'removeIssue' && (
        <TicketNoteDialog
          key={edits.session.n}
          open={edits.session.open}
          onOpenChange={(open) => !open && edits.close()}
          title="Remove this issue?"
          description={edits.session.detail}
          fieldLabel="Reason for the change"
          requiredMessage="Say why this closed ticket is being changed."
          minLength={5}
          confirmLabel="Remove issue"
          destructive
          onSubmit={(reason) => sendRemoval(edits.session!.ticket, edits.session!.issueId!, reason.trim())}
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
