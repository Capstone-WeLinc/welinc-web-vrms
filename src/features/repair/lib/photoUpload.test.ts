import { describe, expect, it } from 'vitest';
import type { Attachment, AttachmentKind, AttachmentKindInfo, AttachmentList } from '../../../lib/api/attachmentsApi';
import {
  documentRoomLeft,
  groupLimit,
  isRetryable,
  jpegName,
  normalizeType,
  photoGroups,
  photoRoomLeft,
  shrinkSize,
  sizeProblem,
  typeProblem,
  uploadGroup,
} from './photoUpload';
import { formatManilaDateTime, photoCaption } from './photoCaption';

const PHOTO: AttachmentKindInfo = {
  kind: 'PHOTO',
  label: 'Photo',
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
    expect(typeProblem({ type: 'application/pdf' }, PHOTO)).toBe('Photo accepts JPEG, PNG or HEIC photos. This file is PDF.');
    expect(typeProblem({ type: 'image/gif' }, PHOTO)).toBe('Photo accepts JPEG, PNG or HEIC photos. This file is not a recognised type.');
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

const LIMITS: AttachmentList['limits'] = {
  maxFileMb: 10,
  maxVehiclePhotos: 5,
  maxAfterPhotos: 10,
  maxDocuments: 20,
  vehiclePhotoCount: 3,
  afterPhotoCount: 9,
  documentCount: 0,
};

describe('photoRoomLeft (AC-21, spec 0018 AC-3)', () => {
  it('counts uploads still in flight against the Before group before work starts', () => {
    expect(photoRoomLeft(LIMITS, 0, false)).toBe(2);
    expect(photoRoomLeft(LIMITS, 2, false)).toBe(0);
    expect(photoRoomLeft(LIMITS, 4, false)).toBe(0);
  });
  it('counts against the After group once work has started', () => {
    expect(photoRoomLeft(LIMITS, 0, true)).toBe(1);
    expect(photoRoomLeft(LIMITS, 1, true)).toBe(0);
  });
});

function attachment(id: string, kind: AttachmentKind): Attachment {
  return {
    id,
    kind,
    issueId: null,
    fileName: `${id}.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 1,
    width: 1,
    height: 1,
    uploadedBy: { id: 'u', name: 'Jo' },
    createdAt: '2026-11-01T02:42:00Z',
    url: 'u',
    thumbnailUrl: null,
    canRemove: false,
  };
}

describe('photoGroups (spec 0018, AC-16)', () => {
  const items = [attachment('b1', 'VEHICLE_PHOTO'), attachment('a1', 'PROOF'), attachment('r1', 'RECEIPT'), attachment('b2', 'VEHICLE_PHOTO')];

  it('shows Before first until work starts, with each group’s count and limit', () => {
    const groups = photoGroups({ items, limits: LIMITS }, false);
    expect(groups.map((g) => [g.label, g.photos.map((p) => p.id), g.count, g.max])).toEqual([
      ['Before', ['b1', 'b2'], 3, 5],
      ['After', ['a1'], 9, 10],
    ]);
  });

  it('shows After first once work has started, and never a document', () => {
    const groups = photoGroups({ items, limits: LIMITS }, true);
    expect(groups.map((g) => g.label)).toEqual(['After', 'Before']);
    expect(groups.flatMap((g) => g.photos).some((p) => p.kind === 'RECEIPT')).toBe(false);
  });

  it('files new photos the way the server does (AC-1)', () => {
    expect(uploadGroup(false)).toBe('VEHICLE_PHOTO');
    expect(uploadGroup(true)).toBe('PROOF');
    expect(groupLimit(LIMITS, 'PROOF')).toEqual({ count: 9, max: 10 });
  });
});

describe('photoCaption (spec 0018)', () => {
  it('names the group, and still shows an older photo’s issue tag', () => {
    const tagged = { ...attachment('b1', 'VEHICLE_PHOTO'), issueId: 'i1' };
    expect(photoCaption(tagged, new Map([['i1', 'Issue 1: Brakes']])).description).toBe('Before · Nov 1, 2026, 10:42 AM · Issue 1: Brakes');
    expect(photoCaption(attachment('a1', 'PROOF'), new Map()).description).toBe('After · Nov 1, 2026, 10:42 AM');
  });
});

describe('documentRoomLeft (AC-27)', () => {
  const limits = { ...LIMITS, maxDocuments: 3, vehiclePhotoCount: 5, documentCount: 1 };
  it('counts documents in flight and ignores photos', () => {
    expect(documentRoomLeft(limits, 0)).toBe(2);
    expect(documentRoomLeft(limits, 2)).toBe(0);
    expect(documentRoomLeft({ ...limits, documentCount: 4 }, 0)).toBe(0);
  });
});

describe('typeProblem for documents (AC-4, AC-27)', () => {
  const OTHER: AttachmentKindInfo = { kind: 'OTHER_DOCUMENT', label: 'Other document', accepts: ['application/pdf'], acceptsLabel: 'PDF files' };
  it('lets a PDF through and refuses a photo the way the server words it', () => {
    expect(typeProblem({ type: 'application/pdf' }, OTHER)).toBeNull();
    expect(typeProblem({ type: 'image/jpeg' }, OTHER)).toBe('Other document accepts PDF files. This file is JPEG.');
  });
});

describe('formatManilaDateTime (AC-24 caption)', () => {
  it('shows Asia/Manila time whatever the device zone', () => {
    expect(formatManilaDateTime('2026-11-01T02:42:00Z')).toBe('Nov 1, 2026, 10:42 AM');
  });
});
