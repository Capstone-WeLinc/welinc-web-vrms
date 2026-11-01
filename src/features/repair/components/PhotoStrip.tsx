import { useRef, useState, type DragEvent } from 'react';
import { Camera, ImageOff, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsTouchDevice } from '../../../hooks/useIsTouchDevice';
import type { Attachment } from '../../../lib/api/attachmentsApi';
import type { QueuedPhoto } from '../hooks/usePhotoUploadQueue';
import { formatManilaDateTime } from '../lib/photoCaption';
import { UploadQueueRow } from './UploadQueueRow';

interface PhotoStripProps {
  photos: Attachment[];
  /** Uploads headed for this strip. */
  queue: QueuedPhoto[];
  /** Whether the viewer may add photos here; false hides the buttons. */
  canAdd: boolean;
  /** Set when the ticket is at its photo limit: the buttons disable and say so (AC-21). */
  limitText: string | null;
  /** The ticket is at its photo limit: the buttons disable, whether or not this strip says so. */
  atLimit: boolean;
  /** "Photos" for the ticket, or "Photos for issue 2". */
  label: string;
  onAdd: (files: File[]) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onOpen: (photo: Attachment, thumb: HTMLButtonElement) => void;
  onRemove: (photo: Attachment) => void;
  /** First load error on a thumbnail: fetch fresh links once (AC-26). */
  onLinkError: () => Promise<unknown>;
}

function Thumb({ photo, onOpen, onRemove, onLinkError }: Pick<PhotoStripProps, 'onOpen' | 'onRemove' | 'onLinkError'> & { photo: Attachment }) {
  // 0: fine, 1: refetched once, 2: still failing (AC-26)
  const [errors, setErrors] = useState(0);

  const onError = () => {
    if (errors === 0) {
      setErrors(1);
      void onLinkError();
    } else {
      setErrors(2);
    }
  };

  return (
    <li className="relative">
      <button
        type="button"
        onClick={(event) => onOpen(photo, event.currentTarget)}
        className="block overflow-hidden rounded-lg border border-border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {errors === 2 ? (
          <span className="flex size-20 flex-col items-center justify-center gap-1 p-1 text-center text-xs text-muted-foreground md:size-24">
            <ImageOff aria-hidden="true" className="size-4" />
            Could not load photo
          </span>
        ) : (
          <img
            // A new key after the refetch makes the browser try the fresh link
            key={`${errors}:${photo.thumbnailUrl ?? photo.url}`}
            src={photo.thumbnailUrl ?? photo.url}
            alt={`Photo by ${photo.uploadedBy.name}, ${formatManilaDateTime(photo.createdAt)}`}
            width={photo.width ?? undefined}
            height={photo.height ?? undefined}
            loading="lazy"
            onError={onError}
            className="size-20 object-cover md:size-24"
          />
        )}
      </button>
      {photo.canRemove && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Remove photo by ${photo.uploadedBy.name}, ${formatManilaDateTime(photo.createdAt)}`}
          onClick={() => onRemove(photo)}
          className="absolute -top-2 -right-2 size-7 rounded-full bg-card shadow-sm pointer-coarse:size-11"
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </li>
  );
}

/** Thumbnails for one place on the ticket, the add buttons and its uploads (spec 0017, AC-20 to AC-26). */
export function PhotoStrip({ photos, queue, canAdd, limitText, atLimit, label, onAdd, onRetry, onDismiss, onOpen, onRemove, onLinkError }: PhotoStripProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLInputElement>(null);
  // AC-21: "Take photo" is for phones (a real camera), not for a narrow desktop window
  const isTouch = useIsTouchDevice();
  const [dragging, setDragging] = useState(false);

  // AC-20: with no photos, people who can't add see nothing
  if (photos.length === 0 && queue.length === 0 && !canAdd) return null;

  const dropEnabled = canAdd && !isTouch && !atLimit;

  const pick = (input: HTMLInputElement) => {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length) onAdd(files);
  };

  const dropHandlers = dropEnabled
    ? {
        onDragOver: (event: DragEvent) => {
          if (!event.dataTransfer.types.includes('Files')) return;
          event.preventDefault();
          setDragging(true);
        },
        onDragLeave: (event: DragEvent) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        },
        onDrop: (event: DragEvent) => {
          event.preventDefault();
          setDragging(false);
          const files = Array.from(event.dataTransfer.files);
          if (files.length) onAdd(files);
        },
      }
    : {};

  return (
    <div
      role="group"
      aria-label={label}
      {...dropHandlers}
      className={cn('flex flex-col gap-2 rounded-lg', dragging && 'bg-muted/50 ring-2 ring-primary ring-offset-2 ring-offset-card')}
    >
      {photos.length > 0 ? (
        <ul className="flex flex-wrap gap-3 pt-2 pr-2">
          {photos.map((photo) => (
            <Thumb key={photo.id} photo={photo} onOpen={onOpen} onRemove={onRemove} onLinkError={onLinkError} />
          ))}
        </ul>
      ) : (
        queue.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No photos yet.{!atLimit && ' Add one so others can see the problem.'}{dropEnabled && ' You can also drop photos here.'}
          </p>
        )
      )}

      {/* The live region stays mounted so the first upload is announced too */}
      <div aria-live="polite">
        {queue.length > 0 && (
          <ul className="flex flex-col gap-2">
            {queue.map((item) => (
              <UploadQueueRow key={item.id} item={item} onRetry={() => onRetry(item.id)} onDismiss={() => onDismiss(item.id)} />
            ))}
          </ul>
        )}
      </div>

      {canAdd && (
        <div className="flex flex-wrap items-center gap-2">
          {isTouch && (
            <>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => pick(event.target)}
              />
              <Button type="button" variant="outline" size="sm" disabled={atLimit} onClick={() => cameraRef.current?.click()}>
                <Camera aria-hidden="true" />
                Take photo
              </Button>
            </>
          )}
          <input
            ref={chooseRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => pick(event.target)}
          />
          <Button type="button" variant="outline" size="sm" disabled={atLimit} onClick={() => chooseRef.current?.click()}>
            <ImagePlus aria-hidden="true" />
            Choose photos
          </Button>
          {limitText && <span className="text-xs text-muted-foreground">{limitText}</span>}
        </div>
      )}
    </div>
  );
}
