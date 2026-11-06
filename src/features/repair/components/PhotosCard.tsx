import { lazy, Suspense, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
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
  groupFullText,
  groupPreview,
  isPhoto,
  moreViewerIndex,
  PHOTO_GROUP_LABELS,
  type PhotoGroup,
  type PhotoGroupKind,
  photoDragAnnouncements,
  photoGroups,
  photoNeededHint,
  photoPlacement,
  photoRoomLeft,
  PHOTOS_SECTION_ID,
  queuedFor,
  uploadGroup,
} from '../lib/photoUpload';
import { PhotoThumb } from './PhotoThumb';
import { UploadQueueRow } from './UploadQueueRow';

// Spec 0017, AC-24: the viewer and its library load on first open only
const PhotoViewer = lazy(() => import('./PhotoViewer').then((m) => ({ default: m.PhotoViewer })));

/** A 72px slot: the add tile and the "+N more" tile share the thumbnail's size (AC-13). */
const tile =
  'flex size-18 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring';

const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/**
 * Spec 0024, AC-13: the keyboard moves a picked up thumbnail in one step. Any arrow puts it over the
 * other group (the only enabled drop target); an arrow again takes it back to where it started.
 */
const otherGroupCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  if (!ARROWS.includes(event.code)) return undefined;
  event.preventDefault();
  const { collisionRect, droppableContainers, droppableRects, over, active } = context;
  if (!collisionRect) return undefined;
  if (over) {
    const start = active?.rect.current.initial;
    return start ? { x: start.left, y: start.top } : undefined;
  }
  const target = droppableContainers.getEnabled()[0];
  const rect = target ? droppableRects.get(target.id) : undefined;
  if (!rect) return undefined;
  return {
    x: rect.left + (rect.width - collisionRect.width) / 2,
    y: rect.top + (rect.height - collisionRect.height) / 2,
  };
};

const SCREEN_READER_INSTRUCTIONS = {
  draggable:
    'To move this photo to the other group, press Space, then any arrow key, then Space again to drop it. Press Escape to cancel. Press Enter to open the photo.',
};

interface PhotosCardProps {
  ticket: RepairTicket;
  /** The photo the next move waits for, from the move's `blockedBy`; the card header shows its hint. */
  blockedBy: 'beforePhoto' | 'afterPhoto' | null;
}

/**
 * Spec 0024, AC-13: the ticket's photos as their own card after the Issues card. Before then After,
 * never swapping; each group one row of at most 4 slots (3 thumbnails, or 2 and "+N more", then the
 * add tile in the group new photos land in, and in Before after work started). That tile lets the server
 * file each photo (spec 0018); Before's late tile and a file drop on a zone name their group (AC-21), and
 * a thumbnail drags onto the other group.
 */
