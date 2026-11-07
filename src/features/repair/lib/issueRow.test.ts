import { describe, expect, it } from 'vitest';
import type { RepairIssue, RepairIssueStep } from '../../../types';
import {
  initialOpen,
  issueDisplayText,
  issueHashIndex,
  issueState,
  mergedSteps,
  needsResolution,
  resolutionLine,
  safetyNote,
  settleOverrides,
  stripSystem,
  summaryCounts,
  summaryText,
  type IssueState,
} from './issueRow';
import { parseView, pruneView, touchIndex } from './ticketView';

// Spec 0024: the issue state (AC-3), the open rule (AC-4), the stored view (AC-5), the summary line
// (AC-6), line 2 of a closed row (AC-2) and the prefix strip (AC-12).

function step(id: string, checked = false): RepairIssueStep {
  return {
    id,
    position: 1,
    text: id,
    checkedAt: checked ? '2026-11-06T01:00:00.000Z' : null,
    checkedByEmail: checked ? 'm@welinc.com' : null,
    origin: 'KNOWN_FIX',
    editedAt: null,
  };
}

function issue(overrides: Partial<RepairIssue> = {}): RepairIssue {
  return {
    id: 'i1',
    description: '[Brakes] Wear and tear: grinding',
    categoryId: 'cat',
    categoryName: 'Brakes',
    knowledgeEntry: null,
    checklistVersion: 0,
    steps: [],
    resolutionNote: null,
    hoursSpent: null,
    followedKnownFix: null,
    resolvedAt: null,
    ...overrides,
  };
}

const state = (i: RepairIssue) => issueState(i, i.steps);

describe('stripSystem (AC-12)', () => {
  it('drops the stored [System] prefix and keeps the root cause', () => {
    expect(stripSystem('[Brakes] Wear and tear: grinding')).toBe('Wear and tear: grinding');
  });
  it('leaves text with no prefix alone', () => {
    expect(stripSystem('Noise from the rear')).toBe('Noise from the rear');
    expect(stripSystem('Brakes [left] squeal')).toBe('Brakes [left] squeal');
  });
});

describe('issueState (AC-3)', () => {
  it('is No checklist with no steps', () => {
    expect(state(issue())).toBe('none');
  });
  it('is Not started, In progress and Done by ticks', () => {
    expect(state(issue({ steps: [step('a'), step('b')] }))).toBe('notStarted');
    expect(state(issue({ steps: [step('a', true), step('b')] }))).toBe('inProgress');
    expect(state(issue({ steps: [step('a', true), step('b', true)] }))).toBe('done');
  });
  it('is Returned when notes are saved without resolvedAt, over every other state', () => {
    expect(state(issue({ resolutionNote: 'New pads' }))).toBe('returned');
    expect(state(issue({ hoursSpent: 2, steps: [step('a', true)] }))).toBe('returned');
  });
  it('is not Returned once resolved', () => {
    expect(state(issue({ resolutionNote: 'New pads', resolvedAt: '2026-11-06T00:00:00.000Z', steps: [step('a', true)] }))).toBe('done');
  });
  it('counts the local ticks', () => {
    const i = issue({ steps: [step('a'), step('b', true)] });
    const merged = mergedSteps(i, { a: { issueId: 'i1', checkedAt: '2026-11-06T02:00:00.000Z', checkedByEmail: 'you' } });
    expect(issueState(i, merged)).toBe('done');
  });
});

describe('initialOpen (AC-4)', () => {
  const rows = (...states: IssueState[]) => states.map((s, n) => ({ id: `i${n + 1}`, state: s }));

  it('opens every row with 3 issues or fewer while work is ongoing', () => {
    expect(initialOpen('IN_PROGRESS', rows('done', 'none', 'notStarted'))).toEqual(['i1', 'i2', 'i3']);
  });
  it('opens the first row that is not Done and not No checklist above 3', () => {
    expect(initialOpen('IN_PROGRESS', rows('done', 'none', 'inProgress', 'notStarted'))).toEqual(['i3']);
  });
  it('counts a Returned row as not done', () => {
    expect(initialOpen('IN_PROGRESS', rows('done', 'returned', 'notStarted', 'done'))).toEqual(['i2']);
  });
  it('opens none above 3 when every row is finished or has no checklist', () => {
    expect(initialOpen('ON_HOLD', rows('done', 'none', 'done', 'done'))).toEqual([]);
  });
  it.each(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'OUTSOURCED', 'PENDING_APPROVAL'] as const)('opens rows in %s', (status) => {
    expect(initialOpen(status, rows('notStarted'))).toEqual(['i1']);
  });
  it.each(['FOR_VERIFICATION', 'CLOSED', 'CANCELLED'] as const)('starts every row closed in %s', (status) => {
    expect(initialOpen(status, rows('notStarted', 'inProgress'))).toEqual([]);
  });
});

