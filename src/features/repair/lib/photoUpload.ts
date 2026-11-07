import type { Attachment, AttachmentKindInfo, AttachmentList, UploadGroup } from '../../../lib/api/attachmentsApi';

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

/** Spec 0024, AC-13: the Photos card's anchor, for the blocked reason link. */
export const PHOTOS_SECTION_ID = 'photos';

/**
 * Spec 0024, AC-13: the hint at the top right of the Photos card while a photo holds the next move. The
 * move names one photo at a time, so there is only ever one hint; any other reason gives none.
 */
export function photoNeededHint(blockedBy: 'beforePhoto' | 'afterPhoto' | null): string | null {
  if (blockedBy === 'beforePhoto') return 'Before photo needed';
  if (blockedBy === 'afterPhoto') return 'After photo needed';
  return null;
}

/** Spec 0018: the two photo groups of the one strip. Before is how the truck arrived, After the proof. */
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

/** Spec 0024, AC-13: always Before then After, so the groups never swap when work starts. */
export function photoGroups(list: Pick<AttachmentList, 'items' | 'limits'>): PhotoGroup[] {
  const order: PhotoGroupKind[] = ['VEHICLE_PHOTO', 'PROOF'];
  return order.map((kind) => ({
    kind,
    label: PHOTO_GROUP_LABELS[kind],
    photos: list.items.filter((item) => item.kind === kind),
    ...groupLimit(list.limits, kind),
  }));
}

/** Spec 0024, AC-13: a group shows at most 3 thumbnails; with more, the first 2 and a "+N more" tile. */
export const GROUP_THUMBS = 3;

export function groupPreview<T>(photos: readonly T[]): { shown: T[]; more: number } {
  if (photos.length <= GROUP_THUMBS) return { shown: [...photos], more: 0 };
  const shown = photos.slice(0, GROUP_THUMBS - 1);
  return { shown, more: photos.length - shown.length };
}

/**
 * Spec 0024, AC-13: where the "+N more" tile opens the viewer: the group's third photo in the flat
 * Before then After list the viewer walks.
 */
export function moreViewerIndex(groups: readonly Pick<PhotoGroup, 'kind' | 'photos'>[], kind: PhotoGroupKind): number {
  let offset = 0;
  for (const group of groups) {
    if (group.kind === kind) return offset + GROUP_THUMBS - 1;
    offset += group.photos.length;
  }
  return -1;
}

/**
 * Spec 0024, value sourcing (drop zones): where a queued photo goes. `group` is the group it counts
 * against, decided when it is queued (advisory; the server decides); `named` sends that group with the
 * upload, which only a drop on a zone does (AC-21).
 */
export interface PhotoPlacement {
  group: PhotoGroupKind;
  named: boolean;
}

export function photoPlacement(dropped: PhotoGroupKind | undefined, workStarted: boolean): PhotoPlacement {
  return dropped ? { group: dropped, named: true } : { group: uploadGroup(workStarted), named: false };
}

/** The upload's `group` field for a group kind (spec 0024, AC-21). */
export function uploadGroupField(kind: PhotoGroupKind): UploadGroup {
  return kind === 'PROOF' ? 'AFTER' : 'BEFORE';
}

/**
 * Photos a group can still take, after the uploads queued for it that are still waiting or uploading
 * (AC-21, spec 0018 AC-3, spec 0024 value sourcing: each queued photo counts only against its own group).
 */
export function photoRoomLeft(
  limits: AttachmentList['limits'],
  queued: readonly { group?: PhotoGroupKind; status: string }[],
  target: PhotoGroupKind,
): number {
  const { count, max } = groupLimit(limits, target);
  return Math.max(0, max - count - queuedFor(queued, target));
}

/** Uploads still waiting or uploading for one group. */
export function queuedFor(queued: readonly { group?: PhotoGroupKind; status: string }[], target: PhotoGroupKind): number {
  return queued.filter((item) => item.group === target && (item.status === 'waiting' || item.status === 'uploading')).length;
}

/** `Before photos full (5 of 5)`: a group with no room, counting its queued uploads (AC-13). */
export function groupFullText(group: Pick<PhotoGroup, 'label' | 'max' | 'count'>, queued: number): string {
  return `${group.label} photos full (${Math.min(group.max, group.count + queued)} of ${group.max})`;
}

/**
 * Spec 0024, AC-13: what a screen reader hears while a thumbnail is dragged between groups. The ids
 * are the photo id (active) and the group kind (over). `photo` names a photo by group and position,
 * `full` says whether a group has no room left.
 */
export function photoDragAnnouncements(
  photo: (id: string) => { group: PhotoGroupKind; position: number } | undefined,
  full: (group: PhotoGroupKind) => boolean,
) {
  type Id = string | number;
  const label = (id: Id | undefined) => (id === 'VEHICLE_PHOTO' || id === 'PROOF' ? PHOTO_GROUP_LABELS[id] : undefined);
  const target = (activeId: Id, overId: Id | undefined): PhotoGroupKind | undefined => {
    const from = photo(String(activeId))?.group;
    return label(overId) && overId !== from ? (overId as PhotoGroupKind) : undefined;
  };
  return {
    onDragStart({ active }: { active: { id: Id } }) {
      const found = photo(String(active.id));
      return found ? `Picked up ${PHOTO_GROUP_LABELS[found.group].toLowerCase()} photo ${found.position}` : undefined;
    },
    onDragOver({ active, over }: { active: { id: Id }; over: { id: Id } | null }) {
      const to = target(active.id, over?.id);
      if (!to) return undefined;
      return full(to) ? `${PHOTO_GROUP_LABELS[to]} photos full` : `Over ${PHOTO_GROUP_LABELS[to]} photos`;
    },
    onDragEnd({ active, over }: { active: { id: Id }; over: { id: Id } | null }) {
      const to = target(active.id, over?.id);
      return to && !full(to) ? `Moved to ${PHOTO_GROUP_LABELS[to]}` : 'Not moved';
    },
    onDragCancel() {
      return 'Not moved';
    },
  };
}

/**
 * Spec 0018, AC-20: whether photos for this ticket are still waiting or uploading. A failed one
 * does not count; its retry after Start work lands in After, and the Move action fixes that.
 */
export function photosInFlight(items: readonly { kind: string; status: string }[]): boolean {
  return items.some((item) => item.kind === 'PHOTO' && (item.status === 'waiting' || item.status === 'uploading'));
}
