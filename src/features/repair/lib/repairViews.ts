// Spec 0027, AC-2 and AC-4: the sidebar's sub pages are `view` presets of the repair list. A
// preset narrows the list; the other filters and search apply on top. `view=referrals` is the
// page's other tab (spec 0029), not a preset, so it reads as none here.

export const REPAIR_VIEWS = ['open', 'signoff', 'mine', 'active', 'sentBack', 'done'] as const;
export type RepairView = (typeof REPAIR_VIEWS)[number];

/** The page title for each preset (AC-4: the header follows it). */
export const REPAIR_VIEW_TITLES: Record<RepairView, string> = {
  open: 'All open',
  signoff: 'Waiting for sign off',
  mine: 'Assigned to me',
  active: 'In progress',
  sentBack: 'Sent back to me',
  done: 'Done',
};

/** The context line under the title for each preset. */
export const REPAIR_VIEW_CONTEXT: Record<RepairView, string> = {
  open: 'Every open repair ticket across every garage.',
  signoff: 'Work sent for verification that you can sign off. Your own tickets are left out.',
  mine: 'Open tickets you are assigned to.',
  active: 'Your tickets that are assigned, in progress or on hold.',
  sentBack: 'Your tickets a chief sent back for more work.',
  done: 'Your closed tickets.',
};

export interface RepairViewAccess {
  seesAll: boolean;
  inRoster: boolean;
}

/** Which presets this viewer's sidebar offers (the server answers 403 to the rest). */
export function viewAllowed(view: RepairView, access: RepairViewAccess) {
  if (view === 'open' || view === 'signoff') return access.seesAll;
  if (view === 'mine') return access.seesAll && access.inRoster;
  return !access.seesAll;
}

export function readRepairView(raw: string | null): RepairView | null {
  return REPAIR_VIEWS.find((view) => view === raw) ?? null;
}
