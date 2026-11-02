import { describe, expect, it } from 'vitest';
import type { Attachment } from '../../../lib/api/attachmentsApi';
import { formatManilaDateTime, photoCaption } from './photoCaption';

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
    ...over,
  };
}

describe('photoCaption (AC-24, spec 0018 group label)', () => {
  it('uses the uploader as the title and the Manila time as the description', () => {
    expect(photoCaption(photo(), new Map())).toEqual({
      title: 'Mia Mechanic',
      description: 'Before · Nov 1, 2026, 10:42 AM',
    });
  });

  it('adds the issue name after the time when the photo is tagged', () => {
    const names = new Map([['i1', 'Brake pads worn']]);
    expect(photoCaption(photo({ issueId: 'i1' }), names).description).toBe(
      'Before · Nov 1, 2026, 10:42 AM · Brake pads worn',
    );
  });

  it('leaves the issue out when the tagged issue is not in the map', () => {
    expect(
      photoCaption(photo({ issueId: 'gone' }), new Map()).description,
    ).toBe('Before · Nov 1, 2026, 10:42 AM');
  });

  it('leaves the issue out when the photo has no tag, even if the map has names', () => {
    expect(
      photoCaption(photo(), new Map([['i1', 'Brake pads worn']])).description,
    ).toBe('Before · Nov 1, 2026, 10:42 AM');
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
