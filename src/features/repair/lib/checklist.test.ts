import { describe, expect, it } from 'vitest';
import type { RepairIssueStep } from '../../../types';
import {
  canEditChecklist,
  checklistChanged,
  checklistPayload,
  dragSpeech,
  normalizeStepText,
  relinkLossMessage,
  stepKeyAction,
  stepRowError,
  stepTag,
  tickedLoss,
  tickedLossMessage,
} from './checklist';

// Spec 0023: the dialog's limits and payload (AC-5, AC-6), the ticked step prompt (AC-9), the tags
// (AC-13), the relink prompt (AC-14) and when the controls show (AC-2).

function step(n: number, over: Partial<RepairIssueStep> = {}): RepairIssueStep {
  return { id: `s${n}`, position: n, text: `Step ${n}`, checkedAt: null, checkedByEmail: null, origin: 'KNOWN_FIX', editedAt: null, ...over };
}
const ticked = (n: number, over: Partial<RepairIssueStep> = {}) => step(n, { checkedAt: '2026-11-06T02:00:00.000Z', checkedByEmail: 'm@welinc.com', ...over });

describe('canEditChecklist (AC-2, AC-3)', () => {
  it('needs the flag and an Assigned or In progress ticket', () => {
    const can = (editChecklist: boolean) => ({ editChecklist }) as never;
    expect(canEditChecklist({ can: can(true), status: 'ASSIGNED' })).toBe(true);
    expect(canEditChecklist({ can: can(true), status: 'IN_PROGRESS' })).toBe(true);
    expect(canEditChecklist({ can: can(true), status: 'FOR_VERIFICATION' })).toBe(false);
    expect(canEditChecklist({ can: can(false), status: 'IN_PROGRESS' })).toBe(false);
  });
});

describe('row limits and the payload (AC-5, AC-6, AC-8)', () => {
  it('normalizes like the server', () => {
    expect(normalizeStepText('  Bleed\tthe \n brakes ')).toBe('Bleed the brakes');
  });

  it('lets an empty new row pass, and flags short, emptied and long steps', () => {
    expect(stepRowError({ text: '   ' })).toBeNull();
    expect(stepRowError({ text: 'ab' })).toBe('Write at least 3 characters.');
    expect(stepRowError({ id: 's1', text: ' ' })).toBe('Write at least 3 characters.');
    expect(stepRowError({ text: 'x'.repeat(301) })).toBe('Keep it to 300 characters.');
    expect(stepRowError({ text: 'x'.repeat(300) })).toBeNull();
  });

  it('drops empty new rows and keeps each sent step’s row index', () => {
    expect(checklistPayload([{ text: '' }, { id: 's1', text: ' Step  1 ' }, { text: '  ' }, { text: 'Road test' }])).toEqual({
      steps: [{ id: 's1', text: 'Step 1' }, { text: 'Road test' }],
      rowOf: [1, 3],
    });
  });

  it('sees order, text, added and removed changes, and ignores spacing and empty rows', () => {
    const opened = [step(1), step(2)];
    expect(checklistChanged(opened, [{ id: 's1', text: 'Step  1 ' }, { id: 's2', text: 'Step 2' }, { text: '' }])).toBe(false);
    expect(checklistChanged(opened, [{ id: 's2', text: 'Step 2' }, { id: 's1', text: 'Step 1' }])).toBe(true);
    expect(checklistChanged(opened, [{ id: 's1', text: 'Step one' }, { id: 's2', text: 'Step 2' }])).toBe(true);
    expect(checklistChanged(opened, [{ id: 's1', text: 'Step 1' }])).toBe(true);
  });
});

describe('the ticked step prompt (AC-9)', () => {
  it('counts ticked steps removed or reworded against the latest data', () => {
    const latest = [ticked(1), ticked(2), step(3), ticked(4)];
    const rows = [
      { id: 's2', text: 'Step two, better' },
      { id: 's3', text: 'Step three' },
      { id: 's4', text: ' Step   4' },
    ];
    expect(tickedLoss(latest, rows)).toEqual({ removed: 1, reworded: 1 });
  });

  it('words only the parts that apply, singular for one', () => {
    expect(tickedLossMessage({ removed: 0, reworded: 0 })).toBeNull();
    expect(tickedLossMessage({ removed: 1, reworded: 0 })).toBe('1 ticked step will be removed.');
    expect(tickedLossMessage({ removed: 0, reworded: 1 })).toBe('1 ticked step will lose its tick.');
    expect(tickedLossMessage({ removed: 2, reworded: 3 })).toBe('2 ticked steps will be removed. 3 ticked steps will lose their tick.');
  });
});

describe('tags and the relink prompt (AC-13, AC-14)', () => {
  it('tags an added step and a reworded copy, and nothing else', () => {
    expect(stepTag(step(1, { origin: 'ADDED' }))).toBe('Added');
    expect(stepTag(step(1, { editedAt: '2026-11-06T02:00:00.000Z' }))).toBe('Edited');
    expect(stepTag(step(1))).toBeNull();
  });

  it('asks only when ticks or this ticket’s steps would be lost', () => {
    expect(relinkLossMessage([step(1), step(2)])).toBeNull();
    expect(relinkLossMessage([ticked(1), step(2, { origin: 'ADDED' }), step(3, { editedAt: '2026-11-06T02:00:00.000Z' })])).toBe(
      '1 ticked step will be cleared. 2 steps added or reworded on this ticket will be lost.',
    );
    expect(relinkLossMessage([step(1, { origin: 'ADDED' })])).toBe('1 step added or reworded on this ticket will be lost.');
  });
});

describe('typing shortcuts (AC-4b)', () => {
  const key = (over: Partial<Parameters<typeof stepKeyAction>[0]>) =>
    stepKeyAction({ key: 'Enter', value: 'Bleed the brakes', repeat: false, composing: false, count: 3, ...over });

  it('adds a step below on Enter in a step with text', () => {
    expect(key({})).toBe('add');
  });

  it('only stops the new line on Enter in an empty or blank step, or at 20 rows', () => {
    expect(key({ value: '' })).toBe('block');
    expect(key({ value: '   ' })).toBe('block');
    expect(key({ count: 20 })).toBe('block');
  });

  it('removes a step on Backspace only when its raw value is empty and the key is not held', () => {
    expect(key({ key: 'Backspace', value: '' })).toBe('remove');
    expect(key({ key: 'Backspace', value: ' ' })).toBeNull();
    expect(key({ key: 'Backspace', value: '', repeat: true })).toBeNull();
  });

  it('ignores both keys while an input method is composing', () => {
    expect(key({ composing: true })).toBeNull();
    expect(key({ key: 'Backspace', value: '', composing: true })).toBeNull();
  });

  it('lets other keys through', () => {
    expect(key({ key: 'a' })).toBeNull();
  });
});

describe('drag sentences (AC-4a)', () => {
  it('speaks the start, over, drop and cancel positions', () => {
    expect(dragSpeech.pickedUp(2)).toBe('Picked up step 2.');
    expect(dragSpeech.over(2, 4)).toBe('Step 2 is now at position 4.');
    expect(dragSpeech.dropped(2, 4)).toBe('Step 2 dropped at position 4.');
    expect(dragSpeech.cancelled(2)).toBe('Moving cancelled. Step 2 is back at position 2.');
  });
});
