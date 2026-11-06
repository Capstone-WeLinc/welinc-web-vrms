import { lazy, Suspense, useEffect, useRef, useState, type DragEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DetailSection } from '../../../components/shared/DetailSection';
import { confirm } from '../../../components/shared/confirm/confirm';
import { useToast } from '../../../context/toast';
import { useIsTouchDevice } from '../../../hooks/useIsTouchDevice';
import { moveAttachment, removeAttachment, type Attachment } from '../../../lib/api/attachmentsApi';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import type { RepairTicket } from '../../../types';
import { useTicketFiles } from '../hooks/ticketFiles';
import { stripSystem } from '../lib/issueRow';
import {
  GROUP_THUMBS,
  groupLimit,
  groupPreview,
  isPhoto,
  moreViewerIndex,
  PHOTO_GROUP_LABELS,
  type PhotoGroup,
  photoGroups,
  photoNeededHint,
  photoRoomLeft,
  PHOTOS_SECTION_ID,
  uploadGroup,
} from '../lib/photoUpload';
import { PhotoThumb } from './PhotoThumb';
import { UploadQueueRow } from './UploadQueueRow';

// Spec 0017, AC-24: the viewer and its library load on first open only
const PhotoViewer = lazy(() => import('./PhotoViewer').then((m) => ({ default: m.PhotoViewer })));

/** A 72px slot: the add tile and the "+N more" tile share the thumbnail's size (AC-13). */
const tile =
  'flex size-18 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring';

interface PhotosCardProps {
  ticket: RepairTicket;
  /** The photo the next move waits for, from the move's `blockedBy`; the card header shows its hint. */
  blockedBy: 'beforePhoto' | 'afterPhoto' | null;
}

/**
 * Spec 0024, AC-13: the ticket's photos as their own card after the Issues card. Before then After,
 * never swapping; each group one row of at most 4 slots (3 thumbnails, or 2 and "+N more", then the
 * add tile in the group new photos land in). The server files each photo (spec 0018); the card only
 * mirrors its rule to place the tile.
 */
