import { useState } from 'react';
import { AlertTriangle, ImageOff, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Attachment } from '../../../lib/api/attachmentsApi';
import { photoAlt, photoMarks, photoName } from '../lib/photoCaption';

interface PhotoThumbProps {
  photo: Attachment;
  groupLabel: string;
  onOpen: (photo: Attachment, thumb: HTMLButtonElement) => void;
  onRemove: (photo: Attachment) => void;
  /** First load error on a thumbnail: fetch fresh links once (spec 0017, AC-26). */
  onLinkError: () => Promise<unknown>;
}

/** Spec 0024, AC-13: one fixed 72px square, its evidence marks as a corner badge, and Remove at its corner. */
export function PhotoThumb({ photo, groupLabel, onOpen, onRemove, onLinkError }: PhotoThumbProps) {
  const name = photoName(photo, groupLabel);
  // Spec 0018, AC-13 and AC-14: a badge on the photo with the words in its tooltip, and read with its name (AC-19)
  const marks = photoMarks(photo);
  const fullName = photoAlt(photo, groupLabel);
  // 0: fine, 1: refetched once, 2: still failing (spec 0017, AC-26)
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
    <li className="relative w-18 shrink-0">
      <Tooltip open={marks.length > 0 ? undefined : false}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(event) => onOpen(photo, event.currentTarget)}
            className="relative block size-18 overflow-hidden rounded-lg border border-border bg-muted outline-none transition-colors duration-150 hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {errors === 2 ? (
              <span className="flex size-full flex-col items-center justify-center gap-1 p-1 text-center text-xs leading-tight text-muted-foreground">
                <ImageOff aria-hidden="true" className="size-4" />
                Could not load
                <span className="sr-only">{fullName}</span>
              </span>
            ) : (
              <img
                // A new key after the refetch makes the browser try the fresh link
                key={`${errors}:${photo.thumbnailUrl ?? photo.url}`}
                src={photo.thumbnailUrl ?? photo.url}
                alt={fullName}
                width={photo.width ?? undefined}
                height={photo.height ?? undefined}
                onError={onError}
                className="size-full object-cover"
              />
            )}
            {marks.length > 0 && (
              // aria-hidden: the image's name already carries the same words
              <span aria-hidden="true" className="absolute bottom-1 left-1 flex gap-0.5">
                {marks.map((mark) => (
                  <span
                    key={mark.id}
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full',
                      mark.id === 'takenBeforeWork' ? 'bg-status-pending-bg text-status-pending-fg' : 'bg-muted text-muted-strong',
                    )}
                  >
                    {mark.id === 'takenBeforeWork' ? <AlertTriangle className="size-3" /> : <Undo2 className="size-3" />}
                  </span>
                ))}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent className="flex flex-col">
          {marks.map((mark) => (
            <span key={mark.id}>{mark.short}</span>
          ))}
        </TooltipContent>
      </Tooltip>
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
