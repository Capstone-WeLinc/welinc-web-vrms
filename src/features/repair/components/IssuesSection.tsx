import { lazy, Suspense, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, MessageSquarePlus, Pencil, Plus, Trash2, Unlink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BadgePill } from '../../../components/shared/BadgePill';
import { Callout } from '../../../components/shared/Callout';
import { confirm } from '../../../components/shared/confirm/confirm';
import { DetailSection } from '../../../components/shared/DetailSection';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import type { EntryOption } from '../../../lib/api/knowledgeApi';
import { checkIssueStep, linkIssueKnowledge } from '../../../lib/api/repairApi';
import { formatDateTime, formatHours } from '../../../lib/utils/format';
import type { RepairIssue, RepairIssueStep, RepairTicket } from '../../../types';
import { useEntryOptions } from '../hooks/useEntryOptions';
import { hasSavedResolution } from '../lib/resolutionForm';
import { SuggestDialog } from '../../knowledge-base/components/SuggestDialog';
import { useModuleOn } from '../../../lib/permissions/usePermissions';
import { moveAttachment, removeAttachment, type Attachment } from '../../../lib/api/attachmentsApi';
import { useTicketFiles } from '../hooks/ticketFiles';
import { groupLimit, isPhoto, PHOTO_GROUP_LABELS, photoGroups, photoRoomLeft, uploadGroup } from '../lib/photoUpload';
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
  /** Spec 0019, AC-14 to AC-16: Add issue, and each issue's Edit and Remove; null when the caller can't edit. */
  edit?: {
    onAdd: () => void;
    onEdit: (issue: RepairIssue) => void;
    onRemove: (issue: RepairIssue, taggedPhotos: number) => void;
  } | null;
}

/** Same option shape as the repair form picker (AC-24, AC-27). */
function linkOptions(entries: EntryOption[]): ComboboxOption[] {
  return entries.map((entry) => ({
    value: entry.id,
    label: entry.name,
    description: `Seen ${entry.seenCount}×`,
    keywords: [entry.symptoms],
    group: entry.categoryName,
  }));
}

function StepRow({ step, enabled, onToggle }: { step: RepairIssueStep; enabled: boolean; onToggle: (checked: boolean) => void }) {
  const id = `step-${step.id}`;
  const checked = step.checkedAt != null;
  const label = (
    <label
      htmlFor={id}
      className={cn(
        'flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-sm',
        enabled ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default',
        checked ? 'text-muted-foreground line-through' : 'text-foreground',
      )}
    >
      <Checkbox id={id} checked={checked} disabled={!enabled} onCheckedChange={(value) => onToggle(value === true)} className="size-5" />
      <span className="min-w-0 break-words">
        <span className="text-muted-foreground tabular-nums">{step.position}.</span> {step.text}
      </span>
    </label>
  );
  if (!checked) return <li className="flex">{label}</li>;
  // Who ticked it and when, on hover and on focus (AC-28).
  return (
    <li className="flex">
      <Tooltip>
        <TooltipTrigger asChild>{label}</TooltipTrigger>
        <TooltipContent>
          Ticked by {step.checkedByEmail} · {formatDateTime(step.checkedAt!)}
        </TooltipContent>
      </Tooltip>
    </li>
  );
}

interface IssueBlockProps {
  ticket: RepairTicket;
  issue: RepairIssue;
  index: number;
  canLink: boolean;
  /** Spec 0012, AC-15: while the knowledge base is off, a linked entry is plain text. */
  knowledgeOn: boolean;
  canTick: boolean;
  entries: ReturnType<typeof useEntryOptions>;
  onChanged: (ticket: RepairTicket) => void;
  onStale: () => void;
  /** Spec 0019, AC-20: the issue's Edit and Remove, when the caller may edit this ticket. */
  onEdit?: () => void;
  onRemove?: () => void;
}

