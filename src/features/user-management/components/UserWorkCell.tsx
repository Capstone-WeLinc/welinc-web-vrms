import { BadgePill } from '../../../components/shared/BadgePill';
import type { MechanicWorkload } from '../../../lib/api/vrmsConfigApi';
import type { TeamMember } from '../../../types';
import { WORK_LABELS, WORK_STATE_CLASSES, workloadSummary, workStateOf } from '../lib/workload';

/** Occupied or Free, with the open counts by status below (feature 57). A dash for non mechanics. */
export function UserWorkCell({ user, workload }: { user: TeamMember; workload: ReadonlyMap<string, MechanicWorkload> | null }) {
  const state = workStateOf(user, workload);
  if (!state)
    return (
      <span className="text-muted-foreground">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Not applicable</span>
      </span>
    );
  return (
    <span className="flex min-w-0 flex-col items-start gap-1">
      <BadgePill className={WORK_STATE_CLASSES[state]}>{WORK_LABELS[state]}</BadgePill>
      <span className="text-caption text-muted-foreground">{workloadSummary(workload?.get(user.id))}</span>
    </span>
  );
}
