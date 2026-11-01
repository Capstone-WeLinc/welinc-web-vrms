import { useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Attachment } from '../../../lib/api/attachmentsApi';
import { formatDateTime } from '../../../lib/utils/format';

interface PhotoStripProps {
  photos: Attachment[];
  /** Whether the viewer may add photos here; false hides the buttons. */
  canAdd: boolean;
  /** "Photos" for the ticket, or "Photos for issue 2". */
  label: string;
  busy: boolean;
  onAdd: (files: File[]) => void;
}

/** Thumbnails for one place on the ticket, plus the add button (spec 0017, AC-20 and AC-21). */
export function PhotoStrip({ photos, canAdd, label, busy, onAdd }: PhotoStripProps) {
  const chooseRef = useRef<HTMLInputElement>(null);

  // AC-20: with no photos, people who can't add see nothing
  if (photos.length === 0 && !canAdd) return null;

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      {photos.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <li key={photo.id}>
              <a
                href={photo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border border-border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <img
                  src={photo.thumbnailUrl ?? photo.url}
                  alt={`Photo by ${photo.uploadedBy.name}, ${formatDateTime(photo.createdAt)}`}
                  width={photo.width ?? undefined}
                  height={photo.height ?? undefined}
                  loading="lazy"
                  className="size-20 object-cover md:size-24"
                />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No photos yet. Add one so others can see the problem.</p>
      )}

      {canAdd && (
        <div className="flex flex-wrap gap-2">
          <input
            ref={chooseRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = '';
              if (files.length) onAdd(files);
            }}
          />
          <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => chooseRef.current?.click()}>
            <ImagePlus aria-hidden="true" />
            Choose photos
          </Button>
        </div>
      )}
    </div>
  );
}
