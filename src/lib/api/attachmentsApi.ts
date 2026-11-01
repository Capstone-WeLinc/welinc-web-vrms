import api from './axios';

// Spec 0017: ticket attachments. Files open only through the signed links the list returns.

export type AttachmentKind = 'VEHICLE_PHOTO' | 'PROOF' | 'RECEIPT' | 'OTHER_DOCUMENT';

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
}

export interface AttachmentKindInfo {
  kind: AttachmentKind;
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
    maxVehiclePhotos: number;
    maxDocuments: number;
    vehiclePhotoCount: number;
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

export interface UploadOptions {
  kind: AttachmentKind;
  issueId?: string | null;
  /** 0 to 100, from the browser's upload progress. */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export async function uploadAttachment(
  ticketId: string,
  file: File,
  { kind, issueId, onProgress, signal }: UploadOptions,
): Promise<Attachment & { duplicate?: boolean }> {
  const body = new FormData();
  body.append('kind', kind);
  if (issueId) body.append('issueId', issueId);
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
