import { describe, expect, it } from 'vitest';
import type { AttachmentKindInfo } from '../../../lib/api/attachmentsApi';
import { isRetryable, jpegName, normalizeType, photoRoomLeft, shrinkSize, sizeProblem, typeProblem } from './photoUpload';
import { formatManilaDateTime } from './photoCaption';

const PHOTO: AttachmentKindInfo = {
  kind: 'VEHICLE_PHOTO',
  label: 'Vehicle photo',
  accepts: ['image/jpeg', 'image/png', 'image/heic'],
  acceptsLabel: 'JPEG, PNG or HEIC photos',
};
const MB = 1024 * 1024;

describe('shrinkSize (spec 0017, AC-22)', () => {
  it('caps the longest edge at 2560 and keeps the aspect', () => {
    expect(shrinkSize(8064, 6048)).toEqual({ width: 2560, height: 1920 });
    expect(shrinkSize(3024, 4032)).toEqual({ width: 1920, height: 2560 });
  });
  it('never enlarges', () => {
    expect(shrinkSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe('jpegName', () => {
  it('swaps the extension for .jpg', () => {
    expect(jpegName('IMG_0042.HEIC')).toBe('IMG_0042.jpg');
    expect(jpegName('truck.front.png')).toBe('truck.front.jpg');
    expect(jpegName('noext')).toBe('noext.jpg');
    expect(jpegName('.png')).toBe('photo.jpg');
  });
});

describe('typeProblem (AC-4 wording)', () => {
  it('passes accepted types, HEIF as HEIC, and files the browser cannot name', () => {
    expect(typeProblem({ type: 'image/jpeg' }, PHOTO)).toBeNull();
    expect(typeProblem({ type: 'image/heif' }, PHOTO)).toBeNull();
    expect(typeProblem({ type: '' }, PHOTO)).toBeNull();
  });
  it('refuses others with the server message', () => {
    expect(typeProblem({ type: 'application/pdf' }, PHOTO)).toBe('Vehicle photo accepts JPEG, PNG or HEIC photos. This file is PDF.');
    expect(typeProblem({ type: 'image/gif' }, PHOTO)).toBe('Vehicle photo accepts JPEG, PNG or HEIC photos. This file is not a recognised type.');
  });
  it('normalizes browser aliases', () => {
    expect(normalizeType('image/JPG')).toBe('image/jpeg');
  });
});

describe('sizeProblem (AC-5 wording)', () => {
  it('passes files at the limit', () => {
    expect(sizeProblem({ size: 10 * MB }, 10)).toBeNull();
  });
  it('reports the size to one decimal', () => {
    expect(sizeProblem({ size: 12.34 * MB }, 10)).toBe('Files can be up to 10 MB. This one is 12.3 MB.');
  });
  it('says over 25 MB past the hard cap', () => {
    expect(sizeProblem({ size: 30 * MB }, 10)).toBe('Files can be up to 10 MB. This one is over 25 MB.');
  });
});

describe('isRetryable (AC-23)', () => {
  it('retries network errors and 5xx only', () => {
    expect(isRetryable(undefined)).toBe(true);
    expect(isRetryable(502)).toBe(true);
    expect(isRetryable(409)).toBe(false);
    expect(isRetryable(429)).toBe(false);
  });
});

describe('photoRoomLeft (AC-21)', () => {
  const limits = { maxFileMb: 10, maxVehiclePhotos: 5, maxDocuments: 20, vehiclePhotoCount: 3, documentCount: 0 };
  it('counts uploads still in flight', () => {
    expect(photoRoomLeft(limits, 0)).toBe(2);
    expect(photoRoomLeft(limits, 2)).toBe(0);
    expect(photoRoomLeft(limits, 4)).toBe(0);
  });
});

describe('formatManilaDateTime (AC-24 caption)', () => {
  it('shows Asia/Manila time whatever the device zone', () => {
    expect(formatManilaDateTime('2026-11-01T02:42:00Z')).toBe('Nov 1, 2026, 10:42 AM');
  });
});
