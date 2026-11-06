import { lazy, Suspense, useRef, useState } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { confirm } from '../../../components/shared/confirm/confirm';
import { DetailSection } from '../../../components/shared/DetailSection';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import type { RepairIssue, RepairTicket } from '../../../types';
import { useEntryOptions } from '../hooks/useEntryOptions';
import { useTicketView } from '../hooks/useTicketView';
import { useTickOverrides } from '../hooks/useTickOverrides';
import { issueState, stripSystem, summaryCounts, summaryText } from '../lib/issueRow';
import { useModuleOn } from '../../../lib/permissions/usePermissions';
import { moveAttachment, removeAttachment, type Attachment } from '../../../lib/api/attachmentsApi';
import { useTicketFiles } from '../hooks/ticketFiles';
import { groupLimit, isPhoto, PHOTO_GROUP_LABELS, photoGroups, photoRoomLeft, uploadGroup } from '../lib/photoUpload';
import { IssueRow } from './IssueRow';
import { PhotoStrip } from './PhotoStrip';

// Spec 0017, AC-24: the viewer and its library load on first open only
const PhotoViewer = lazy(() => import('./PhotoViewer').then((m) => ({ default: m.PhotoViewer })));

interface IssuesSectionProps {
  ticket: RepairTicket;
  /** The viewer may work this ticket (an admin, or the assigned mechanic or chief) and it isn't read only. */
  canWork: boolean;
  onChanged: (ticket: RepairTicket) => void;
  /** A 409: the page says so and loads the latest ticket. */
  onStale: () => void;
  /** Spec 0023, AC-2 and AC-4: opens Edit steps for an issue; null when the caller can't edit steps now. */
  onEditSteps?: ((issue: RepairIssue) => void) | null;
  /** Spec 0019, AC-14 to AC-16: Add issue, and each issue's Edit and Remove; null when the caller can't edit. */
  edit?: {
    onAdd: () => void;
    onEdit: (issue: RepairIssue) => void;
    onRemove: (issue: RepairIssue, taggedPhotos: number) => void;
  } | null;
}