describe('issueHashIndex (AC-4)', () => {
  it('reads #issue-N from 1 and ignores anything out of range', () => {
    expect(issueHashIndex('#issue-1', 3)).toBe(0);
    expect(issueHashIndex('#issue-3', 3)).toBe(2);
    expect(issueHashIndex('#issue-4', 3)).toBeNull();
    expect(issueHashIndex('#issue-0', 3)).toBeNull();
    expect(issueHashIndex('#costs', 3)).toBeNull();
    expect(issueHashIndex('', 3)).toBeNull();
  });
});

describe('summary line (AC-6)', () => {
  it('counts done issues and only issues with steps', () => {
    const list = [issue({ steps: [step('a', true), step('b', true)] }), issue({ id: 'i2', steps: [step('c'), step('d', true)] }), issue({ id: 'i3' })];
    const counts = summaryCounts(list.map((i) => ({ state: state(i), steps: i.steps })));
    expect(counts).toEqual({ doneIssues: 1, issues: 3, ticked: 3, steps: 4 });
    expect(summaryText(counts)).toBe('1 of 3 issues done, 3 of 4 steps ticked');
  });
  it('leaves the step part out when no issue has steps, and uses the singular', () => {
    expect(summaryText({ doneIssues: 0, issues: 1, ticked: 0, steps: 0 })).toBe('0 of 1 issue done');
    expect(summaryText({ doneIssues: 1, issues: 1, ticked: 1, steps: 1 })).toBe('1 of 1 issue done, 1 of 1 step ticked');
  });
});

describe('line 2 of a closed row (AC-2)', () => {
  const entry = (safetyNotes: string | null) => ({
    id: 'e1',
    name: 'Brake pad change',
    status: 'ACTIVE' as const,
    safetyNotes,
    parts: [],
    typicalHours: null,
    estimatedHours: null,
  });

  it('shows Safety only for a note with real text', () => {
    expect(safetyNote(issue({ knowledgeEntry: entry('Chock the wheels') }))).toBe('Chock the wheels');
    expect(safetyNote(issue({ knowledgeEntry: entry('   ') }))).toBeNull();
    expect(safetyNote(issue())).toBeNull();
  });
  it('shows What fixed it: the note, else Followed the known fix, with the hours', () => {
    expect(resolutionLine(issue())).toBeNull();
    expect(resolutionLine(issue({ resolutionNote: 'New pads', hoursSpent: 2.5 }))).toEqual({ text: 'New pads', hours: '2.5 h' });
    expect(resolutionLine(issue({ followedKnownFix: true, resolvedAt: '2026-11-06T00:00:00.000Z' }))).toEqual({
      text: 'Followed the known fix',
      hours: null,
    });
  });
  it('says Needs what fixed it only for a Done issue with no notes while In progress', () => {
    const done = issue({ steps: [step('a', true)] });
    expect(needsResolution(done, 'done', 'IN_PROGRESS')).toBe(true);
    expect(needsResolution(done, 'done', 'FOR_VERIFICATION')).toBe(false);
    expect(needsResolution(done, 'inProgress', 'IN_PROGRESS')).toBe(false);
    expect(needsResolution(issue({ ...done, resolutionNote: 'x' }), 'done', 'IN_PROGRESS')).toBe(false);
  });
});

