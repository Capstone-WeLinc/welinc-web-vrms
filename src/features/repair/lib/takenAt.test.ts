import { describe, expect, it } from 'vitest';
import { takenAtFrom } from './takenAt';

// Spec 0018, AC-12: the taken time sent with a photo, from exifr's parsed tags.

describe('takenAtFrom (AC-12)', () => {
  it('sends a parsed DateTimeOriginal as ISO UTC', () => {
    expect(takenAtFrom({ DateTimeOriginal: new Date('2026-11-02T01:30:00Z') })).toBe('2026-11-02T01:30:00.000Z');
  });

  it('sends nothing when the tag is missing, not a date, or invalid', () => {
    expect(takenAtFrom(undefined)).toBeUndefined();
    expect(takenAtFrom(null)).toBeUndefined();
    expect(takenAtFrom({})).toBeUndefined();
    expect(takenAtFrom({ DateTimeOriginal: '2026:11:02 09:30:00' })).toBeUndefined();
    expect(takenAtFrom({ DateTimeOriginal: new Date('nope') })).toBeUndefined();
  });
});
