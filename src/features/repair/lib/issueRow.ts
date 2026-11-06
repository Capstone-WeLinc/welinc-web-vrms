import type { RepairIssue, RepairIssueStep, RepairStatus } from '../../../types';
import { formatHours } from '../../../lib/utils/format';
import { hasSavedResolution } from './resolutionForm';
import { issueText } from './ticketEdits';

// Spec 0024: the pure rules behind the foldable issue rows. The issue state is derived here and
// nowhere else (AC-3), and the row, the summary line and the open rule all read it.

/** A local tick that has not come back from the server yet (AC-3). */
export type TickOverride = { issueId: string; checkedAt: string | null; checkedByEmail: string | null };
export type TickOverrides = Record<string, TickOverride>;

export type IssueState = 'returned' | 'none' | 'notStarted' | 'inProgress' | 'done';

/** AC-12: the stored `[System] ` prefix off, matching the backend's `issueText` in `ticket-inputs.ts`. */
export function stripSystem(description: string): string {
  return issueText(description);
}

/** The server's steps with this page's pending ticks on top. */
export function mergedSteps(issue: Pick<RepairIssue, 'steps'>, overrides: TickOverrides): RepairIssueStep[] {
  return issue.steps.map((step) => {
    const local = overrides[step.id];
    return local ? { ...step, checkedAt: local.checkedAt, checkedByEmail: local.checkedByEmail } : step;
  });
}

export function tickedCount(steps: Pick<RepairIssueStep, 'checkedAt'>[]): number {
  return steps.filter((step) => step.checkedAt != null).length;
}

/**
 * AC-3, in precedence order: Returned, No checklist, Done, In progress, Not started. Returned rests on
 * notes being saved only on the move to For verification, so notes without `resolvedAt` mean the
 * ticket came back (spec 0014, AC-21).
 */
export function issueState(issue: RepairIssue, steps: Pick<RepairIssueStep, 'checkedAt'>[]): IssueState {
  if (hasSavedResolution(issue) && issue.resolvedAt == null) return 'returned';
  if (steps.length === 0) return 'none';
  const ticked = tickedCount(steps);
  if (ticked === steps.length) return 'done';
  return ticked > 0 ? 'inProgress' : 'notStarted';
}

/** AC-4: the statuses where work is still to come, so the next unfinished issue opens. An allow list on purpose. */
const WORKING_STATUSES: readonly RepairStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'OUTSOURCED', 'PENDING_APPROVAL'];

/** The most issues that all start open while work is ongoing. */
export const OPEN_ALL_LIMIT = 3;

/** AC-4: which rows start open on a first visit. Status only, never role. */
export function initialOpen(status: RepairStatus, issues: { id: string; state: IssueState }[]): string[] {
  if (!WORKING_STATUSES.includes(status)) return [];
  if (issues.length <= OPEN_ALL_LIMIT) return issues.map((issue) => issue.id);
  const next = issues.find((issue) => issue.state !== 'done' && issue.state !== 'none');
  return next ? [next.id] : [];
}

export interface SummaryCounts {
  doneIssues: number;
  issues: number;
  ticked: number;
  steps: number;
}

/** AC-6: steps count only issues that have steps. */
export function summaryCounts(rows: { state: IssueState; steps: Pick<RepairIssueStep, 'checkedAt'>[] }[]): SummaryCounts {
  return rows.reduce<SummaryCounts>(
    (sum, row) => ({
      doneIssues: sum.doneIssues + (row.state === 'done' ? 1 : 0),
      issues: sum.issues + 1,
      ticked: sum.ticked + tickedCount(row.steps),
      steps: sum.steps + row.steps.length,
    }),
    { doneIssues: 0, issues: 0, ticked: 0, steps: 0 },
  );
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** AC-6: "2 of 5 issues done, 14 of 30 steps ticked", the step part left out when no issue has steps. */
export function summaryText(counts: SummaryCounts): string {
  const issues = `${counts.doneIssues} of ${counts.issues} ${plural(counts.issues, 'issue', 'issues')} done`;
  if (counts.steps === 0) return issues;
  return `${issues}, ${counts.ticked} of ${counts.steps} ${plural(counts.steps, 'step', 'steps')} ticked`;
}

/** AC-2: the Safety word shows only for a note with real text. */
export function safetyNote(issue: Pick<RepairIssue, 'knowledgeEntry'>): string | null {
  const text = issue.knowledgeEntry?.safetyNotes?.trim();
  return text ? text : null;
}

/** AC-2: what line 2 says once a resolution is saved, or null before then. */
export function resolutionLine(issue: RepairIssue): { text: string | null; hours: string | null } | null {
  if (!hasSavedResolution(issue)) return null;
  const note = issue.resolutionNote?.trim();
  return {
    text: note ? note : issue.followedKnownFix ? 'Followed the known fix' : null,
    hours: issue.hoursSpent != null ? formatHours(issue.hoursSpent) : null,
  };
}

/** AC-2: a finished checklist with nothing written yet, while the work is still going. */
export function needsResolution(issue: RepairIssue, state: IssueState, status: RepairStatus): boolean {
  return state === 'done' && status === 'IN_PROGRESS' && !hasSavedResolution(issue);
}

/** AC-4: `#issue-N` (N from 1) as a row index, or null when it is not one or out of range. */
export function issueHashIndex(hash: string, count: number): number | null {
  const match = /^#issue-(\d+)$/.exec(hash);
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 1 && n <= count ? n - 1 : null;
}

/** The row's anchor, for `#issue-N` links and the scroll. */
export function issueAnchor(index: number): string {
  return `issue-${index + 1}`;
}

/**
 * AC-3: drops local ticks the server has caught up with, ticks on an issue whose checklist was
 * replaced (`checklistVersion` changed) and ticks on a step or issue that is gone. Returns the same
 * objects when nothing changed, so the caller sets state only on a real change.
 */
export function settleOverrides(
  overrides: TickOverrides,
  versions: Record<string, number>,
  issues: Pick<RepairIssue, 'id' | 'checklistVersion' | 'steps'>[],
): { overrides: TickOverrides; versions: Record<string, number> } {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  let nextVersions = versions;
  for (const issue of issues) {
    if (versions[issue.id] !== issue.checklistVersion) {
      if (nextVersions === versions) nextVersions = { ...versions };
      nextVersions[issue.id] = issue.checklistVersion;
    }
  }
  let next = overrides;
  for (const [stepId, local] of Object.entries(overrides)) {
    const issue = byId.get(local.issueId);
    const replaced = issue != null && versions[issue.id] !== undefined && versions[issue.id] !== issue.checklistVersion;
    const server = issue?.steps.find((step) => step.id === stepId);
    if (!issue || replaced || !server || server.checkedAt === local.checkedAt) {
      if (next === overrides) next = { ...overrides };
      delete next[stepId];
    }
  }
  return { overrides: next, versions: nextVersions };
}

/** Every override but the ones on this issue. */
export function withoutIssue(overrides: TickOverrides, issueId: string): TickOverrides {
  return Object.fromEntries(Object.entries(overrides).filter(([, local]) => local.issueId !== issueId));
}
