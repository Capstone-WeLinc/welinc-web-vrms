import { describe, expect, it } from 'vitest';
import type { AuditChange } from '../../../types';
import { attachmentLine, movedFileName, photoMoveLine } from './auditEvents';

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