function IssueBlock({ ticket, issue, index, canLink, knowledgeOn, canTick, entries, onChanged, onStale, onEdit, onRemove }: IssueBlockProps) {
  const { showToast } = useToast();
  // Ticks show at once; a failed save puts the row back (AC-28).
  const [overrides, setOverrides] = useState<Record<string, Pick<RepairIssueStep, 'checkedAt' | 'checkedByEmail'>>>({});
  const [changing, setChanging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const entry = issue.knowledgeEntry;
  const steps = issue.steps.map((s) => ({ ...s, ...overrides[s.id] }));
  const done = steps.filter((s) => s.checkedAt != null).length;
  const hours = entry ? (entry.typicalHours ?? entry.estimatedHours) : null;

  const toggle = async (step: RepairIssueStep, checked: boolean) => {
    const previous = { checkedAt: step.checkedAt, checkedByEmail: step.checkedByEmail };
    setOverrides((o) => ({ ...o, [step.id]: { checkedAt: checked ? new Date().toISOString() : null, checkedByEmail: checked ? 'you' : null } }));
    try {
      const saved = await checkIssueStep(ticket.id, issue.id, step.id, checked);
      setOverrides((o) => ({ ...o, [step.id]: { checkedAt: saved.checkedAt, checkedByEmail: saved.checkedByEmail } }));
    } catch (err) {
      setOverrides((o) => ({ ...o, [step.id]: previous }));
      showToast(getApiErrorMessage(err, 'Couldn’t save that step. Try again.'), 'error');
    }
  };

  /** Link, relink or remove (null). Asks first when ticked steps would be cleared (AC-29). */
  const link = async (entryId: string | null) => {
    if (entry && entryId === entry.id) {
      setChanging(false);
      return;
    }
    if (done > 0) {
      const ok = await confirm({
        title: 'Replace the checklist?',
        description: `${done} ticked ${done === 1 ? 'step' : 'steps'} will be cleared.`,
        confirmText: entryId ? 'Replace' : 'Remove link',
        tone: 'destructive',
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const updated = await linkIssueKnowledge(ticket.id, issue.id, entryId, ticket.updatedAt);
      setOverrides({});
      setChanging(false);
      onChanged(updated);
      showToast(entryId ? 'Known fix linked' : 'Known fix removed', 'success');
    } catch (err) {
      if (getApiErrorStatus(err) === 409) {
        onStale();
        return;
      }
      showToast(getApiErrorMessage(err, 'Couldn’t change the known fix.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const picker = (
    <div className="flex flex-col gap-1.5">
      <Combobox
        aria-label={entry ? 'Replace the known fix' : 'Link a known fix'}
        options={linkOptions(entries.options ?? [])}
        value={entry?.id ?? ''}
        onValueChange={(value) => void link(value)}
        placeholder={entries.options ? 'Link a known fix' : 'Loading known fixes…'}
        searchPlaceholder="Search by name or symptom"
        emptyText="No known fix matches."
        disabled={saving || !entries.options}
      />
      {entries.failed && (
        <Button type="button" variant="link" size="sm" className="h-auto self-start px-0" onClick={entries.retry}>
          Couldn’t load known fixes. Try again
        </Button>
      )}
    </div>
  );

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-strong tabular-nums"
        >
          {index + 1}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-sm break-words text-foreground">
            <span className="sr-only">Issue {index + 1}: </span>
            {issue.description}
          </p>
          {issue.categoryName && <Badge variant="outline">{issue.categoryName}</Badge>}
        </div>
        {(onEdit || onRemove) && (
          <div className="flex shrink-0 items-start gap-1">
            {onEdit && (
              <Button type="button" variant="ghost" size="icon" className="size-11 md:size-8" aria-label={`Edit issue ${index + 1}`} onClick={onEdit}>
                <Pencil aria-hidden="true" />
              </Button>
            )}
            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 text-destructive hover:text-destructive md:size-8"
                aria-label={`Remove issue ${index + 1}`}
                onClick={onRemove}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </div>

      {entry ? (
        <section aria-label={`Known fix for issue ${index + 1}`} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <BookOpen aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <span className="text-xs font-medium tracking-wide text-muted-strong uppercase">Known fix</span>
              {knowledgeOn ? (
                <Link
                  to={`/knowledge-base/${entry.id}`}
                  className="rounded-sm text-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {entry.name}
                </Link>
              ) : (
                <span className="text-sm font-semibold text-foreground">{entry.name}</span>
              )}
              {entry.status !== 'ACTIVE' && <StatusBadge status={entry.status} />}
            </div>
            {canLink && !changing && (
              <Button type="button" variant="outline" size="sm" onClick={() => setChanging(true)}>
                Change
              </Button>
            )}
          </div>

          {changing && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
              {picker}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={saving} onClick={() => void link(null)}>
                  <Unlink aria-hidden="true" />
                  Remove link
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => setChanging(false)}>
                  Keep it
                </Button>
              </div>
            </div>
          )}

          {entry.safetyNotes && (
            <Callout tone="warning" title="Safety">
              <span className="whitespace-pre-line">{entry.safetyNotes}</span>
            </Callout>
          )}

          {steps.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
                {done} of {steps.length} steps done
              </p>
              <ol className="-mx-2 flex flex-col">
                {steps.map((step) => (
                  <StepRow key={step.id} step={step} enabled={canTick} onToggle={(checked) => void toggle(step, checked)} />
                ))}
              </ol>
              {!canTick && ticket.status === 'ASSIGNED' && (
                <p className="text-xs text-muted-foreground">Steps can be ticked once work starts.</p>
              )}
            </div>
          )}

          {entry.parts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Typical parts</p>
              <ul className="flex flex-wrap gap-1.5">
                {entry.parts.map((part) => (
                  <li key={part}>
                    <Badge variant="outline" className="font-normal">
                      {part}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hours != null && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
              <Clock aria-hidden="true" className="size-3.5" />
              Usually {formatHours(hours)} of work
            </p>
          )}
        </section>
      ) : knowledgeOn ? (
        <div className="flex flex-col gap-2">
          {canLink && picker}
          {/* Any reader can propose a library entry from a problem with no known fix (AC-35). */}
          <Button type="button" variant="link" size="sm" className="h-auto min-h-11 max-w-full self-start px-0 text-left whitespace-normal md:min-h-0" onClick={() => setSuggesting(true)}>
            <MessageSquarePlus aria-hidden="true" />
            Suggest an entry
          </Button>
          <SuggestDialog
            open={suggesting}
            onOpenChange={setSuggesting}
            kind="NEW_ENTRY"
            repairIssueId={issue.id}
            initialBody={issue.description.replace(/^\[[^\]]*\]\s*/, '')}
          />
        </div>
      ) : null}

      {hasSavedResolution(issue) && (
        // Spec 0018, AC-19: the pill and the note sit beside the <dl>, which holds only dt and dd groups
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3 text-sm">
          {/* Spec 0014, AC-21: Return to mechanic keeps the notes but clears resolvedAt */}
          {!issue.resolvedAt && (
            <div>
              <BadgePill className="h-auto max-w-full bg-highlight py-0.5 text-highlight-foreground whitespace-normal">Returned, not resent yet</BadgePill>
            </div>
          )}
          <dl className="grid gap-2 sm:grid-cols-3">
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs font-medium text-muted-strong">What fixed it</dt>
              <dd className="break-words text-foreground">{issue.resolutionNote ?? (issue.followedKnownFix ? 'Followed the known fix' : '—')}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-strong">Hours spent</dt>
              <dd className="text-foreground tabular-nums">{issue.hoursSpent != null ? formatHours(issue.hoursSpent) : '—'}</dd>
            </div>
          </dl>
          {issue.followedKnownFix && issue.resolutionNote && <p className="text-xs text-muted-strong">Followed the known fix</p>}
        </div>
      )}
    </li>
  );
}

/** One block per issue with its known fix, checklist and "What fixed it" (spec 0007, AC-27 to AC-31). */
export function IssuesSection({ ticket, canWork, onChanged, onStale, edit }: IssuesSectionProps) {
  const issues = ticket.issues ?? [];
  const knowledgeOn = useModuleOn('knowledge');
  const canLink = knowledgeOn && canWork && (ticket.status === 'ASSIGNED' || ticket.status === 'IN_PROGRESS');
  const canTick = canWork && ticket.status === 'IN_PROGRESS';
  const entries = useEntryOptions(canLink);
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
  const issueNames = new Map(issues.map((issue, index) => [issue.id, `Issue ${index + 1}: ${issue.description}`]));

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
            <Plus aria-hidden="true" />
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
        <ol className="flex flex-col divide-y divide-border">
          {issues.map((issue, index) => (
            <IssueBlock
              key={issue.id}
              ticket={ticket}
              issue={issue}
              index={index}
              canLink={canLink}
              knowledgeOn={knowledgeOn}
              canTick={canTick}
              entries={entries}
              onChanged={onChanged}
              onStale={onStale}
              onEdit={edit ? () => edit.onEdit(issue) : undefined}
              // AC-17: a ticket always keeps one issue, so the last one has no Remove
              onRemove={
                edit && issues.length > 1
                  ? () => edit.onRemove(issue, (list?.items ?? []).filter((file) => file.issueId === issue.id).length)
                  : undefined
              }
            />
          ))}
        </ol>
      )}
    </DetailSection>
  );
}
