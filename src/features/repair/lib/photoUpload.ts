import type { Attachment, AttachmentKindInfo, AttachmentList } from '../../../lib/api/attachmentsApi';

// Spec 0017, AC-22 and AC-23: the browser side upload rules. The server stays the authority;
// these only save a phone from sending a file the server would refuse anyway.

const MB = 1024 * 1024;
/** Multer's hard cap on the server (AC-5). */
const HARD_CAP_MB = 25;

/** Longest edge the browser shrinks a photo to before upload (AC-22). */
export const SHRINK_MAX_EDGE = 2560;
export const SHRINK_QUALITY = 0.85;

/** Waits before the first and second automatic retry (AC-23). */
export const RETRY_DELAYS_MS = [2000, 6000] as const;

/** Same names the server's sniffer reports, so both sides word a refusal the same (AC-4). */
const TYPE_NAMES: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/heic': 'HEIC',
  'application/pdf': 'PDF',
};

/** The browser's type for a file, in the server's vocabulary. Empty means the browser doesn't know. */
export function normalizeType(type: string): string {
  const t = type.toLowerCase();
  if (t === 'image/jpg' || t === 'image/pjpeg') return 'image/jpeg';
  if (t === 'image/heif' || t === 'image/heic-sequence' || t === 'image/heif-sequence') return 'image/heic';
  return t;
}

/** The size a photo shrinks to: longest edge at most `maxEdge`, never enlarged, aspect kept. */
export function shrinkSize(width: number, height: number, maxEdge = SHRINK_MAX_EDGE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** `IMG_0042.HEIC` becomes `IMG_0042.jpg`; a name with no extension just gains one. */
export function jpegName(name: string): string {
  const base = name.replace(/\.[^./\\]*$/, '').trim();
  return `${base || 'photo'}.jpg`;
}

/**
 * The type half of the check, run on the file as chosen (before any shrink), so a GIF that the
 * browser could re-encode is still refused the way the server would refuse it. A file the browser
 * can't name (HEIC on many desktops) passes here and the server decides.
 */
export function typeProblem(file: { type: string }, kind: AttachmentKindInfo): string | null {
  const type = normalizeType(file.type);
  if (!type || kind.accepts.includes(type)) return null;
  return `${kind.label} accepts ${kind.acceptsLabel}. This file is ${TYPE_NAMES[type] ?? 'not a recognised type'}.`;
}

/** The size half, run on the bytes that will actually be sent (after the shrink). */
export function sizeProblem(file: { size: number }, maxFileMb: number): string | null {
  if (file.size > HARD_CAP_MB * MB) return `Files can be up to ${maxFileMb} MB. This one is over ${HARD_CAP_MB} MB.`;
  if (file.size > maxFileMb * MB) return `Files can be up to ${maxFileMb} MB. This one is ${(file.size / MB).toFixed(1)} MB.`;
  return null;
}

/** A network error (no status) or a 5xx is worth retrying; a 4xx is the server's answer (AC-23). */
export function isRetryable(status: number | undefined): boolean {
  return status === undefined || status >= 500;
}

/** Receipts plus other documents the ticket can still take, after the ones already queued (AC-27). */
export function documentRoomLeft(limits: AttachmentList['limits'], queued: number): number {
  return Math.max(0, limits.maxDocuments - limits.documentCount - queued);
}

/** Spec 0018: the two photo groups of the one strip. Before is how the truck arrived, After the proof. */
/** Spec 0024, AC-13: the Photos line's anchor, for the blocked reason link. */
export const PHOTOS_SECTION_ID = 'photos';

export type PhotoGroupKind = 'VEHICLE_PHOTO' | 'PROOF';

export const PHOTO_GROUP_LABELS: Record<PhotoGroupKind, string> = {
  VEHICLE_PHOTO: 'Before',
  PROOF: 'After',
};

export function isPhoto(attachment: Pick<Attachment, 'kind'>): boolean {
  return attachment.kind === 'VEHICLE_PHOTO' || attachment.kind === 'PROOF';
}

/** The group a new photo lands in: the server decides the same way, from when work started (AC-1). */
export function uploadGroup(workStarted: boolean): PhotoGroupKind {
  return workStarted ? 'PROOF' : 'VEHICLE_PHOTO';
}

/** One group's live count and limit, from the list's `limits` (AC-3). */
export function groupLimit(limits: AttachmentList['limits'], kind: PhotoGroupKind): { count: number; max: number } {
  return kind === 'PROOF'
    ? { count: limits.afterPhotoCount, max: limits.maxAfterPhotos }
    : { count: limits.vehiclePhotoCount, max: limits.maxVehiclePhotos };
}

export interface PhotoGroup {
  kind: PhotoGroupKind;
  label: string;
  photos: Attachment[];
  count: number;
  max: number;
}

/** Spec 0018, AC-16: Before then After until work starts, After first once it has. */
export function photoGroups(list: Pick<AttachmentList, 'items' | 'limits'>, workStarted: boolean): PhotoGroup[] {
  const order: PhotoGroupKind[] = workStarted ? ['PROOF', 'VEHICLE_PHOTO'] : ['VEHICLE_PHOTO', 'PROOF'];
  return order.map((kind) => ({
    kind,
    label: PHOTO_GROUP_LABELS[kind],
    photos: list.items.filter((item) => item.kind === kind),
    ...groupLimit(list.limits, kind),
  }));
}

/** Photos the group new uploads land in can still take, after the ones already queued (AC-21, spec 0018 AC-3). */
export function photoRoomLeft(limits: AttachmentList['limits'], queued: number, workStarted: boolean): number {
  const { count, max } = groupLimit(limits, uploadGroup(workStarted));
  return Math.max(0, max - count - queued);
}

/**
 * Spec 0018, AC-20: whether photos for this ticket are still waiting or uploading. A failed one
 * does not count; its retry after Start work lands in After, and the Move action fixes that.
 */
export function photosInFlight(items: readonly { kind: string; status: string }[]): boolean {
  return items.some((item) => item.kind === 'PHOTO' && (item.status === 'waiting' || item.status === 'uploading'));
}
