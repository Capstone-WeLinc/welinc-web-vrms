import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BadgePill } from '../../../components/shared/BadgePill';
import { confirm } from '../../../components/shared/confirm/confirm';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { useToast } from '../../../context/toast';
import { useClamped } from '../../../hooks/useClamped';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import type { EntryOption } from '../../../lib/api/knowledgeApi';
import { linkIssueKnowledge } from '../../../lib/api/repairApi';
import { formatDateTime, formatHours } from '../../../lib/utils/format';
import type { RepairIssue, RepairIssueStep, RepairTicket } from '../../../types';
import type { useEntryOptions } from '../hooks/useEntryOptions';
import { relinkLossMessage, STEP_TAG_TOOLTIP, stepTag } from '../lib/checklist';
import {
  issueAnchor,
  type IssueState,
  needsResolution,
  resolutionLine,
  safetyNote,
  stripSystem,
  tickedCount,
} from '../lib/issueRow';
import { hasSavedResolution } from '../lib/resolutionForm';
import { SuggestDialog } from '../../knowledge-base/components/SuggestDialog';

/** Same option shape as the repair form picker (spec 0007, AC-24, AC-27). */
function linkOptions(entries: EntryOption[]): ComboboxOption[] {
  return entries.map((entry) => ({
    value: entry.id,
    label: entry.name,
    description: `Seen ${entry.seenCount}×`,
    keywords: [entry.symptoms],
    group: entry.categoryName,
  }));
}

/** AC-3: the progress text with its slim bar, in the row's right column. */
function Progress({ state, ticked, total }: { state: IssueState; ticked: number; total: number }) {
  let label: ReactNode;
  if (state === 'returned') {
    label = <BadgePill className="h-5 bg-highlight px-1.5 text-highlight-foreground">Returned</BadgePill>;
  } else if (state === 'none') {
    label = <span className="text-muted-foreground">No checklist</span>;
  } else if (state === 'notStarted') {
    label = <span className="text-muted-foreground">Not started</span>;
  } else if (state === 'done') {
    label = <span className="font-medium text-success">Done</span>;
  } else {
    label = (
      <span className="text-foreground tabular-nums">
        {ticked} of {total}
      </span>
    );
  }
  const bar = state !== 'returned' && state !== 'none';
  return (
    <span className="flex w-20 shrink-0 flex-col items-end gap-1.5 pt-0.5 text-xs md:w-24">
      {label}
      {bar && (
        <span aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <span
            className={cn('block h-full rounded-full', state === 'done' ? 'bg-success' : 'bg-status-in-progress-fg')}
            style={{ width: `${total ? (ticked / total) * 100 : 0}%` }}
          />
        </span>
      )}
    </span>
  );
}

/** AC-2: line 2 of a closed row, plain text only (the header is one button). */
function RowMeta({ issue, state, status }: { issue: RepairIssue; state: IssueState; status: RepairTicket['status'] }) {
  const resolution = resolutionLine(issue);
  const parts: ReactNode[] = [];
  if (resolution) {
    if (resolution.text) parts.push(<span key="fix" className="text-foreground/80">{resolution.text}</span>);
    if (resolution.hours) parts.push(<span key="hours" className="tabular-nums">{resolution.hours}</span>);
  } else {
    if (issue.categoryName) parts.push(<span key="cat">{issue.categoryName}</span>);
    const entry = issue.knowledgeEntry;
    parts.push(
      entry ? (
        <span key="fix">
          {entry.name}
          {entry.status !== 'ACTIVE' && (
            <span className="ml-1.5 inline-block align-middle">
              <StatusBadge status={entry.status} />
            </span>
          )}
        </span>
      ) : (
        <span key="fix">No known fix</span>
      ),
    );
    if (safetyNote(issue)) parts.push(<span key="safety" className="font-medium text-warning-text">Safety</span>);
  }
  if (needsResolution(issue, state, status)) parts.push(<span key="needs">Needs what fixed it</span>);
  if (parts.length === 0) return null;
  return (
    <span className="line-clamp-1 text-xs text-muted-foreground">
      {parts.map((part, n) => (
        <span key={n}>
          {n > 0 && <span aria-hidden="true"> · </span>}
          {part}
        </span>
      ))}
    </span>
  );
}

/** AC-8: one line of warning text above the checklist, with More only when it is cut off. */
function SafetyLine({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const { ref, clamped } = useClamped<HTMLParagraphElement>();
  return (
    <div className="flex items-start gap-2 text-sm text-warning-text">
      <p ref={ref} className={cn('min-w-0 flex-1 whitespace-pre-line', !expanded && 'line-clamp-1')}>
        <span className="font-medium">Safety: </span>
        {text}
      </p>
      {(clamped || expanded) && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto shrink-0 px-0 text-warning-text"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Less' : 'More'}
        </Button>
      )}
    </div>
  );
}

