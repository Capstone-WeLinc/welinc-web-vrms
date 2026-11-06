import { useState } from 'react';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { checkIssueStep } from '../../../lib/api/repairApi';
import type { RepairIssue, RepairIssueStep } from '../../../types';
import { mergedSteps, settleOverrides, type TickOverrides, withoutIssue } from '../lib/issueRow';

const versionsOf = (issues: RepairIssue[]) => Object.fromEntries(issues.map((issue) => [issue.id, issue.checklistVersion]));

/**
 * Spec 0024, AC-3: the page's pending ticks for the whole issue list, above the folding rows, so a
 * fold never drops a tick in flight or its rollback, and the closed row, the summary and the open
 * rule read the same steps. A failed save puts the step back (spec 0007, AC-28).
 */
export function useTickOverrides(ticketId: string, issues: RepairIssue[]) {
  const { showToast } = useToast();
  const [overrides, setOverrides] = useState<TickOverrides>({});
  const [versions, setVersions] = useState(() => versionsOf(issues));

  // Adjusted during render from the latest ticket (the 3 second refresh), not in an effect
  const settled = settleOverrides(overrides, versions, issues);
  if (settled.overrides !== overrides) setOverrides(settled.overrides);
  if (settled.versions !== versions) setVersions(settled.versions);
  const current = settled.overrides;

  const toggle = async (issue: RepairIssue, step: RepairIssueStep, checked: boolean) => {
    const previous = { issueId: issue.id, checkedAt: step.checkedAt, checkedByEmail: step.checkedByEmail };
    setOverrides((o) => ({
      ...o,
      [step.id]: { issueId: issue.id, checkedAt: checked ? new Date().toISOString() : null, checkedByEmail: checked ? 'you' : null },
    }));
    try {
      const saved = await checkIssueStep(ticketId, issue.id, step.id, checked);
      setOverrides((o) => ({ ...o, [step.id]: { issueId: issue.id, checkedAt: saved.checkedAt, checkedByEmail: saved.checkedByEmail } }));
    } catch (err) {
      setOverrides((o) => ({ ...o, [step.id]: previous }));
      showToast(getApiErrorMessage(err, 'Couldn’t save that step. Try again.'), 'error');
    }
  };

  return {
    stepsOf: (issue: RepairIssue) => mergedSteps(issue, current),
    toggle,
    /** A relinked known fix brings its own steps. */
    clearIssue: (issueId: string) => setOverrides((o) => withoutIssue(o, issueId)),
  };
}