export function PhotosCard({ ticket, blockedBy }: PhotosCardProps) {
  const { showToast } = useToast();
  const { attachments, queue } = useTicketFiles();
  const isTouch = useIsTouchDevice();
  const input = useRef<HTMLInputElement>(null);
  /** Files from the computer are dragged over the card (AC-13, Drop). */
  const [dragging, setDragging] = useState(false);
  /** The drop zone under the pointer during a file drag. */
  const [overZone, setOverZone] = useState<PhotoGroupKind | null>(null);
  /** dragenter minus dragleave over the card and its children, so moving over a thumbnail never flickers. */
  const depth = useRef(0);
  /** The thumbnail being dragged between groups (AC-13, Drag between groups). */
  const [activeId, setActiveId] = useState<string | null>(null);
  /** A thumbnail drag just ended: the click that follows (Space keyup, mouseup) must not open the viewer. */
  const suppressOpen = useRef(false);
  /** Index into `photos` while the viewer is open, else -1 (spec 0017, AC-24). */
  const [viewerIndex, setViewerIndex] = useState(-1);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  /** The photo whose move is in flight (spec 0018, AC-9). */
  const [movingId, setMovingId] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  /** The group the next file pick names: set by Before's late tile, else the server picks (spec 0018). */
  const pickGroup = useRef<PhotoGroupKind | undefined>(undefined);
  /** Before's late tile asks once per page view (spec 0024, AC-13). */
  const lateBeforeOk = useRef(false);
  const sensors = useSensors(
    // 6px before a mouse drag starts, so a click still opens the viewer
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A long press starts a drag, so a swipe still scrolls the page
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    // Space picks up and drops, so Enter still opens the viewer
    useSensor(KeyboardSensor, {
      coordinateGetter: otherGroupCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  /** Photo uploads only; documents queue in the Documents card. */
  const photoQueue = queue.items.filter((item) => item.kind === 'PHOTO');
  const issues = ticket.issues ?? [];
  const list = attachments.list;
  const workStarted = ticket.workStartedAt != null;
  /** The group the add tile and the file picker fill: the server's own pick (spec 0018). */
  const targetKind = uploadGroup(workStarted);
  const photoKind = list?.kinds.find((k) => k.kind === 'PHOTO');
  const canAdd = list != null && list.can.addFiles && photoKind != null;
  const groups = list ? photoGroups(list) : [];
  /** Every live photo, Before then After: the viewer walks all of them. */
  const photos = groups.flatMap((group) => group.photos);
  /** Room per group, counting only the uploads queued for that group (spec 0024, value sourcing). */
  const roomFor = (kind: PhotoGroupKind) => (list ? photoRoomLeft(list.limits, photoQueue, kind) : 0);
  const fullTextFor = (group: PhotoGroup) => (roomFor(group.kind) === 0 ? groupFullText(group, queuedFor(photoQueue, group.kind)) : null);
  /**
   * AC-13: the group new photos land in has an add tile, and once work has started Before keeps one too:
   * a late Before photo, uploaded with its group named (AC-21) and marked "Added after work started" (AC-22).
   */
  const hasAdd = (kind: PhotoGroupKind) => canAdd && (kind === targetKind || (workStarted && kind === 'VEHICLE_PHOTO'));
  /** The blocked link focuses the tile of the group the next move waits for. */
  const neededKind: PhotoGroupKind | null = blockedBy === 'beforePhoto' ? 'VEHICLE_PHOTO' : blockedBy === 'afterPhoto' ? 'PROOF' : null;
  const issueNames = new Map(issues.map((issue, index) => [issue.id, `Issue ${index + 1}: ${stripSystem(issue.description)}`]));
  const hint = photoNeededHint(blockedBy);
  // AC-13: no drop handling for people who can't add; touch screens fire no drag events anyway
  const dropEnabled = canAdd && !isTouch;
  const activePhoto = activeId ? photos.find((p) => p.id === activeId) : undefined;

  /** A photo's group and its place in that group, for what a screen reader hears. */
  const photoSpot = (id: string) => {
    for (const group of groups) {
      const index = group.photos.findIndex((p) => p.id === id);
      if (index >= 0) return { group: group.kind, position: index + 1 };
    }
    return undefined;
  };
  /** A move fits only while the group holds fewer live photos than its limit (the server counts the same). */
  const moveFull = (kind: PhotoGroupKind) => {
    const group = groups.find((g) => g.kind === kind);
    return group ? group.count >= group.max : true;
  };
  const announcements = photoDragAnnouncements(photoSpot, moveFull);

  /**
   * Queue what fits; the queue uploads one at a time (spec 0017, AC-21, AC-23). The tile and the picker
   * fill the server's pick and send no group; a drop on a zone names that zone's group (spec 0024, AC-21).
   */
  const addPhotos = (files: File[], dropped?: PhotoGroupKind) => {
    if (!list || !photoKind) return;
    const placement = photoPlacement(dropped, workStarted);
    const group = groups.find((g) => g.kind === placement.group);
    if (!group) return;
    const room = roomFor(placement.group);
    const taken = files.slice(0, room);
    const word = group.label.toLowerCase();
    if (taken.length < files.length) {
      showToast(
        room === 0
          ? `This ticket already has ${group.max} ${word} photos, the most allowed.`
          : `Only ${room} more ${word} ${room === 1 ? 'photo fits' : 'photos fit'} on this ticket, so the rest were left out.`,
        'error',
      );
    }
    if (taken.length) queue.add(taken, photoKind, list.limits.maxFileMb, placement);
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

  /**
   * Spec 0018, AC-9: Move, from the viewer or a thumbnail drag (spec 0024, AC-13). The card regroups;
   * from the viewer it stays on the moved photo, from a drag focus goes to the moved thumbnail.
   */
  const movePhoto = async (photo: Attachment, from: 'viewer' | 'drag') => {
    const to = photo.kind === 'PROOF' ? 'VEHICLE_PHOTO' : 'PROOF';
    setMovingId(photo.id);
    try {
      await moveAttachment(ticket.id, photo.id, to);
      const fresh = await attachments.reload();
      if (fresh && from === 'viewer') {
        setViewerIndex(photoGroups(fresh).flatMap((group) => group.photos).findIndex((p) => p.id === photo.id));
      }
      if (from === 'drag') {
        // The thumbnail remounts in its new group; behind "+N more" there is none, and focus stays put
        requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-photo-id="${photo.id}"] > button`)?.focus());
      }
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
    if (activeId || suppressOpen.current) return;
    opener.current = from;
    setViewerLoaded(true);
    setViewerIndex(index);
  };

  const pick = (el: HTMLInputElement) => {
    const files = Array.from(el.files ?? []);
    el.value = '';
    if (files.length) addPhotos(files, pickGroup.current);
  };

  /** The add tile: the target group lets the server pick; Before after work started asks first, then names its group. */
  const openPicker = async (kind: PhotoGroupKind) => {
    const late = kind !== targetKind;
    if (late && !lateBeforeOk.current) {
      const ok = await confirm({
        title: 'Work has already started',
        description: 'Before photos you add now will show an “Added after work started” mark.',
        confirmText: 'Add anyway',
        tone: 'warning',
      });
      if (!ok) return;
      lateBeforeOk.current = true;
    }
    pickGroup.current = late ? kind : undefined;
    input.current?.click();
  };

  // A drag cancelled with Escape or dropped elsewhere never reaches the card's own dragleave
  useEffect(() => {
    if (!dragging) return;
    const reset = () => {
      depth.current = 0;
      setDragging(false);
      setOverZone(null);
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
  /** The drop zone under the pointer, read from the overlay's `data-drop-zone`. */
  const zoneOf = (event: DragEvent): PhotoGroupKind | null => {
    const zone = (event.target as Element | null)?.closest?.('[data-drop-zone]')?.getAttribute('data-drop-zone');
    return zone === 'VEHICLE_PHOTO' || zone === 'PROOF' ? zone : null;
  };
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
          const zone = zoneOf(event);
          setOverZone(zone);
          event.dataTransfer.dropEffect = zone && roomFor(zone) > 0 ? 'copy' : 'none';
        },
        onDragLeave: (event: DragEvent) => {
          if (!carriesFiles(event)) return;
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) {
            setDragging(false);
            setOverZone(null);
          }
        },
        onDrop: (event: DragEvent) => {
          if (!carriesFiles(event)) return;
          event.preventDefault();
          depth.current = 0;
          setDragging(false);
          setOverZone(null);
          // Only a zone with room takes files, and names its group (AC-21); a full zone already said so
          const zone = zoneOf(event);
          const files = Array.from(event.dataTransfer.files);
          if (zone && files.length && roomFor(zone) > 0) addPhotos(files, zone);
        },
      }
    : {};

  const onThumbDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));
  const endThumbDrag = () => {
    setActiveId(null);
    suppressOpen.current = true;
    window.setTimeout(() => {
      suppressOpen.current = false;
    }, 300);
  };
  const onThumbDragEnd = ({ active, over }: DragEndEvent) => {
    endThumbDrag();
    const photo = photos.find((p) => p.id === String(active.id));
    const to = over?.id;
    // Only the other group is a target; a full one refuses and the photo stays
    if (!photo || (to !== 'VEHICLE_PHOTO' && to !== 'PROOF') || to === photo.kind || moveFull(to)) return;
    void movePhoto(photo, 'drag');
  };

  // Spec 0017, AC-20: with no photos, people who can't add see no card at all
  if (list && photos.length === 0 && photoQueue.length === 0 && !canAdd) return null;

  const renderGroup = (group: PhotoGroup) => {
    const { shown, more } = groupPreview(group.photos);
    const fullText = hasAdd(group.kind) ? fullTextFor(group) : null;
    const hasTile = hasAdd(group.kind) && !fullText;
    const late = group.kind !== targetKind;
    const word = group.label.toLowerCase();
    return (
      <PhotoGroupDrop
        key={group.kind}
        group={group}
        // Only the other group takes a dragged thumbnail
        enabled={activePhoto != null && activePhoto.kind !== group.kind}
        full={moveFull(group.kind)}
      >
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
                dragActive={activeId != null}
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
                      data-photo-needed={group.kind === neededKind ? '' : undefined}
                      aria-label={`Add ${word} photo`}
                      onClick={() => void openPicker(group.kind)}
                      className={cn(tile, 'border border-dashed border-input text-muted-strong hover:border-primary hover:text-foreground')}
                    >
                      <Plus aria-hidden="true" className="size-5" />
                      Add
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{late ? `Add ${word} photo (work already started)` : `Add ${word} photo, or drop files on this card`}</TooltipContent>
                </Tooltip>
              </li>
            )}
          </ul>
        )}
        {fullText && <p className="text-xs text-muted-foreground">{fullText}</p>}
      </PhotoGroupDrop>
    );
  };

  const loading = !list && attachments.state === 'loading';

  return (
    <DetailSection
      title="Photos"
      id={PHOTOS_SECTION_ID}
      // AC-13: below the sticky header when the blocked link scrolls here, as the issue rows
      className="relative @container scroll-mt-24"
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
            onMove={(photo) => void movePhoto(photo, 'viewer')}
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
        <DndContext
          sensors={sensors}
          accessibility={{ announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS }}
          onDragStart={onThumbDragStart}
          onDragEnd={onThumbDragEnd}
          onDragCancel={endThumbDrag}
        >
          {/* Side by side once the card fits both rows (about 650px inside), Before on the left; stacked below */}
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
          {/* Portalled, so the 72px row and the card's container never clip or offset it */}
          {createPortal(
            <DragOverlay>
              {activePhoto ? (
                <img
                  src={activePhoto.thumbnailUrl ?? activePhoto.url}
                  alt=""
                  draggable={false}
                  className="size-18 rounded-lg border border-primary object-cover"
                />
              ) : null}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>
      )}

      {/* AC-13: two drop zones while files are dragged over the card, laid out like the groups. Nothing focusable */}
      {dragging && (
        <div aria-hidden="true" className="absolute inset-0 z-10 grid gap-2 rounded-xl bg-card/95 p-3 @2xl:grid-cols-2">
          {groups.map((group) => {
            const full = fullTextFor(group);
            return (
              <div
                key={group.kind}
                data-drop-zone={group.kind}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border p-2 text-center text-sm',
                  overZone === group.kind && !full && 'border-solid border-primary ring-2 ring-primary',
                )}
              >
                {full ? (
                  <span className="text-muted-foreground">{full}</span>
                ) : (
                  <>
                    <span className="font-medium text-foreground">Drop for {group.label.toLowerCase()} photos</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {group.count + queuedFor(photoQueue, group.kind)} of {group.max}
                    </span>
                  </>
                )}
              </div>
            );
          })}
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

interface PhotoGroupDropProps {
  group: PhotoGroup;
  /** A thumbnail from the other group is being dragged. */
  enabled: boolean;
  /** No room left: a dragged thumbnail is refused here. */
  full: boolean;
  children: ReactNode;
}

/** Spec 0024, AC-13: one group as a drop target for a thumbnail from the other group. */
function PhotoGroupDrop({ group, enabled, full, children }: PhotoGroupDropProps) {
  const { setNodeRef, isOver } = useDroppable({ id: group.kind, disabled: !enabled });
  const over = enabled && isOver;
  return (
    <section
      ref={setNodeRef}
      aria-label={`${group.label} photos`}
      className={cn('flex min-w-0 flex-col gap-2 rounded-lg', over && !full && 'ring-2 ring-primary ring-offset-4 ring-offset-card')}
    >
      {children}
      {over && full && <p className="text-xs text-muted-foreground">{group.label} photos full</p>}
    </section>
  );
}