function StepRow({ step, enabled, onToggle }: { step: RepairIssueStep; enabled: boolean; onToggle: (checked: boolean) => void }) {
  const id = `step-${step.id}`;
  const checked = step.checkedAt != null;
  const label = (
    <label
      htmlFor={id}
      className={cn(
        'flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-sm md:min-h-10',
        enabled ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default',
        // AC-9: done steps dim, with no strikethrough
        checked ? 'text-muted-foreground' : 'text-foreground',
      )}
    >
      <Checkbox
        id={id}
        aria-label={`${step.position}. ${step.text}`}
        checked={checked}
        disabled={!enabled}
        onCheckedChange={(value) => onToggle(value === true)}
        className="size-5"
      />
      <span className="min-w-0 break-words">
        <span className="text-muted-foreground tabular-nums">{step.position}.</span> {step.text}
      </span>
    </label>
  );
  const tag = stepTag(step);
  // Spec 0023, AC-13: where the plan left the known fix, beside the step
  const tagged = (row: ReactNode) =>
    tag ? (
      <li className="flex items-center gap-1">
        {row}
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="shrink-0 rounded-sm px-1 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {tag}
            </span>
          </TooltipTrigger>
          <TooltipContent>{STEP_TAG_TOOLTIP[tag]}</TooltipContent>
        </Tooltip>
      </li>
    ) : (
      <li className="flex">{row}</li>
    );
  if (!checked) return tagged(label);
  // Who ticked it and when, on hover and on focus (spec 0007, AC-28)
  return tagged(
    <Tooltip>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent>
        Ticked by {step.checkedByEmail} · {formatDateTime(step.checkedAt!)}
      </TooltipContent>
    </Tooltip>,
  );
}

const quiet = 'h-11 px-2 text-muted-strong md:h-8';

export interface IssueRowProps {
  ticket: RepairTicket;
  issue: RepairIssue;
  index: number;
  /** The server's steps with this page's pending ticks (AC-3). */
  steps: RepairIssueStep[];
  state: IssueState;
  canLink: boolean;
  /** Spec 0012, AC-15: while the knowledge base is off, a linked entry is plain text. */
  knowledgeOn: boolean;
  canTick: boolean;
  entries: ReturnType<typeof useEntryOptions>;
  hideDone: boolean;
  onHideDone: (on: boolean) => void;
  onToggle: (step: RepairIssueStep, checked: boolean) => void;
  /** A relinked checklist brings its own ticks. */
  onRelinked: () => void;
  onChanged: (ticket: RepairTicket) => void;
  onStale: () => void;
  /** Spec 0019, AC-20: the issue's Edit and Remove, when the caller may edit this ticket. */
  onEdit?: () => void;
  onRemove?: () => void;
  /** Spec 0023, AC-4: Edit steps or Add steps, when the caller may edit this checklist now. */
  onEditSteps?: () => void;
}

