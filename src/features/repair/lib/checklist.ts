import type { RepairIssueStep, RepairStatus, RepairTicket } from '../../../types';

// Spec 0023: the per ticket checklist rules the web shares with the server. Pure, so they test
// without rendering. Mirrors `checklist-edits.ts` and `LINKABLE_STATUSES` in welinc-backend-vrms.

/** AC-3: steps can be edited, and known fixes linked, only in these statuses. */
export const LINKABLE_STATUSES: readonly RepairStatus[] = ['ASSIGNED', 'IN_PROGRESS'];

/** AC-5: the same limits as a knowledge entry's steps. */
export const STEPS_MAX = 20;
export const STEP_TEXT_MIN = 3;
export const STEP_TEXT_MAX = 300;

/** The server's 409 STALE_CHECKLIST message (AC-6), shown as a toast after the reload (AC-17). */
export const STALE_CHECKLIST_MESSAGE = 'This checklist changed since you opened it. Reload to see the latest.';

/** AC-2: the edit controls show only from the ticket's flag, and only in a linkable status. */
export function canEditChecklist(ticket: Pick<RepairTicket, 'can' | 'status'>): boolean {
  return ticket.can.editChecklist && LINKABLE_STATUSES.includes(ticket.status);
}

/** AC-8: trimmed, each run of whitespace (spaces, tabs, newlines) turned into one space. */
export function normalizeStepText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** One row of the Edit steps dialog: `id` for a kept step, none for a new one. */
export type ChecklistRow = { id?: string; text: string };

/** AC-5: the message under a row, or null. Empty new rows are dropped, so they pass. */
export function stepRowError(row: ChecklistRow): string | null {
  const text = normalizeStepText(row.text);
  if (!row.id && text === '') return null;
  if (text.length < STEP_TEXT_MIN) return `Write at least ${STEP_TEXT_MIN} characters.`;
  if (text.length > STEP_TEXT_MAX) return `Keep it to ${STEP_TEXT_MAX} characters.`;
  return null;
}

/**
 * AC-5 and AC-6: the list to send, empty new rows dropped and text normalized, plus each sent
 * step's row index so a 400's `fieldErrors[].index` finds its row.
 */
export function checklistPayload(rows: ChecklistRow[]): { steps: ChecklistRow[]; rowOf: number[] } {
  const steps: ChecklistRow[] = [];
  const rowOf: number[] = [];
  rows.forEach((row, index) => {
    const text = normalizeStepText(row.text);
    if (!row.id && text === '') return;
    steps.push(row.id ? { id: row.id, text } : { text });
    rowOf.push(index);
  });
  return { steps, rowOf };
}

/** Whether the dialog's list differs from the steps it opened with (order, text, added, removed). */
export function checklistChanged(opened: Pick<RepairIssueStep, 'id' | 'text'>[], rows: ChecklistRow[]): boolean {
  const { steps } = checklistPayload(rows);
  if (steps.length !== opened.length) return true;
  return steps.some((step, i) => step.id !== opened[i].id || step.text !== opened[i].text);
}

/**
 * AC-9: ticked steps the save would remove or reword, counted against the latest ticket data,
 * so a tick made while the dialog was open counts too.
 */
export function tickedLoss(latest: RepairIssueStep[], rows: ChecklistRow[]): { removed: number; reworded: number } {
  const sent = new Map(checklistPayload(rows).steps.flatMap((s) => (s.id ? [[s.id, s.text] as const] : [])));
  let removed = 0;
  let reworded = 0;
  for (const step of latest) {
    if (step.checkedAt == null) continue;
    const text = sent.get(step.id);
    if (text === undefined) removed++;
    else if (text !== step.text) reworded++;
  }
  return { removed, reworded };
}

const steps = (n: number) => `${n} ticked ${n === 1 ? 'step' : 'steps'}`;

/** AC-9: the confirm text, only the parts that apply; null when nothing ticked is lost. */
export function tickedLossMessage({ removed, reworded }: { removed: number; reworded: number }): string | null {
  const parts = [
    removed > 0 ? `${steps(removed)} will be removed.` : null,
    reworded > 0 ? `${steps(reworded)} will lose ${reworded === 1 ? 'its' : 'their'} tick.` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

/** AC-13: the tag a step carries, or null for an untouched copy of the known fix. */
export function stepTag(step: Pick<RepairIssueStep, 'origin' | 'editedAt'>): 'Added' | 'Edited' | null {
  if (step.origin === 'ADDED') return 'Added';
  if (step.editedAt != null) return 'Edited';
  return null;
}

export const STEP_TAG_TOOLTIP = { Added: 'Added on this ticket', Edited: 'Reworded on this ticket' } as const;

/**
 * AC-14: what a relink or unlink would throw away. Null when nothing is lost, so the link goes
 * through without asking.
 */
export function relinkLossMessage(latest: RepairIssueStep[]): string | null {
  const ticked = latest.filter((s) => s.checkedAt != null).length;
  const custom = latest.filter((s) => stepTag(s) != null).length;
  const parts = [
    ticked > 0 ? `${ticked} ticked ${ticked === 1 ? 'step' : 'steps'} will be cleared.` : null,
    custom > 0
      ? `${custom} ${custom === 1 ? 'step' : 'steps'} added or reworded on this ticket will be lost.`
      : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

/** A key press in a step field, as far as the typing shortcuts care (AC-4b). */
export type StepKey = {
  key: string;
  /** The field's raw value, never trimmed. */
  value: string;
  repeat: boolean;
  /** `nativeEvent.isComposing`, or `keyCode` 229 for Safari. */
  composing: boolean;
  /** Rows in the dialog now, empty ones included. */
  count: number;
};

/**
 * AC-4b: what Enter or Backspace does in a step field. `add` puts an empty step below, `remove`
 * deletes this empty step, `block` only stops the new line, null lets the key through.
 */
export function stepKeyAction({ key, value, repeat, composing, count }: StepKey): 'add' | 'remove' | 'block' | null {
  if (composing) return null;
  if (key === 'Enter') return normalizeStepText(value) !== '' && count < STEPS_MAX ? 'add' : 'block';
  if (key === 'Backspace' && value.length === 0 && !repeat) return 'remove';
  return null;
}

/** AC-4a: read when a drag handle gets focus. */
export const DRAG_INSTRUCTIONS = 'To reorder, press Space, use the arrow keys to move, then Space to drop. Escape cancels.';

/**
 * AC-4a: the spoken sentences. `n` is the row's place when the drag began, `m` the place of the
 * row it is over; both count from 1 and include empty rows.
 */
export const dragSpeech = {
  pickedUp: (n: number) => `Picked up step ${n}.`,
  over: (n: number, m: number) => `Step ${n} is now at position ${m}.`,
  dropped: (n: number, m: number) => `Step ${n} dropped at position ${m}.`,
  cancelled: (n: number) => `Moving cancelled. Step ${n} is back at position ${n}.`,
};

/**
 * AC-4a: "Step n is now at position m." is spoken only when the `over` row changes. dnd-kit fires
 * `onDragOver` at pickup with the picked up row as `over`, which would otherwise replace "Picked up
 * step n." in the live region at once.
 */
export function overTracker() {
  let last: string | number | null = null;
  return {
    /** A drag began on this row. */
    begin(id: string | number) {
      last = id;
    },
    /** True when `id` is a different row than the last one announced. */
    changed(id: string | number) {
      if (id === last) return false;
      last = id;
      return true;
    },
  };
}