export function PhotosCard({ ticket, blockedBy }: PhotosCardProps) {
  const { showToast } = useToast();
  const { attachments, queue } = useTicketFiles();
  const isTouch = useIsTouchDevice();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  /** dragenter minus dragleave over the card and its children, so moving over a thumbnail never flickers. */
  const depth = useRef(0);
  /** Index into `photos` while the viewer is open, else -1 (spec 0017, AC-24). */
  const [viewerIndex, setViewerIndex] = useState(-1);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  /** The photo whose move is in flight (spec 0018, AC-9). */
  const [movingId, setMovingId] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  /** Photo uploads only; documents queue in the Documents card. */
  const photoQueue = queue.items.filter((item) => item.kind === 'PHOTO');
  const issues = ticket.issues ?? [];
  const list = attachments.list;
  const workStarted = ticket.workStartedAt != null;
  const targetKind = uploadGroup(workStarted);
  const target = PHOTO_GROUP_LABELS[targetKind];
  const photoKind = list?.kinds.find((k) => k.kind === 'PHOTO');
  const canAdd = list != null && list.can.addFiles && photoKind != null;
  const groups = list ? photoGroups(list) : [];
  /** Every live photo, Before then After: the viewer walks all of them. */
  const photos = groups.flatMap((group) => group.photos);
  const inFlight = photoQueue.filter((item) => item.status === 'waiting' || item.status === 'uploading').length;
  const room = list ? photoRoomLeft(list.limits, inFlight, workStarted) : 0;
  const targetLimit = list ? groupLimit(list.limits, targetKind) : null;
  const fullText =
    canAdd && targetLimit && room === 0
      ? `${target} photos full (${Math.min(targetLimit.max, targetLimit.count + inFlight)} of ${targetLimit.max})`
      : null;
  const issueNames = new Map(issues.map((issue, index) => [issue.id, `Issue ${index + 1}: ${stripSystem(issue.description)}`]));
  const hint = photoNeededHint(blockedBy);
  // AC-13: no drop handling for people who can't add; touch screens fire no drag events anyway
  const dropEnabled = canAdd && !isTouch;

  /** Queue what fits in the group new photos land in; the queue uploads one at a time (spec 0017, AC-21, AC-23). */
  const addPhotos = (files: File[]) => {
    if (!list || !photoKind || !targetLimit) return;
    const taken = files.slice(0, room);
    const word = target.toLowerCase();
    if (taken.length < files.length) {
      showToast(
        room === 0
          ? `This ticket already has ${targetLimit.max} ${word} photos, the most allowed.`
          : `Only ${room} more ${word} ${room === 1 ? 'photo fits' : 'photos fit'} on this ticket, so the rest were left out.`,
        'error',
      );
    }
    if (taken.length) queue.add(taken, photoKind, list.limits.maxFileMb);
  };

  /** Spec 0017, AC-25: ask first, then the photo leaves the card and the viewer. */
  const removePhoto = async (photo: Attachment) => {
    const ok = await confirm({
      title: 'Remove this photo?',
      description: 'It disappears from the ticket for everyone.',
      confirmText: 'Remove',
      tone: 'destructive',
    });
    if (!ok) return;
    try {
      await removeAttachment(ticket.id, photo.id);
      const fresh = await attachments.reload();
      const left = fresh?.items.filter(isPhoto).length ?? 0;
      setViewerIndex((i) => (i >= left ? left - 1 : i));
      showToast('Photo removed', 'success');
    } catch (err) {
      // A 403 already showed the fixed denied toast
      if (getApiErrorStatus(err) !== 403) showToast(getApiErrorMessage(err, 'Couldn’t remove the photo. Try again.'), 'error');
    }
  };

  /** Spec 0018, AC-9: the viewer's Move. The card regroups; the viewer stays on the moved photo. */
  const movePhoto = async (photo: Attachment) => {
    const to = photo.kind === 'PROOF' ? 'VEHICLE_PHOTO' : 'PROOF';
    setMovingId(photo.id);
    try {
      await moveAttachment(ticket.id, photo.id, to);
      const fresh = await attachments.reload();
      if (fresh) setViewerIndex(photoGroups(fresh).flatMap((group) => group.photos).findIndex((p) => p.id === photo.id));
      showToast(`Photo moved to ${PHOTO_GROUP_LABELS[to]}.`, 'success');
    } catch (err) {
      // A 403 already showed the fixed denied toast; a 409 (group full, ticket finished) says why
      if (getApiErrorStatus(err) !== 403) showToast(getApiErrorMessage(err, 'Couldn’t move the photo. Try again.'), 'error');
      void attachments.reload();
    } finally {
      setMovingId(null);
    }
  };

  const openViewer = (index: number, from: HTMLButtonElement) => {
    opener.current = from;
    setViewerLoaded(true);
    setViewerIndex(index);
  };

  const pick = (el: HTMLInputElement) => {
    const files = Array.from(el.files ?? []);
    el.value = '';
    if (files.length) addPhotos(files);
  };

  // A drag cancelled with Escape or dropped elsewhere never reaches the card's own dragleave
  useEffect(() => {
    if (!dragging) return;
    const reset = () => {
      depth.current = 0;
      setDragging(false);
    };
    window.addEventListener('dragend', reset);
    window.addEventListener('drop', reset);
    return () => {
      window.removeEventListener('dragend', reset);
      window.removeEventListener('drop', reset);
    };
  }, [dragging]);

  /** AC-13: only a drag that carries files shows the overlay; text and links pass by. */
  const carriesFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files');
  const dropHandlers = dropEnabled
    ? {
        onDragEnter: (event: DragEvent) => {
          if (!carriesFiles(event)) return;
          event.preventDefault();
          depth.current += 1;
          setDragging(true);
        },
        onDragOver: (event: DragEvent) => {
          if (!carriesFiles(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = room > 0 ? 'copy' : 'none';
        },
        onDragLeave: (event: DragEvent) => {
          if (!carriesFiles(event)) return;
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragging(false);
        },
        onDrop: (event: DragEvent) => {
          if (!carriesFiles(event)) return;
          event.preventDefault();
          depth.current = 0;
          setDragging(false);
          // A full group adds nothing: the overlay already said so
          const files = Array.from(event.dataTransfer.files);
          if (files.length && room > 0) addPhotos(files);
        },
      }
    : {};

  // Spec 0017, AC-20: with no photos, people who can't add see no card at all
  if (list && photos.length === 0 && photoQueue.length === 0 && !canAdd) return null;

  const renderGroup = (group: PhotoGroup) => {
    const { shown, more } = groupPreview(group.photos);
    const hasTile = canAdd && group.kind === targetKind && !fullText;
    const word = group.label.toLowerCase();
    return (
      <section key={group.kind} aria-label={`${group.label} photos`} className="flex min-w-0 flex-col gap-2">
        <h3 className="flex items-baseline gap-2 text-sm font-semibold text-foreground">
          {group.label}
          {/* The limit is for people who add; everyone else sees the photos only */}
          {canAdd && (
            <span className="text-xs font-normal text-muted-foreground tabular-nums">
              {group.count} of {group.max}
            </span>
          )}
        </h3>
        {shown.length === 0 && !hasTile ? (
          <p className="text-sm text-muted-foreground">None yet</p>
        ) : (
          // One row, never wrapping: at most 4 slots of 72px
          <ul className="flex gap-2 pt-2">
            {shown.map((photo) => (
              <PhotoThumb
                key={photo.id}
                photo={photo}
                groupLabel={group.label}
                onOpen={(p, thumb) => openViewer(photos.findIndex((x) => x.id === p.id), thumb)}
                onRemove={(p) => void removePhoto(p)}
                onLinkError={attachments.reload}
              />
            ))}
            {more > 0 && (
              <li className="shrink-0">
                <button
                  type="button"
                  aria-label={`Show ${more} more ${word} photos`}
                  onClick={(event) => openViewer(moreViewerIndex(groups, group.kind), event.currentTarget)}
                  className={cn(tile, 'border border-border bg-muted text-foreground hover:border-primary')}
                >
                  <span className="text-base font-semibold tabular-nums">+{more}</span>
                  more
                </button>
              </li>
            )}
            {hasTile && (
              <li className="shrink-0">
                {/* AC-13: pointer devices learn about dropping from the tile's tooltip */}
                <Tooltip open={isTouch ? false : undefined}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-photo-add
                      aria-label={`Add ${word} photo`}
                      onClick={() => input.current?.click()}
                      className={cn(tile, 'border border-dashed border-input text-muted-strong hover:border-primary hover:text-foreground')}
                    >
                      <Plus aria-hidden="true" className="size-5" />
                      Add
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Add {word} photo, or drop files on this card</TooltipContent>
                </Tooltip>
              </li>
            )}
          </ul>
        )}
        {canAdd && group.kind === targetKind && fullText && <p className="text-xs text-muted-foreground">{fullText}</p>}
      </section>
    );
  };

  const loading = !list && attachments.state === 'loading';

  return (
    <DetailSection
      title="Photos"
      id={PHOTOS_SECTION_ID}
      // AC-13: below the sticky header when the blocked link scrolls here, as the issue rows
      className={cn('relative @container scroll-mt-24', dragging && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}
      action={hint ? <span className="text-sm font-medium text-warning-text">{hint}</span> : null}
      {...dropHandlers}
    >
      {viewerLoaded && (
        <Suspense fallback={null}>
          <PhotoViewer
            photos={photos}
            index={viewerIndex}
            issueNames={issueNames}
            onIndexChange={setViewerIndex}
            onLinkError={attachments.reload}
            onClosed={() => opener.current?.focus()}
            onMove={(photo) => void movePhoto(photo)}
            movingId={movingId}
          />
        </Suspense>
      )}
      {canAdd && (
        // Driven by the add tile; no `capture`, so a phone offers its camera or its gallery
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => pick(event.target)}
        />
      )}

      {attachments.state === 'error' && !list ? (
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          {attachments.errorMessage}
          <Button type="button" variant="link" size="sm" className="h-auto min-h-11 px-0 md:min-h-0" onClick={attachments.retry}>
            Try again
          </Button>
        </p>
      ) : (
        // Side by side once the card fits both rows (about 650px inside), Before on the left; stacked below
        <div className="grid gap-4 @2xl:grid-cols-2 @2xl:gap-6">
          {loading
            ? (['VEHICLE_PHOTO', 'PROOF'] as const).map((kind) => (
                <section key={kind} aria-label={`${PHOTO_GROUP_LABELS[kind]} photos`} aria-busy="true" className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{PHOTO_GROUP_LABELS[kind]}</h3>
                  <div className="flex gap-2 pt-2">
                    {Array.from({ length: GROUP_THUMBS }, (_, n) => (
                      <Skeleton key={n} className="size-18 rounded-lg" />
                    ))}
                  </div>
                </section>
              ))
            : groups.map(renderGroup)}
        </div>
      )}

      {/* AC-13: shown only while files are dragged over the card; it never takes focus or pointer events */}
      {dragging && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-card/95 p-4 text-center text-sm font-medium text-foreground"
        >
          {fullText ?? `Drop to add as ${target.toLowerCase()} photos`}
        </div>
      )}

      {/* The live region stays mounted so the first upload is announced too */}
      <div aria-live="polite">
        {photoQueue.length > 0 && (
          <ul className="flex flex-col gap-2">
            {photoQueue.map((item) => (
              <UploadQueueRow key={item.id} item={item} onRetry={() => queue.retry(item.id)} onDismiss={() => queue.remove(item.id)} />
            ))}
          </ul>
        )}
      </div>
    </DetailSection>
  );
}