/** Spec 0024, AC-1 to AC-10: one foldable issue. Closed it reads; open it holds the work. */
export function IssueRow(props: IssueRowProps) {
  const { ticket, issue, index, steps, state, canLink, knowledgeOn, canTick, entries, hideDone } = props;
  const { onHideDone, onToggle, onRelinked, onChanged, onStale, onEdit, onRemove, onEditSteps } = props;
  const { showToast } = useToast();
  const [changing, setChanging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const entry = issue.knowledgeEntry;
  const text = stripSystem(issue.description);
  const ticked = tickedCount(steps);
  const n = index + 1;
  const safety = safetyNote(issue);

  /**
   * Link, relink or remove (null). Asks first when ticked steps would be cleared (spec 0007, AC-29),
   * or steps added or reworded on this ticket would be lost (spec 0023, AC-14).
   */
  const link = async (entryId: string | null) => {
    if (entry && entryId === entry.id) {
      setChanging(false);
      return;
    }
    const loss = relinkLossMessage(steps);
    if (loss) {
      const ok = await confirm({
        title: 'Replace the checklist?',
        description: loss,
        confirmText: entryId ? 'Replace' : 'Remove link',
        tone: 'destructive',
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const updated = await linkIssueKnowledge(ticket.id, issue.id, entryId, ticket.updatedAt);
      onRelinked();
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
        aria-label={entry ? `Replace the known fix for issue ${n}` : `Link a known fix to issue ${n}`}
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

  const shownSteps = hideDone ? steps.filter((s) => s.checkedAt == null) : steps;
  const hiddenCount = steps.length - shownSteps.length;
  const hasActions = steps.length > 0 || onEditSteps || onEdit || onRemove;
  const resolution = hasSavedResolution(issue);

  return (
    <AccordionItem value={issue.id} id={issueAnchor(index)} className="scroll-mt-24">
      <AccordionTrigger className="min-h-11 py-3">
        <span className="flex min-w-0 flex-1 gap-2">
          <span aria-hidden="true" className="w-5 shrink-0 pt-px text-sm text-muted-foreground tabular-nums">
            {n}.
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="line-clamp-2 text-sm font-medium break-words text-foreground group-data-[state=open]/trigger:line-clamp-none md:line-clamp-1">
              <span className="sr-only">Issue {n}: </span>
              {text}
            </span>
            <RowMeta issue={issue} state={state} status={ticket.status} />
          </span>
        </span>
        <Progress state={state} ticked={ticked} total={steps.length} />
      </AccordionTrigger>

      {/* AC-7: the safety note, the checklist, the step actions, then the resolution */}
      <AccordionContent className="flex flex-col gap-3 pl-7">
        {safety && <SafetyLine text={safety} />}

        {steps.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="sr-only" aria-live="polite">
              {ticked} of {steps.length} steps done
            </p>
            {hiddenCount > 0 && (
              <p className="px-0 text-xs text-muted-foreground tabular-nums">
                {hiddenCount} done {hiddenCount === 1 ? 'step' : 'steps'} hidden
              </p>
            )}
            {shownSteps.length > 0 && (
              <ol className="-mx-2 flex flex-col">
                {shownSteps.map((step) => (
                  <StepRow key={step.id} step={step} enabled={canTick} onToggle={(checked) => onToggle(step, checked)} />
                ))}
              </ol>
            )}
            {!canTick && ticket.status === 'ASSIGNED' && <p className="text-xs text-muted-foreground">Steps can be ticked once work starts.</p>}
          </div>
        )}

        {hasActions && (
          <div className="-mx-2 flex flex-wrap items-center gap-x-1 gap-y-1">
            {onEditSteps && (
              <Button type="button" variant="ghost" size="sm" className={quiet} aria-label={steps.length ? `Edit steps for issue ${n}` : `Add steps to issue ${n}`} onClick={onEditSteps}>
                {steps.length ? 'Edit steps' : 'Add steps'}
              </Button>
            )}
            {steps.length > 0 && (
              <label className="flex min-h-11 cursor-pointer items-center gap-2 px-2 text-sm text-muted-strong md:min-h-8">
                <Switch size="sm" checked={hideDone} onCheckedChange={onHideDone} aria-label={`Hide done steps on issue ${n}`} />
                Hide done steps
              </label>
            )}
            {(onEdit || onRemove) && (
              <span className="ml-auto flex items-center gap-1">
                {onEdit && (
                  <Button type="button" variant="ghost" size="sm" className={quiet} aria-label={`Edit issue ${n}`} onClick={onEdit}>
                    Edit issue
                  </Button>
                )}
                {onRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(quiet, 'text-destructive hover:text-destructive')}
                    aria-label={`Remove issue ${n}`}
                    onClick={onRemove}
                  >
                    Remove issue
                  </Button>
                )}
              </span>
            )}
          </div>
        )}

        {/* AC-10: the known fix by name, with Change; the picker and Suggest for an issue with none */}
        {entry ? (
          <div className="flex flex-col gap-2">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-muted-foreground">Known fix</span>
              {knowledgeOn ? (
                <Link
                  to={`/knowledge-base/${entry.id}`}
                  className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {entry.name}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{entry.name}</span>
              )}
              {entry.status !== 'ACTIVE' && <StatusBadge status={entry.status} />}
              {canLink && !changing && (
                <Button type="button" variant="link" size="sm" className="h-auto min-h-11 px-0 text-muted-strong md:min-h-0" onClick={() => setChanging(true)}>
                  Change
                </Button>
              )}
            </p>
            {changing && (
              <div className="flex flex-col gap-2">
                {picker}
                <div className="-mx-2 flex flex-wrap gap-1">
                  <Button type="button" variant="ghost" size="sm" className={cn(quiet, 'text-destructive hover:text-destructive')} disabled={saving} onClick={() => void link(null)}>
                    Remove link
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className={quiet} disabled={saving} onClick={() => setChanging(false)}>
                    Keep it
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          knowledgeOn && (
            <div className="flex flex-col gap-2">
              {canLink && picker}
              {/* Any reader can propose a library entry from a problem with no known fix (spec 0007, AC-35) */}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto min-h-11 max-w-full self-start px-0 text-left whitespace-normal md:min-h-0"
                onClick={() => setSuggesting(true)}
              >
                Suggest a known fix
              </Button>
              <SuggestDialog open={suggesting} onOpenChange={setSuggesting} kind="NEW_ENTRY" repairIssueId={issue.id} initialBody={text} />
            </div>
          )
        )}

        {resolution && (
          // Spec 0018, AC-19: the <dl> holds only dt and dd groups
          <dl className="grid gap-3 border-t border-border pt-3 text-sm sm:grid-cols-3">
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">What fixed it</dt>
              <dd className="break-words text-foreground">
                {issue.resolutionNote ?? (issue.followedKnownFix ? 'Followed the known fix' : '—')}
                {issue.followedKnownFix && issue.resolutionNote && <span className="block text-xs text-muted-foreground">Followed the known fix</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Hours spent</dt>
              <dd className="text-foreground tabular-nums">{issue.hoursSpent != null ? formatHours(issue.hoursSpent) : '—'}</dd>
            </div>
          </dl>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
