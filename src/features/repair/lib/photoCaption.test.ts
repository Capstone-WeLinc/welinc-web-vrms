import { describe, expect, it } from 'vitest';
import type { Attachment } from '../../../lib/api/attachmentsApi';
import { formatManilaDateTime, photoAlt, photoCaption, photoMarks, photoName } from './photoCaption';

// Spec 0017, AC-24: the viewer caption is uploader, then Manila date and time, then the issue name.

function photo(over: Partial<Attachment> = {}): Attachment {
  return {
    id: 'a1',
    kind: 'VEHICLE_PHOTO',
    issueId: null,
    fileName: 'front.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1000,
    width: 40,
    height: 30,
    uploadedBy: { id: 'u1', name: 'Mia Mechanic' },
    createdAt: '2026-11-01T02:42:00Z',
    url: 'https://blob/x',
    thumbnailUrl: null,
    canRemove: true,
    canMove: true,
    returnedAfter: false,
    ...over,
  };
}

describe('formatManilaDateTime on a bad date', () => {
  it('shows a dash instead of throwing', () => {
    expect(formatManilaDateTime('not a date')).toBe('—');
    expect(formatManilaDateTime('')).toBe('—');
  });
});

describe('photoCaption (AC-24, spec 0018 group label)', () => {
  it('uses the uploader as the title and the Manila time as the description', () => {
    expect(photoCaption(photo(), new Map())).toEqual({
      title: 'Mia Mechanic',
      description: 'Before\nNov 1, 2026, 10:42 AM',
    });
  });

  it('adds the issue name on its own line after the time when the photo is tagged', () => {
    const names = new Map([['i1', 'Brake pads worn']]);
    expect(photoCaption(photo({ issueId: 'i1' }), names).description).toBe(
      'Before\nNov 1, 2026, 10:42 AM\nBrake pads worn',
    );
  });

  it('leaves the issue out when the tagged issue is not in the map', () => {
    expect(
      photoCaption(photo({ issueId: 'gone' }), new Map()).description,
    ).toBe('Before\nNov 1, 2026, 10:42 AM');
  });

  it('leaves the issue out when the photo has no tag, even if the map has names', () => {
    expect(
      photoCaption(photo(), new Map([['i1', 'Brake pads worn']])).description,
    ).toBe('Before\nNov 1, 2026, 10:42 AM');
  });
});

describe('formatManilaDateTime (AC-24)', () => {
  it('rolls into the next day in Manila when UTC is still the evening before', () => {
    expect(formatManilaDateTime('2026-11-01T18:30:00Z')).toBe(
      'Nov 2, 2026, 2:30 AM',
    );
  });

  it('formats noon and midnight on a 12 hour clock', () => {
    expect(formatManilaDateTime('2026-11-01T04:00:00Z')).toBe(
      'Nov 1, 2026, 12:00 PM',
    );
    expect(formatManilaDateTime('2026-11-01T16:00:00Z')).toBe(
      'Nov 2, 2026, 12:00 AM',
    );
  });

  it('accepts a Date as well as a string', () => {
    expect(formatManilaDateTime(new Date('2026-11-01T02:42:00Z'))).toBe(
      'Nov 1, 2026, 10:42 AM',
    );
  });
});

describe('photoMarks and the viewer lines (spec 0018, AC-13, AC-14)', () => {
  it('has no marks on a plain photo', () => {
    expect(photoMarks(photo())).toEqual([]);
  });

  it('gives the flag first, then the return mark, each with its chip and viewer text', () => {
    expect(photoMarks(photo({ kind: 'PROOF', takenBeforeWork: true, returnedAfter: true }))).toEqual([
      { id: 'takenBeforeWork', short: 'Taken before work started', long: 'Taken before work started' },
      { id: 'returnedAfter', short: 'Added after return', long: 'Added after the ticket was returned to the mechanic' },
    ]);
  });

  it('marks a Before photo added after work started, for everyone (spec 0024, AC-22)', () => {
    expect(photoMarks(photo({ addedAfterWorkStarted: true }))).toEqual([
      { id: 'addedAfterWorkStarted', short: 'Added after work started', long: 'Added after work started' },
    ]);
    expect(photoCaption(photo({ addedAfterWorkStarted: true }), new Map()).description).toBe(
      'Before\nNov 1, 2026, 10:42 AM\nAdded after work started',
    );
  });

  it('adds each mark as its own line under the caption', () => {
    expect(photoCaption(photo({ kind: 'PROOF', returnedAfter: true }), new Map()).description).toBe(
      'After\nNov 1, 2026, 10:42 AM\nAdded after the ticket was returned to the mechanic',
    );
  });
});

describe('photoName and photoAlt', () => {
  it('names the group, uploader and Manila time, and adds the evidence marks to the alt', () => {
    const p = photo({ kind: 'PROOF', returnedAfter: true, takenBeforeWork: true });
    expect(photoName(p, 'After')).toBe('After photo by Mia Mechanic, Nov 1, 2026, 10:42 AM');
    expect(photoAlt(p, 'After')).toBe('After photo by Mia Mechanic, Nov 1, 2026, 10:42 AM. Taken before work started. Added after return');
    expect(photoAlt(photo(), 'Before')).toBe(photoName(photo(), 'Before'));
  });
});
