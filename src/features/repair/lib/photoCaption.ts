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

/** The viewer caption: uploader as the title, then when, then the issue's name when tagged (AC-24). */
export function photoCaption(photo: Attachment, issueNames: Map<string, string>): { title: string; description: string } {
  const issue = photo.issueId ? issueNames.get(photo.issueId) : undefined;
  const when = formatManilaDateTime(photo.createdAt);
  return { title: photo.uploadedBy.name, description: issue ? `${when} · ${issue}` : when };
}
