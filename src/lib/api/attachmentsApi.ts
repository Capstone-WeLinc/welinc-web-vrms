import api from './axios';

// Spec 0017: ticket attachments. Files open only through the signed links the list returns.

/** VEHICLE_PHOTO shows as Before and PROOF as After (spec 0018). */
export type AttachmentKind = 'VEHICLE_PHOTO' | 'PROOF' | 'RECEIPT' | 'OTHER_DOCUMENT';

/** What an upload sends: PHOTO lets the server pick Before or After from when work started (spec 0018, AC-1). */
export type UploadKind = 'PHOTO' | 'RECEIPT' | 'OTHER_DOCUMENT';

export interface Attachment {
  id: string;
  kind: AttachmentKind;
  issueId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  uploadedBy: { id: string; name: string };
  createdAt: string;
  url: string;
  thumbnailUrl: string | null;
  canRemove: boolean;
  /** Spec 0018, AC-11: the caller may move this photo between Before and After. */
  canMove: boolean;
  /** Spec 0018, AC-14: an After photo added after the ticket's latest Return to mechanic. */
  returnedAfter: boolean;
  /** Spec 0018, AC-13: sent to verifiers only; absent for everyone else. */
  takenAt?: string | null;
  /** Spec 0018, AC-13: an After photo the phone took well before work started. Verifiers only. */
  takenBeforeWork?: boolean;
  /** Spec 0024, AC-22: a Before photo uploaded after work started, so not protected. For everyone. */
  addedAfterWorkStarted?: boolean;
}

export interface AttachmentKindInfo {
  kind: UploadKind;
  label: string;
  /** The real types the server accepts, judged by the file's first bytes. */
  accepts: string[];
  acceptsLabel: string;
}

export interface AttachmentList {
  items: Attachment[];
  urlsExpireAt: string;
  limits: {
    maxFileMb: number;
    /** Before photos (spec 0018). */
    maxVehiclePhotos: number;
    maxAfterPhotos: number;
    maxDocuments: number;
    vehiclePhotoCount: number;
    afterPhotoCount: number;
    documentCount: number;
  };
  kinds: AttachmentKindInfo[];
  can: { addFiles: boolean; addDocuments: boolean };
}

export async function getAttachments(ticketId: string): Promise<AttachmentList> {
  // Quiet: the ticket page shows STORAGE_UNAVAILABLE in place of the photos (AC-3), not a toast
  const response = await api.get<AttachmentList>(`/vrms/repairs/${ticketId}/attachments`, { quiet: true });
  return response.data;
}

/** Spec 0024, AC-21: the photo group a drop on a zone names. */
export type UploadGroup = 'BEFORE' | 'AFTER';

export interface UploadOptions {
  kind: UploadKind;
  /** Spec 0024, AC-21: sent only for a drop on a zone; absent, the server picks from when work started. */
  group?: UploadGroup;
  /** Spec 0018, AC-12: when the phone took the photo, as ISO UTC, read before the shrink. */
  takenAt?: string;
  /** 0 to 100, from the browser's upload progress. */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export async function uploadAttachment(
  ticketId: string,
  file: File,
  { kind, group, takenAt, onProgress, signal }: UploadOptions,
): Promise<Attachment & { duplicate?: boolean }> {
  const body = new FormData();
  body.append('kind', kind);
  if (group) body.append('group', group);
  if (takenAt) body.append('takenAt', takenAt);
  body.append('file', file);
  const response = await api.post<Attachment & { duplicate?: boolean }>(`/vrms/repairs/${ticketId}/attachments`, body, {
    // The instance default is JSON, which would make axios turn the FormData into JSON;
    // the browser adds the multipart boundary itself
    headers: { 'Content-Type': 'multipart/form-data' },
    // The upload tile shows the server's message, so no global toast (AC-23)
    quiet: true,
    signal,
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return response.data;
}

export async function removeAttachment(ticketId: string, attachmentId: string): Promise<void> {
  await api.delete(`/vrms/repairs/${ticketId}/attachments/${attachmentId}`);
}

/** Spec 0018, AC-9: moves a photo to Before (VEHICLE_PHOTO) or After (PROOF). */
export async function moveAttachment(ticketId: string, attachmentId: string, kind: 'VEHICLE_PHOTO' | 'PROOF'): Promise<Attachment> {
  const response = await api.patch<Attachment>(`/vrms/repairs/${ticketId}/attachments/${attachmentId}`, { kind });
  return response.data;
}
