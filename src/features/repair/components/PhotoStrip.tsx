import { useId, useRef, useState, type DragEvent } from 'react';
import { Camera, ImageOff, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsTouchDevice } from '../../../hooks/useIsTouchDevice';
import type { Attachment } from '../../../lib/api/attachmentsApi';
import type { QueuedPhoto } from '../hooks/usePhotoUploadQueue';
import { photoAlt, photoMarks, photoName } from '../lib/photoCaption';
import type { PhotoGroup } from '../lib/photoUpload';
import { UploadQueueRow } from './UploadQueueRow';

/** The first thumbnails in each group are above the fold, so they load at once; the rest wait. */
const EAGER_THUMBS = 4;

interface PhotoStripProps {
  /** Before and After, in the order to show them (spec 0018, AC-16). */
  groups: PhotoGroup[];
  /** Photo uploads for this ticket. */
  queue: QueuedPhoto[];
  /** Whether the viewer may add photos here; false hides the buttons. */
  canAdd: boolean;
  /** Set when the group new photos land in is full: the buttons disable and say so (AC-21). */
  limitText: string | null;
  label: string;
  onAdd: (files: File[]) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onOpen: (photo: Attachment, thumb: HTMLButtonElement) => void;
  onRemove: (photo: Attachment) => void;
  /** First load error on a thumbnail: fetch fresh links once (AC-26). */
  onLinkError: () => Promise<unknown>;
}

function Thumb({
  photo,
  groupLabel,
  eager,
  onOpen,
  onRemove,
  onLinkError,
}: Pick<PhotoStripProps, 'onOpen' | 'onRemove' | 'onLinkError'> & { photo: Attachment; groupLabel: string; eager: boolean }) {
  const name = photoName(photo, groupLabel);
  // Spec 0018, AC-13 and AC-14: shown as text under the thumbnail, and read with its name (AC-19)
  const marks = photoMarks(photo);
  const fullName = photoAlt(photo, groupLabel);
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
        className="block overflow-hidden rounded-lg border border-border bg-muted outline-none transition-colors duration-150 hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
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
            alt={fullName}
            width={photo.width ?? undefined}
            height={photo.height ?? undefined}
            loading={eager ? 'eager' : 'lazy'}
            onError={onError}
            className="size-20 object-cover md:size-24"
          />
        )}
      </button>
      {marks.length > 0 && (
        // aria-hidden: the image's name already carries the same words
        <ul aria-hidden="true" className="mt-1 flex w-20 flex-col gap-1 md:w-24">
          {marks.map((mark) => (
            <li
              key={mark.id}
              className={cn(
                'rounded px-1 py-0.5 text-xs leading-tight font-medium',
                mark.id === 'takenBeforeWork' ? 'bg-status-pending-bg text-status-pending-fg' : 'bg-muted text-muted-strong',
              )}
            >
              {mark.short}
            </li>
          ))}
        </ul>
      )}
      {photo.canRemove && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Remove ${name.charAt(0).toLowerCase()}${name.slice(1)}`}
          onClick={() => onRemove(photo)}
          className="absolute -top-2 -right-2 size-7 rounded-full bg-card shadow-sm pointer-coarse:size-11"
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </li>
  );
}

/**
 * The ticket's one photo strip: the Before and After groups with their counts, one add control and
 * the uploads (spec 0017, AC-20 to AC-26; spec 0018, AC-16). The server files each photo.
 */
export function PhotoStrip({ groups, queue, canAdd, limitText, label, onAdd, onRetry, onDismiss, onOpen, onRemove, onLinkError }: PhotoStripProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLInputElement>(null);
  // AC-21: "Take photo" is for phones (a real camera), not for a narrow desktop window
  const isTouch = useIsTouchDevice();
  const [dragging, setDragging] = useState(false);
  const headingId = useId();
  const limitId = useId();
  const atLimit = limitText != null;
  const empty = groups.every((group) => group.photos.length === 0);

  // AC-20: with no photos, people who can't add see nothing
  if (empty && queue.length === 0 && !canAdd) return null;

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
      className={cn('flex flex-col gap-3 rounded-lg', dragging && 'bg-muted/50 ring-2 ring-primary ring-offset-2 ring-offset-card')}
    >
      {/* Spec 0024, AC-13: with no photos at all, one line instead of two empty groups */}
      {empty ? (
        <p className="text-sm text-muted-foreground">No photos yet</p>
      ) : (
        groups.map((group) => (
        <section key={group.kind} aria-labelledby={`${headingId}-${group.kind}`} className="flex flex-col gap-1">
          <h3 id={`${headingId}-${group.kind}`} className="flex items-baseline gap-2 text-sm font-semibold text-foreground">
            {group.label}
            <span className="text-xs font-normal text-muted-foreground tabular-nums">
              {group.count} of {group.max}
            </span>
          </h3>
          {group.photos.length > 0 ? (
            <ul className="flex flex-wrap gap-3 pt-2 pr-2">
              {group.photos.map((photo, index) => (
                <Thumb key={photo.id} photo={photo} groupLabel={group.label} eager={index < EAGER_THUMBS} onOpen={onOpen} onRemove={onRemove} onLinkError={onLinkError} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No {group.label.toLowerCase()} photos yet.</p>
          )}
        </section>
        ))
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-photo-add
                disabled={atLimit}
                aria-describedby={limitText ? limitId : undefined}
                onClick={() => cameraRef.current?.click()}
              >
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
            data-photo-choose
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => pick(event.target)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            // Spec 0024, AC-13: the blocked reason link focuses the first add button
            data-photo-add={isTouch ? undefined : true}
            disabled={atLimit}
            aria-describedby={limitText ? limitId : undefined}
            onClick={() => chooseRef.current?.click()}
          >
            <ImagePlus aria-hidden="true" />
            Choose photos
          </Button>
          {limitText ? (
            <span id={limitId} className="text-xs text-muted-foreground">
              {limitText}
            </span>
          ) : (
            dropEnabled && <span className="text-xs text-muted-foreground">or drop photos here</span>
          )}
        </div>
      )}
    </div>
  );
}
