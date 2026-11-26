import { describe, expect, it } from 'vitest';
import type { AuditChange } from '../../../types';
import {
  costDetailLines,
  eventText,
  attachmentLine,
  eventStyle,
  issueEventLines,
  movedFileName,
  photoMoveLine,
  stepLine,
  ticketEditLines,
  ticketTextLines,
} from './auditEvents';

// Spec 0021, AC-15
describe('ticketTextLines', () => {
  it('reads remarks and the cancel reason as old → new, with None for nothing', () => {
    expect(
      ticketTextLines({
        changes: [
          { field: 'remarks', before: null, after: 'Pads replaced' },
          { field: 'cancellationReason', before: 'Duplicate', after: 'Truck sold' },
        ],
      }),
    ).toEqual(['Remarks: None → Pads replaced', 'Cancel reason: Duplicate → Truck sold']);
  });

  it('leaves the detail fields to ticketEditLines', () => {
    expect(ticketTextLines({ changes: [{ field: 'priority', before: 'LOW', after: 'HIGH' }] })).toEqual([]);
  });
});

describe('eventStyle for the spec 0021 types (AC-15)', () => {
  const fallback = eventStyle('NOT_A_TYPE');

  it('gives locked, ticked and unticked their own icon instead of the fallback', () => {
    for (const type of ['LOCKED', 'STEP_CHECKED', 'STEP_UNCHECKED']) {
      expect(eventStyle(type).icon).not.toBe(fallback.icon);
    }
  });

  it('treats an inherited object name as an unknown type, not a style', () => {
    expect(eventStyle('constructor')).toEqual(fallback);
    expect(eventStyle('toString')).toEqual(fallback);
  });

  it('tells a ticked step from an unticked one', () => {
    expect(eventStyle('STEP_CHECKED').icon).not.toBe(eventStyle('STEP_UNCHECKED').icon);
  });
});

describe('ticketTextLines edge cases (AC-15)', () => {
  it('shows None for a cleared value on either side', () => {
    expect(
      ticketTextLines({ changes: [{ field: 'remarks', before: 'Old note', after: null }] }),
    ).toEqual(['Remarks: Old note → None']);
  });

  it('keeps remarks before the cancel reason whatever order the changes came in', () => {
    expect(
      ticketTextLines({
        changes: [
          { field: 'cancellationReason', before: null, after: 'Sold' },
          { field: 'remarks', before: null, after: 'Note' },
        ],
      }),
    ).toEqual(['Remarks: None → Note', 'Cancel reason: None → Sold']);
  });
});

describe('stepLine', () => {
  it('reads the numbered step text, or null without one', () => {
    expect(stepLine({ changes: [{ field: 'step', before: null, after: '2. Check brake fluid' }] })).toBe('2. Check brake fluid');
    expect(stepLine({ changes: [] })).toBeNull();
  });
});

// Spec 0018, AC-18: photo audit events name the groups Before and After.

const event = (changes: AuditChange[]) => ({ changes });

describe('attachmentLine', () => {
  it('names the group of a photo, even on rows written with the old labels', () => {
    expect(
      attachmentLine(
        event([
          { field: 'attachment', before: null, after: 'Vehicle photo: IMG_2041.jpg' },
          { field: 'kind', before: null, after: 'VEHICLE_PHOTO' },
        ]),
      ),
    ).toBe('Before photo: IMG_2041.jpg');
    expect(
      attachmentLine(
        event([
          { field: 'attachment', before: 'Proof of completion: done.jpg', after: null },
          { field: 'kind', before: null, after: 'PROOF' },
        ]),
      ),
    ).toBe('After photo: done.jpg');
  });

  it('keeps a document line as stored, and a colon inside the file name', () => {
    expect(
      attachmentLine(
        event([
          { field: 'attachment', before: null, after: 'Receipt: shop.pdf' },
          { field: 'kind', before: null, after: 'RECEIPT' },
        ]),
      ),
    ).toBe('Receipt: shop.pdf');
    expect(
      attachmentLine(
        event([
          { field: 'attachment', before: null, after: 'Before photo: 10: 30 front.jpg' },
          { field: 'kind', before: null, after: 'VEHICLE_PHOTO' },
        ]),
      ),
    ).toBe('Before photo: 10: 30 front.jpg');
  });

  it('is null without a file change', () => {
    expect(attachmentLine(event([]))).toBeNull();
  });
});

describe('photoMoveLine and movedFileName', () => {
  const moved = event([
    { field: 'kind', before: 'PROOF', after: 'VEHICLE_PHOTO' },
    { field: 'attachment', before: 'After photo: front.jpg', after: 'Before photo: front.jpg' },
  ]);

  it('reads "Moved a photo from After to Before" with the file name', () => {
    expect(photoMoveLine(moved)).toBe('Moved a photo from After to Before');
    expect(movedFileName(moved)).toBe('front.jpg');
  });

  it('is null when the kinds are not photo groups', () => {
    expect(photoMoveLine(event([{ field: 'kind', before: 'RECEIPT', after: 'PROOF' }]))).toBeNull();
  });
});

