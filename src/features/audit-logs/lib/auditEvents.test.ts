import { describe, expect, it } from 'vitest';
import type { AuditChange } from '../../../types';
import { attachmentLine, issueEventLines, movedFileName, photoMoveLine, ticketEditLines } from './auditEvents';

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