/** Spec 0024: the issues as foldable rows, each with its progress and state, plus the ticket's photos. */
export function IssuesSection({ ticket, canWork, onChanged, onStale, onEditSteps, edit }: IssuesSectionProps) {
  const issues = ticket.issues ?? [];
  const knowledgeOn = useModuleOn('knowledge');
  const canLink = knowledgeOn && canWork && (ticket.status === 'ASSIGNED' || ticket.status === 'IN_PROGRESS');
  const canTick = canWork && ticket.status === 'IN_PROGRESS';
  const entries = useEntryOptions(canLink);
  // AC-3: one set of pending ticks for the whole list, so every reader sees the same steps
  const ticks = useTickOverrides(ticket.id, issues);
  const rows = issues.map((issue) => {
    const steps = ticks.stepsOf(issue);
    return { issue, steps, state: issueState(issue, steps) };
  });
  const view = useTicketView(
    ticket.id,
    ticket.status,
    rows.map((row) => ({ id: row.issue.id, state: row.state })),
  );
  const { showToast } = useToast();
  const { attachments, queue } = useTicketFiles();
  /** Photo uploads only; documents queue in the Documents card. */
  const photoQueue = queue.items.filter((item) => item.kind === 'PHOTO');
  /** Index into `photos` while the viewer is open, else -1 (AC-24). */
  const [viewerIndex, setViewerIndex] = useState(-1);
  /** The viewer's code loads on first open only. */
  const [viewerLoaded, setViewerLoaded] = useState(false);
  /** The photo whose move is in flight (spec 0018, AC-9). */
  const [movingId, setMovingId] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  const list = attachments.list;
  // Spec 0018, AC-1 and AC-16: the server files a photo Before or After; the strip mirrors its rule
  const workStarted = ticket.workStartedAt != null;
  const target = PHOTO_GROUP_LABELS[uploadGroup(workStarted)].toLowerCase();
  const photoKind = list?.kinds.find((k) => k.kind === 'PHOTO');
  const canAddPhotos = list != null && list.can.addFiles && photoKind != null;
  const groups = list ? photoGroups(list, workStarted) : [];
  /** Every live photo in the order shown: the viewer walks all of them (AC-24). */
  const photos = groups.flatMap((group) => group.photos);
  const inFlight = photoQueue.filter((item) => item.status === 'waiting' || item.status === 'uploading').length;
  const room = list ? photoRoomLeft(list.limits, inFlight, workStarted) : 0;
  const targetLimit = list ? groupLimit(list.limits, uploadGroup(workStarted)) : null;
  const limitText =
    targetLimit && room === 0
      ? `${PHOTO_GROUP_LABELS[uploadGroup(workStarted)]} photos full (${Math.min(targetLimit.max, targetLimit.count + inFlight)} of ${targetLimit.max})`
      : null;
  const issueNames = new Map(issues.map((issue, index) => [issue.id, `Issue ${index + 1}: ${stripSystem(issue.description)}`]));

  /** Queue what fits in the group new photos land in; the queue uploads one at a time (AC-21, AC-23). */
  const addPhotos = (files: File[]) => {
    if (!list || !photoKind || !targetLimit) return;
    const taken = files.slice(0, room);
    if (taken.length < files.length) {
      showToast(
        room === 0
          ? `This ticket already has ${targetLimit.max} ${target} photos, the most allowed.`
          : `Only ${room} more ${target} ${room === 1 ? 'photo fits' : 'photos fit'} on this ticket, so the rest were left out.`,
        'error',
      );
    }
    if (taken.length) queue.add(taken, photoKind, list.limits.maxFileMb);
  };

  /** AC-25: ask first, then the photo leaves the strip and the viewer. */
  const removePhoto = async (photo: Attachment) => {
    const ok = await confirm({
      title: 'Remove this photo?',
      description: 'It disappears from the ticket for everyone.',
      confirmText: 'Remove',
      tone: 'destructive',
    });
    if (!ok) return;
    try {
      await removeAttachment(ticket.id, photo.id);
      const fresh = await attachments.reload();
      const left = fresh?.items.filter(isPhoto).length ?? 0;
      setViewerIndex((i) => (i >= left ? left - 1 : i));
      showToast('Photo removed', 'success');
    } catch (err) {
      // A 403 already showed the fixed denied toast
      if (getApiErrorStatus(err) !== 403) showToast(getApiErrorMessage(err, 'Couldn’t remove the photo. Try again.'), 'error');
    }
  };

  /** Spec 0018, AC-9: the viewer's Move. The strip regroups; the viewer stays on the moved photo. */
  const movePhoto = async (photo: Attachment) => {
    const to = photo.kind === 'PROOF' ? 'VEHICLE_PHOTO' : 'PROOF';
    setMovingId(photo.id);
    try {
      await moveAttachment(ticket.id, photo.id, to);
      const fresh = await attachments.reload();
      if (fresh) {
        const order = photoGroups(fresh, workStarted).flatMap((group) => group.photos);
        setViewerIndex(order.findIndex((p) => p.id === photo.id));
      }
      showToast(`Photo moved to ${PHOTO_GROUP_LABELS[to]}.`, 'success');
    } catch (err) {
      // A 403 already showed the fixed denied toast; a 409 (group full, ticket finished) says why
      if (getApiErrorStatus(err) !== 403) showToast(getApiErrorMessage(err, 'Couldn’t move the photo. Try again.'), 'error');
      void attachments.reload();
    } finally {
      setMovingId(null);
    }
  };

  const openViewer = (photo: Attachment, thumb: HTMLButtonElement) => {
    opener.current = thumb;
    setViewerLoaded(true);
    setViewerIndex(photos.findIndex((p) => p.id === photo.id));
  };

  return (
    <DetailSection
      title="Issues"
      action={
        edit ? (
          <Button variant="outline" size="sm" onClick={edit.onAdd}>
            Add issue
          </Button>
        ) : null
      }
    >
      {viewerLoaded && (
        <Suspense fallback={null}>
          <PhotoViewer
            photos={photos}
            index={viewerIndex}
            issueNames={issueNames}
            onIndexChange={setViewerIndex}
            onLinkError={attachments.reload}
            onClosed={() => opener.current?.focus()}
            onMove={(photo) => void movePhoto(photo)}
            movingId={movingId}
          />
        </Suspense>
      )}
      {attachments.state === 'error' ? (
        <p className="text-sm text-muted-foreground">{attachments.errorMessage}</p>
      ) : (
        list && (
          <PhotoStrip
            groups={groups}
            queue={photoQueue}
            canAdd={canAddPhotos}
            limitText={limitText}
            label="Photos"
            onAdd={addPhotos}
            onRetry={queue.retry}
            onDismiss={queue.remove}
            onOpen={openViewer}
            onRemove={(photo) => void removePhoto(photo)}
            onLinkError={attachments.reload}
          />
        )
      )}
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No issues logged.</p>
      ) : (
        <div className="flex flex-col">
          {/* AC-6: the ticket's progress at a glance, with Expand all and Collapse all */}
          <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 border-b border-border pb-2">
            <p className="text-xs text-muted-foreground tabular-nums">{summaryText(summaryCounts(rows))}</p>
            {issues.length > 1 && (
              <div className="-mr-2 flex items-center">
                <Button type="button" variant="ghost" size="sm" className="h-11 px-2 text-xs text-muted-strong md:h-8" onClick={view.expandAll}>
                  Expand all
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-11 px-2 text-xs text-muted-strong md:h-8" onClick={view.collapseAll}>
                  Collapse all
                </Button>
              </div>
            )}
          </div>
          <Accordion type="multiple" value={view.open} onValueChange={view.setOpen} className="flex flex-col divide-y divide-border">
            {rows.map(({ issue, steps, state }, index) => (
              <IssueRow
                key={issue.id}
                ticket={ticket}
                issue={issue}
                index={index}
                steps={steps}
                state={state}
                canLink={canLink}
                knowledgeOn={knowledgeOn}
                canTick={canTick}
                entries={entries}
                hideDone={view.hideDone.includes(issue.id)}
                onHideDone={(on) => view.setHideDone(issue.id, on)}
                onToggle={(step, checked) => void ticks.toggle(issue, step, checked)}
                onRelinked={() => ticks.clearIssue(issue.id)}
                onChanged={onChanged}
                onStale={onStale}
                onEdit={edit ? () => edit.onEdit(issue) : undefined}
                onEditSteps={onEditSteps ? () => onEditSteps(issue) : undefined}
                // Spec 0019, AC-17: a ticket always keeps one issue, so the last one has no Remove
                onRemove={
                  edit && issues.length > 1
                    ? () => edit.onRemove(issue, (list?.items ?? []).filter((file) => file.issueId === issue.id).length)
                    : undefined
                }
              />
            ))}
          </Accordion>
        </div>
      )}
    </DetailSection>
  );
}
