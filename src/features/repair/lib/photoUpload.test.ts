import { describe, expect, it } from 'vitest';
import type { Attachment, AttachmentKind, AttachmentKindInfo, AttachmentList } from '../../../lib/api/attachmentsApi';
import {
  documentRoomLeft,
  groupLimit,
  photoNeededHint,
  isRetryable,
  jpegName,
  normalizeType,
  groupPreview,
  moreViewerIndex,
  photoGroups,
  groupFullText,
  photoDragAnnouncements,
  photoPlacement,
  photoRoomLeft,
  queuedFor,
  uploadGroupField,
  photosInFlight,
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

describe('photoRoomLeft (AC-21, spec 0018 AC-3, spec 0024 value sourcing)', () => {
  const queued = (group: 'VEHICLE_PHOTO' | 'PROOF', status = 'waiting') => ({ group, status });

  it('counts only the uploads still in flight for the target group', () => {
    expect(photoRoomLeft(LIMITS, [], 'VEHICLE_PHOTO')).toBe(2);
    expect(photoRoomLeft(LIMITS, [queued('VEHICLE_PHOTO'), queued('VEHICLE_PHOTO', 'uploading')], 'VEHICLE_PHOTO')).toBe(0);
    expect(photoRoomLeft(LIMITS, Array.from({ length: 4 }, () => queued('VEHICLE_PHOTO')), 'VEHICLE_PHOTO')).toBe(0);
    expect(photoRoomLeft(LIMITS, [], 'PROOF')).toBe(1);
  });

  it('keeps mixed queued groups apart, and skips done and failed items', () => {
    const items = [queued('PROOF'), queued('VEHICLE_PHOTO', 'failed'), queued('VEHICLE_PHOTO', 'done'), queued('VEHICLE_PHOTO')];
    expect(photoRoomLeft(LIMITS, items, 'PROOF')).toBe(0);
    expect(photoRoomLeft(LIMITS, items, 'VEHICLE_PHOTO')).toBe(1);
    expect(queuedFor(items, 'VEHICLE_PHOTO')).toBe(1);
    // A document in the queue has no group and never counts
    expect(photoRoomLeft(LIMITS, [{ status: 'waiting' }], 'PROOF')).toBe(1);
  });
});

describe('photoPlacement and uploadGroupField (spec 0024, AC-21)', () => {
  it('names the group only for a drop on a zone', () => {
    expect(photoPlacement('VEHICLE_PHOTO', true)).toEqual({ group: 'VEHICLE_PHOTO', named: true });
    expect(photoPlacement(undefined, true)).toEqual({ group: 'PROOF', named: false });
    expect(photoPlacement(undefined, false)).toEqual({ group: 'VEHICLE_PHOTO', named: false });
  });

  it('maps a group kind to the upload field', () => {
    expect(uploadGroupField('VEHICLE_PHOTO')).toBe('BEFORE');
    expect(uploadGroupField('PROOF')).toBe('AFTER');
  });
});

describe('groupFullText (AC-13)', () => {
  it('counts queued uploads but never past the limit', () => {
    expect(groupFullText({ label: 'Before', count: 5, max: 5 }, 0)).toBe('Before photos full (5 of 5)');
    expect(groupFullText({ label: 'After', count: 9, max: 10 }, 3)).toBe('After photos full (10 of 10)');
  });
});

describe('photoDragAnnouncements (spec 0024, AC-13)', () => {
  const spots: Record<string, { group: 'VEHICLE_PHOTO' | 'PROOF'; position: number }> = {
    b2: { group: 'VEHICLE_PHOTO', position: 2 },
    a1: { group: 'PROOF', position: 1 },
  };
  const make = (fullGroups: string[] = []) =>
    photoDragAnnouncements(
      (id) => spots[id],
      (group) => fullGroups.includes(group),
    );

  it('names the picked up photo by group and position', () => {
    expect(make().onDragStart({ active: { id: 'b2' } })).toBe('Picked up before photo 2');
    expect(make().onDragStart({ active: { id: 'a1' } })).toBe('Picked up after photo 1');
  });

  it('speaks only over the other group, and says when it is full', () => {
    expect(make().onDragOver({ active: { id: 'b2' }, over: { id: 'PROOF' } })).toBe('Over After photos');
    expect(make().onDragOver({ active: { id: 'b2' }, over: { id: 'VEHICLE_PHOTO' } })).toBeUndefined();
    expect(make().onDragOver({ active: { id: 'b2' }, over: null })).toBeUndefined();
    expect(make(['PROOF']).onDragOver({ active: { id: 'b2' }, over: { id: 'PROOF' } })).toBe('After photos full');
  });

  it('says Moved only for a drop on the other group with room', () => {
    expect(make().onDragEnd({ active: { id: 'a1' }, over: { id: 'VEHICLE_PHOTO' } })).toBe('Moved to Before');
    expect(make().onDragEnd({ active: { id: 'a1' }, over: { id: 'PROOF' } })).toBe('Not moved');
    expect(make().onDragEnd({ active: { id: 'a1' }, over: null })).toBe('Not moved');
    expect(make(['VEHICLE_PHOTO']).onDragEnd({ active: { id: 'a1' }, over: { id: 'VEHICLE_PHOTO' } })).toBe('Not moved');
    expect(make().onDragCancel()).toBe('Not moved');
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
    canMove: false,
    returnedAfter: false,
  };
}

describe('photoGroups (spec 0018, AC-16; spec 0024, AC-13)', () => {
  const items = [attachment('b1', 'VEHICLE_PHOTO'), attachment('a1', 'PROOF'), attachment('r1', 'RECEIPT'), attachment('b2', 'VEHICLE_PHOTO')];

  it('shows Before then After, with each group’s count and limit', () => {
    const groups = photoGroups({ items, limits: LIMITS });
    expect(groups.map((g) => [g.label, g.photos.map((p) => p.id), g.count, g.max])).toEqual([
      ['Before', ['b1', 'b2'], 3, 5],
      ['After', ['a1'], 9, 10],
    ]);
  });

  it('never swaps the groups and never shows a document', () => {
    const groups = photoGroups({ items, limits: LIMITS });
    expect(groups.map((g) => g.label)).toEqual(['Before', 'After']);
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
    expect(photoCaption(tagged, new Map([['i1', 'Issue 1: Brakes']])).description).toBe('Before\nNov 1, 2026, 10:42 AM\nIssue 1: Brakes');
    expect(photoCaption(attachment('a1', 'PROOF'), new Map()).description).toBe('After\nNov 1, 2026, 10:42 AM');
  });
});

describe('groupPreview and moreViewerIndex (spec 0024, AC-13)', () => {
  it('shows every photo up to 3', () => {
    expect(groupPreview([])).toEqual({ shown: [], more: 0 });
    expect(groupPreview(['a', 'b', 'c'])).toEqual({ shown: ['a', 'b', 'c'], more: 0 });
  });

  it('shows the first 2 and counts the rest past 3', () => {
    expect(groupPreview(['a', 'b', 'c', 'd'])).toEqual({ shown: ['a', 'b'], more: 2 });
    expect(groupPreview(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toEqual({ shown: ['a', 'b'], more: 5 });
  });

  it('opens the viewer at the group’s third photo in the Before then After list', () => {
    const groups = [
      { kind: 'VEHICLE_PHOTO' as const, photos: [attachment('b1', 'VEHICLE_PHOTO'), attachment('b2', 'VEHICLE_PHOTO'), attachment('b3', 'VEHICLE_PHOTO'), attachment('b4', 'VEHICLE_PHOTO')] },
      { kind: 'PROOF' as const, photos: [attachment('a1', 'PROOF'), attachment('a2', 'PROOF'), attachment('a3', 'PROOF'), attachment('a4', 'PROOF')] },
    ];
    expect(moreViewerIndex(groups, 'VEHICLE_PHOTO')).toBe(2);
    expect(moreViewerIndex(groups, 'PROOF')).toBe(6);
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

describe('photosInFlight (spec 0018, AC-20)', () => {
  it('counts photos waiting or uploading, never documents or failed photos', () => {
    expect(photosInFlight([{ kind: 'PHOTO', status: 'waiting' }])).toBe(true);
    expect(photosInFlight([{ kind: 'PHOTO', status: 'uploading' }])).toBe(true);
    expect(photosInFlight([{ kind: 'PHOTO', status: 'failed' }])).toBe(false);
    expect(photosInFlight([{ kind: 'RECEIPT', status: 'uploading' }])).toBe(false);
    expect(photosInFlight([])).toBe(false);
  });
});

describe('photoNeededHint (spec 0024, AC-13)', () => {
  it('names the one photo the next move waits for', () => {
    expect(photoNeededHint('beforePhoto')).toBe('Before photo needed');
    expect(photoNeededHint('afterPhoto')).toBe('After photo needed');
  });
  it('gives no hint for a reason that is not a photo', () => {
    expect(photoNeededHint(null)).toBeNull();
  });
});
