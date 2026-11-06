import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DetailSection } from '../../../components/shared/DetailSection';
import { useModuleOn } from '../../../lib/permissions/usePermissions';
import type { RepairIssue, RepairTicket } from '../../../types';
import { useTicketFiles } from '../hooks/ticketFiles';
import { useEntryOptions } from '../hooks/useEntryOptions';
import { useTicketView } from '../hooks/useTicketView';
import { useTickOverrides } from '../hooks/useTickOverrides';
import { issueState, summaryCounts, summaryText, tickedCount } from '../lib/issueRow';
import { IssueRow } from './IssueRow';
import { PhotosLine } from './PhotosLine';

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
  /** Spec 0024, AC-13: the Photos line's open state lives on the page, so the blocked reason can open it. */
  photos: { open: boolean | null; onOpenChange: (open: boolean) => void; blockedBy: 'beforePhoto' | 'afterPhoto' | null };
}

/** Spec 0024: the issues as foldable rows, each with its progress and state, plus the ticket's photos. */
export function IssuesSection({ ticket, canWork, onChanged, onStale, onEditSteps, edit, photos }: IssuesSectionProps) {
  const list = useTicketFiles().attachments.list;
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
  // AC-6: the switch shows once any step is ticked; until then a stored "on" is ignored, not reset
  const anyTicked = rows.some((row) => tickedCount(row.steps) > 0);
  const hideDone = anyTicked && view.hideDone;
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
      <PhotosLine ticket={ticket} open={photos.open} onOpenChange={photos.onOpenChange} blockedBy={photos.blockedBy} />
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No issues logged.</p>
      ) : (
        <div className="flex flex-col">
          {/* AC-6: the ticket's progress at a glance, then Hide done steps, Expand all and Collapse all */}
          <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 border-b border-border pb-2">
            <p className="text-xs text-muted-foreground tabular-nums">{summaryText(summaryCounts(rows))}</p>
            {(anyTicked || issues.length > 1) && (
              <div className="-mr-2 flex flex-wrap items-center">
                {anyTicked && (
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 px-2 text-xs text-muted-strong md:min-h-8">
                    <Switch size="sm" checked={hideDone} onCheckedChange={view.setHideDone} />
                    Hide done steps
                  </label>
                )}
                {issues.length > 1 && (
                  <>
                    <Button type="button" variant="ghost" size="sm" className="h-11 px-2 text-xs text-muted-strong md:h-8" onClick={view.expandAll}>
                      Expand all
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-11 px-2 text-xs text-muted-strong md:h-8" onClick={view.collapseAll}>
                      Collapse all
                    </Button>
                  </>
                )}
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
                hideDone={hideDone}
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