// Spec 0019, AC-19b: the edit rows in plain words
describe('ticketEditLines', () => {
  const c = (field: string, before: string | null, after: string | null): AuditChange => ({ field, before, after });

  it('writes one line per change', () => {
    expect(
      ticketEditLines({
        changes: [
          c('driver', 'Juan Cruz (A01-23-456789)', 'Maria Santos (C03-45-678901)'),
          c('odometer', '120400', '120040'),
          c('priority', 'MEDIUM', 'HIGH'),
          c('accountType', 'ONLINE', 'CORPORATE'),
          c('corporation', null, 'Acme'),
        ],
      }),
    ).toEqual([
      'Driver: Juan Cruz (A01-23-456789) → Maria Santos (C03-45-678901)',
      'Odometer: 120,400 → 120,040 km',
      'Priority: Medium → High',
      'Account: Online → Corporate (Acme)',
    ]);
  });

  it('writes the due date as a date and time, or None (spec 0029, child 0003)', () => {
    const at = '2026-12-01T01:00:00.000Z';
    const [line] = ticketEditLines({ changes: [c('dueAt', null, at)] });
    expect(line.startsWith('Due: None → ')).toBe(true);
    expect(line).toContain('2026');
    expect(ticketEditLines({ changes: [c('dueAt', at, null)] })[0].endsWith('→ None')).toBe(true);
  });

  it('names a corporation swap on its own', () => {
    expect(ticketEditLines({ changes: [c('corporation', 'Acme', 'Beta')] })).toEqual(['Corporation: Acme → Beta']);
  });
});

describe('issueEventLines', () => {
  const c = (field: string, before: string | null, after: string | null): AuditChange => ({ field, before, after });

  it('shows the added text, the edit and the removed text with its note', () => {
    expect(issueEventLines({ type: 'ISSUE_ADDED', changes: [c('issue', null, '[Brakes] Leak: Line cut'), c('issueId', null, 'i1')] })).toEqual([
      '[Brakes] Leak: Line cut',
    ]);
    expect(
      issueEventLines({
        type: 'ISSUE_EDITED',
        changes: [c('description', '[Brakes] A', '[Engine] B'), c('system', 'Brakes', 'Engine'), c('knowledgeEntry', 'Pads', null)],
      }),
    ).toEqual(['Now: [Engine] B', 'Was: [Brakes] A', 'System: Brakes → Engine', 'Known fix removed: Pads']);
    expect(
      issueEventLines({ type: 'ISSUE_REMOVED', changes: [c('issue', '[Brakes] A', null), c('resolutionNote', 'Bled the lines', null)] }),
    ).toEqual(['[Brakes] A', 'What fixed it: Bled the lines']);
  });
});

describe('eventText (spec 0024, AC-15)', () => {
  const actor = { id: 'u1', name: 'Victor Ramos', email: 'v@welinc.com', role: 'ADMIN' };
  it('names the actor and calls the ticket "this ticket"', () => {
    expect(eventText({ type: 'COST_UPDATE', actor })).toBe('Victor Ramos updated the costs of this ticket');
    expect(eventText({ type: 'GARAGE_CHANGE', actor })).toBe('Victor Ramos moved this ticket to a different garage');
  });
  it('falls back to the email, then to the passive wording, capitalised', () => {
    expect(eventText({ type: 'CREATED', actor: { ...actor, name: '' } })).toBe('v@welinc.com created this ticket');
    expect(eventText({ type: 'CREATED', actor: null })).toBe('This ticket was created');
    expect(eventText({ type: 'STEP_CHECKED', actor: null })).toBe('A step was ticked on this ticket');
  });
  it('names BMS and VRMS on the expedite rows (spec 0029, AC-25)', () => {
    const bms = { id: null, name: 'BMS', email: null, role: 'SYSTEM' };
    expect(eventText({ type: 'EXPEDITE_REQUESTED', actor: bms })).toBe('BMS asked to speed up this ticket');
    expect(eventText({ type: 'EXPEDITE_DECLINED', actor: { ...bms, name: 'VRMS' } })).toBe(
      'VRMS declined a BMS expedite request on this ticket',
    );
    expect(eventText({ type: 'EXPEDITE_ACCEPTED', actor })).toBe('Victor Ramos accepted a BMS expedite request on this ticket');
  });
  it('reads an unknown type by its name', () => {
    expect(eventText({ type: 'SOMETHING_NEW', actor })).toBe('Victor Ramos SOMETHING_NEW on this ticket');
  });
});

// Spec 0024, AC-19: the Activity card's cost detail has no dot separator, one line per change
describe('costDetailLines', () => {
  it('gives one line for each part that changed, in order', () => {
    expect(
      costDetailLines({
        changes: [
          { field: 'partsCost', before: '3000.00', after: '3500.00' },
          { field: 'laborCost', before: '1000.00', after: '1700.00' },
          { field: 'isLumpSum', before: 'false', after: 'true' },
        ],
      } as never),
    ).toEqual(['Parts ₱3,000 → ₱3,500', 'Labor ₱1,000 → ₱1,700', 'Lump sum']);
  });

  it('gives nothing when no cost part changed', () => {
    expect(costDetailLines({ changes: [{ field: 'totalCost', before: '1', after: '2' }] } as never)).toEqual([]);
  });
});