describe('settleOverrides (AC-3)', () => {
  const local = { issueId: 'i1', checkedAt: '2026-11-06T02:00:00.000Z', checkedByEmail: 'you' };

  it('keeps a tick the server has not caught up with, by reference', () => {
    const overrides = { a: local };
    const versions = { i1: 0 };
    const out = settleOverrides(overrides, versions, [issue({ steps: [step('a')] })]);
    expect(out.overrides).toBe(overrides);
    expect(out.versions).toBe(versions);
  });
  it('drops a tick once the server value equals it', () => {
    const out = settleOverrides({ a: { ...local, checkedAt: null } }, { i1: 0 }, [issue({ steps: [step('a')] })]);
    expect(out.overrides).toEqual({});
  });
  it('drops the ticks of an issue whose checklistVersion changed', () => {
    const out = settleOverrides({ a: local }, { i1: 0 }, [issue({ checklistVersion: 1, steps: [step('a')] })]);
    expect(out.overrides).toEqual({});
    expect(out.versions).toEqual({ i1: 1 });
  });
  it('drops ticks on a removed step or issue', () => {
    expect(settleOverrides({ a: local }, { i1: 0 }, [issue({ steps: [step('b')] })]).overrides).toEqual({});
    expect(settleOverrides({ a: local }, { i1: 0 }, []).overrides).toEqual({});
  });
});

describe('stored view (AC-5)', () => {
  it('reads only the checked shape', () => {
    expect(parseView('{"open":["i1"]}')).toEqual({ open: ['i1'] });
    expect(parseView('{"open":[]}')).toEqual({ open: [] });
    expect(parseView('{"open":"i1"}')).toBeNull();
    expect(parseView('{"open":[1]}')).toBeNull();
    expect(parseView('{}')).toBeNull();
    expect(parseView('not json')).toBeNull();
    expect(parseView(null)).toBeNull();
  });
  it('reads older shapes, ignoring any hideDone field', () => {
    expect(parseView('{"open":["i1"],"hideDone":true}')).toEqual({ open: ['i1'] });
    expect(parseView('{"open":["i1"],"hideDone":["i1","i2"]}')).toEqual({ open: ['i1'] });
    expect(parseView('{"open":["i1"],"hideDone":"yes"}')).toEqual({ open: ['i1'] });
  });
  it('drops removed issues and leaves a new issue closed', () => {
    expect(pruneView({ open: ['i1', 'gone'] }, ['i1', 'new'])).toEqual({ open: ['i1'] });
  });
  it('keeps the 20 most recent tickets', () => {
    const ids = Array.from({ length: 20 }, (_, n) => `t${n}`);
    const { index, evicted } = touchIndex(JSON.stringify(ids), 'new');
    expect(index).toHaveLength(20);
    expect(index[0]).toBe('new');
    expect(evicted).toEqual(['t19']);
    expect(touchIndex(JSON.stringify(ids), 't5').index[0]).toBe('t5');
    expect(touchIndex('broken', 't1')).toEqual({ index: ['t1'], evicted: [] });
  });
});

describe('issueDisplayText (AC-12)', () => {
  it('drops a repeated root cause and the separators after it', () => {
    expect(issueDisplayText('Aircon not cooling: Aircon not cooling, blows warm air.')).toBe('Aircon not cooling: blows warm air.');
    expect(issueDisplayText('Brakes: brakes. : grinding')).toBe('Brakes: grinding');
  });

  it('matches case insensitively, after trimming', () => {
    expect(issueDisplayText('Flat tyre:   FLAT TYRE, front left')).toBe('Flat tyre: front left');
  });

  it('shows only the root cause when nothing is left', () => {
    expect(issueDisplayText('Battery dead: Battery dead.')).toBe('Battery dead');
    expect(issueDisplayText('Battery dead: battery dead')).toBe('Battery dead');
  });

  it('leaves text with no repeat, no ": ", or a leading ": " unchanged', () => {
    expect(issueDisplayText('Aircon not cooling: blows warm air')).toBe('Aircon not cooling: blows warm air');
    expect(issueDisplayText('Aircon not cooling')).toBe('Aircon not cooling');
    expect(issueDisplayText(': Aircon')).toBe(': Aircon');
    expect(issueDisplayText('Noise:clunk')).toBe('Noise:clunk');
  });

  it('needs a whole word match', () => {
    expect(issueDisplayText('Aircon: Aircon cooling weak')).toBe('Aircon: cooling weak');
    expect(issueDisplayText('Air: Aircon cooling weak')).toBe('Air: Aircon cooling weak');
    expect(issueDisplayText('Leak: Leak2 at hose')).toBe('Leak: Leak2 at hose');
  });

  it('splits only at the first ": "', () => {
    expect(issueDisplayText('Engine: Engine: misfire')).toBe('Engine: misfire');
    expect(issueDisplayText('Engine: Fuel: Engine misfire')).toBe('Engine: Fuel: Engine misfire');
  });
});
