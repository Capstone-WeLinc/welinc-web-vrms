/**
 * Spec 0018, AC-12: when the phone took the photo (EXIF `DateTimeOriginal`), read from the original
 * file before the shrink drops its metadata. exifr reads the wall time in the device's zone; the
 * result goes up as ISO UTC. Anything unreadable gives undefined and never stops the upload.
 * exifr loads on the first photo only, so it stays out of the page's first download.
 */
export async function readTakenAt(file: Blob): Promise<string | undefined> {
  try {
    const { default: exifr } = await import('exifr');
    const tags: unknown = await exifr.parse(file, { pick: ['DateTimeOriginal'] });
    return takenAtFrom(tags);
  } catch {
    return undefined;
  }
}

/** The ISO string of a parsed `DateTimeOriginal`, or undefined when it is missing or not a valid date. */
export function takenAtFrom(tags: unknown): string | undefined {
  if (!tags || typeof tags !== 'object') return undefined;
  const value = (tags as { DateTimeOriginal?: unknown }).DateTimeOriginal;
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : undefined;
}
