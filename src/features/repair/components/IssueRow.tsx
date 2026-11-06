import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  issueDisplayText,
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
    // AC-3: a fixed column, so the state words line up on every row
    <span className="flex w-24 shrink-0 flex-col items-end gap-1.5 pt-0.5 text-right text-xs">
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

/**
 * AC-2: line 2 of a closed row, plain text only (the header is one button). Its parts are split by
 * space alone (`gap-3`, AC-19: never a dot). One line: the note or the known fix name gives way and
 * ends in an ellipsis, the short parts keep their width.
 */
function RowMeta({ issue, state, status }: { issue: RepairIssue; state: IssueState; status: RepairTicket['status'] }) {
  const resolution = resolutionLine(issue);
  const line = 'flex min-w-0 items-center gap-3 overflow-hidden text-xs whitespace-nowrap text-muted-foreground';
  if (resolution) {
    // AC-2: closed, What fixed it and the hours; open, the category line, since the resolution block shows below (AC-7)
    return (
      <>
        <span className={cn(line, 'group-data-[state=open]/trigger:hidden')}>
          {resolution.text && <span className="min-w-0 truncate text-foreground/80">{resolution.text}</span>}
          {resolution.hours && <span className="shrink-0 tabular-nums">{resolution.hours}</span>}
        </span>
        <span className={cn(line, 'hidden group-data-[state=open]/trigger:flex')}>
          <FixParts issue={issue} />
        </span>
      </>
    );
  }
  return (
    <span className={line}>
      <FixParts issue={issue} />
      {needsResolution(issue, state, status) && <span className="shrink-0">Needs what fixed it</span>}
    </span>
  );
}

/** AC-2: the category, the known fix (or No known fix) and the Safety word. */
function FixParts({ issue }: { issue: RepairIssue }) {
  const entry = issue.knowledgeEntry;
  return (
    <>
      {issue.categoryName && <span className="shrink-0">{issue.categoryName}</span>}
      {entry ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate">Known fix: {entry.name}</span>
          {entry.status !== 'ACTIVE' && (
            <span className="shrink-0">
              <StatusBadge status={entry.status} />
            </span>
          )}
        </span>
      ) : (
        <span className="shrink-0">No known fix</span>
      )}
      {safetyNote(issue) && <span className="shrink-0 font-medium text-warning-text">Safety</span>}
    </>
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
        // AC-9: 44px on phones, 36px from 768px
        'flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-sm md:min-h-9',
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
        Ticked by {step.checkedByEmail} on {formatDateTime(step.checkedAt!)}
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
  const { ticket, issue, index, steps, state, canLink, knowledgeOn, canTick, entries } = props;
  const { onToggle, onRelinked, onChanged, onStale, onEdit, onRemove, onEditSteps } = props;
  const { showToast } = useToast();
  const [changing, setChanging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const entry = issue.knowledgeEntry;
  const text = stripSystem(issue.description);
  // AC-12: a repeated root cause shows once on the row; Suggest keeps the text as stored, prefix off
  const shown = issueDisplayText(text);
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

  // AC-7: Change known fix only when the issue may be relinked; Open known fix while the module is on
  const canChange = canLink && entry != null;
  const hasMenu = !!(onEdit || onRemove || canChange || (entry && knowledgeOn));
  const resolution = hasSavedResolution(issue);

  // AC-7: the row menu on the header line, beside the fold button and never inside it; with no menu its
  // space stays, so the progress column lines up with the rows that have one (AC-3)
  const menu = hasMenu ? (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-strong md:mt-2 md:size-8" aria-label={`More actions for issue ${n}`}>
              <MoreVertical aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>More actions</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        {onEdit && <DropdownMenuItem onSelect={onEdit}>Edit issue</DropdownMenuItem>}
        {canChange && <DropdownMenuItem onSelect={() => setChanging(true)}>Change known fix</DropdownMenuItem>}
        {entry && knowledgeOn && (
          <DropdownMenuItem asChild>
            <Link to={`/knowledge-base/${entry.id}`}>Open known fix</Link>
          </DropdownMenuItem>
        )}
        {onRemove && (
          <DropdownMenuItem variant="destructive" onSelect={onRemove}>
            Remove issue
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <span aria-hidden="true" className="size-11 shrink-0 md:size-8" />
  );

  return (
    <AccordionItem value={issue.id} id={issueAnchor(index)} className="scroll-mt-24">
      <AccordionTrigger className="min-h-11 py-3" actions={menu}>
        <span className="flex min-w-0 flex-1 gap-2">
          <span aria-hidden="true" className="w-5 shrink-0 pt-px text-sm text-muted-foreground tabular-nums">
            {n}.
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="line-clamp-2 text-sm font-semibold break-words text-foreground group-data-[state=open]/trigger:line-clamp-none md:line-clamp-1 md:text-base">
              <span className="sr-only">Issue {n}: </span>
              {shown}
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
            {/* AC-9: done steps stay in the list, dimmed */}
            <ol className="-ml-2 flex flex-col">
              {steps.map((step) => (
                <StepRow key={step.id} step={step} enabled={canTick} onToggle={(checked) => onToggle(step, checked)} />
              ))}
            </ol>
            {!canTick && ticket.status === 'ASSIGNED' && <p className="text-xs text-muted-foreground">Steps can be ticked once work starts.</p>}
          </div>
        )}

        {/* AC-7: one quiet Edit steps; the issue's other actions are in the row menu on the header line */}
        {onEditSteps && (
          <div className="-ml-2 flex">
            <Button type="button" variant="ghost" size="sm" className={quiet} aria-label={steps.length ? `Edit steps for issue ${n}` : `Add steps to issue ${n}`} onClick={onEditSteps}>
              {steps.length ? 'Edit steps' : 'Add steps'}
            </Button>
          </div>
        )}

        {/* AC-10: the known fix's name is on the row header; Change opens the picker here. An issue with none
            keeps the picker and Suggest a known fix. */}
        {entry ? (
          changing && (
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
          )
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
          // AC-7: one block, the label with the hours on its right, then the note
          <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
            <p className="flex items-baseline justify-between gap-3 text-xs font-medium text-muted-foreground">
              What fixed it
              {issue.hoursSpent != null && (
                <span className="shrink-0 tabular-nums">
                  <span className="sr-only">Hours spent </span>
                  {formatHours(issue.hoursSpent)}
                </span>
              )}
            </p>
            {(issue.resolutionNote || issue.followedKnownFix) && (
              <p className="break-words whitespace-pre-line text-foreground">{issue.resolutionNote ?? 'Followed the known fix'}</p>
            )}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
