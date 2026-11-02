import type { Attachment } from '../../../lib/api/attachmentsApi';

// The app's fixed zone (spec 0017, value sourcing: viewer caption)
const MANILA = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** `Nov 1, 2026, 10:42 AM`, in Asia/Manila whatever the device's zone. */
export function formatManilaDateTime(value: string | Date): string {
  return MANILA.format(new Date(value));
}

export interface PhotoMark {
  id: 'takenBeforeWork' | 'returnedAfter';
  /** The chip on the thumbnail. */
  short: string;
  /** The line in the viewer. */
  long: string;
}

/**
 * Spec 0018: the evidence marks on a photo. "Taken before work started" reaches verifiers only
 * (the server leaves the flag out for everyone else, AC-13); "Added after return" is for everyone (AC-14).
 */
export function photoMarks(photo: Pick<Attachment, 'takenBeforeWork' | 'returnedAfter'>): PhotoMark[] {
  const marks: PhotoMark[] = [];
  if (photo.takenBeforeWork) {
    marks.push({ id: 'takenBeforeWork', short: 'Taken before work started', long: 'Taken before work started' });
  }
  if (photo.returnedAfter) {
    marks.push({ id: 'returnedAfter', short: 'Added after return', long: 'Added after the ticket was returned to the mechanic' });
  }
  return marks;
}

/**
 * The viewer caption: uploader as the title, then the group (Before or After, spec 0018), when, and
 * the issue's name when an older photo was tagged (AC-24). Each evidence mark adds a line under it.
 */
export function photoCaption(photo: Attachment, issueNames: Map<string, string>): { title: string; description: string } {
  const issue = photo.issueId ? issueNames.get(photo.issueId) : undefined;
  const group = photo.kind === 'PROOF' ? 'After' : 'Before';
  const when = `${group} · ${formatManilaDateTime(photo.createdAt)}`;
  const lines = [issue ? `${when} · ${issue}` : when, ...photoMarks(photo).map((mark) => mark.long)];
  return { title: photo.uploadedBy.name, description: lines.join('\n') };
}
