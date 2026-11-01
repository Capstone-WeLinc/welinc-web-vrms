import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, MessageSquarePlus, Unlink } from 'lucide-react';
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
import { uploadAttachment, type Attachment } from '../../../lib/api/attachmentsApi';
import { useTicketAttachments } from '../hooks/useTicketAttachments';
import { PhotoStrip } from './PhotoStrip';

interface IssuesSectionProps {
  ticket: RepairTicket;
  /** The viewer may work this ticket (an admin, or the assigned mechanic or chief) and it isn't read only. */
  canWork: boolean;
  onChanged: (ticket: RepairTicket) => void;
  /** A 409: the page says so and loads the latest ticket. */
  onStale: () => void;
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
  /** This issue's photo strip (spec 0017, AC-20). */
  photos: ReactNode;
  onChanged: (ticket: RepairTicket) => void;
  onStale: () => void;
}

function IssueBlock({ ticket, issue, index, canLink, knowledgeOn, canTick, entries, photos, onChanged, onStale }: IssueBlockProps) {
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
      </div>

      {photos}

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
        <dl className="grid gap-2 rounded-lg bg-muted p-3 text-sm sm:grid-cols-3">
          {/* Spec 0014, AC-21: Send back keeps the notes but clears resolvedAt */}
          {!issue.resolvedAt && (
            <div className="sm:col-span-3">
              <BadgePill className="h-auto max-w-full bg-highlight py-0.5 text-highlight-foreground whitespace-normal">Sent back, not resent yet</BadgePill>
            </div>
          )}
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-xs font-medium text-muted-strong">What fixed it</dt>
            <dd className="break-words text-foreground">{issue.resolutionNote ?? (issue.followedKnownFix ? 'Followed the known fix' : '—')}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-strong">Hours spent</dt>
            <dd className="text-foreground tabular-nums">{issue.hoursSpent != null ? formatHours(issue.hoursSpent) : '—'}</dd>
          </div>
          {issue.followedKnownFix && issue.resolutionNote && (
            <p className="text-xs text-muted-strong sm:col-span-3">Followed the known fix</p>
          )}
        </dl>
      )}
    </li>
  );
}

/** One block per issue with its known fix, checklist and "What fixed it" (spec 0007, AC-27 to AC-31). */
export function IssuesSection({ ticket, canWork, onChanged, onStale }: IssuesSectionProps) {
  const issues = ticket.issues ?? [];
  const knowledgeOn = useModuleOn('knowledge');
  const canLink = knowledgeOn && canWork && (ticket.status === 'ASSIGNED' || ticket.status === 'IN_PROGRESS');
  const canTick = canWork && ticket.status === 'IN_PROGRESS';
  const entries = useEntryOptions(canLink);
  const { showToast } = useToast();
  const attachments = useTicketAttachments(ticket.id);
  /** Which strip is uploading: an issue id, or '' for the ticket strip. */
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);

  const list = attachments.list;
  const canAddPhotos = list != null && list.can.addFiles;
  const photosFor = (issueId: string | null): Attachment[] =>
    list?.items.filter((a) => a.kind === 'VEHICLE_PHOTO' && a.issueId === issueId) ?? [];

  /** One file at a time, then fresh links (spec 0017, AC-21). */
  const addPhotos = async (files: File[], issueId: string | null) => {
    setUploadingTo(issueId ?? '');
    try {
      for (const file of files) {
        try {
          await uploadAttachment(ticket.id, file, { kind: 'VEHICLE_PHOTO', issueId });
        } catch (err) {
          showToast(getApiErrorMessage(err, `Couldn’t upload ${file.name}. Try again.`), 'error');
        }
      }
      await attachments.reload();
    } finally {
      setUploadingTo(null);
    }
  };

  const strip = (issueId: string | null, label: string) =>
    list ? (
      <PhotoStrip
        photos={photosFor(issueId)}
        canAdd={canAddPhotos}
        label={label}
        busy={uploadingTo === (issueId ?? '')}
        onAdd={(files) => void addPhotos(files, issueId)}
      />
    ) : null;

  return (
    <DetailSection title="Issues">
      {attachments.state === 'error' ? (
        <p className="text-sm text-muted-foreground">{attachments.errorMessage}</p>
      ) : (
        strip(null, 'Photos')
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
              photos={strip(issue.id, `Photos for issue ${index + 1}`)}
              onChanged={onChanged}
              onStale={onStale}
            />
          ))}
        </ol>
      )}
    </DetailSection>
  );
}
