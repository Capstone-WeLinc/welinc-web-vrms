import { lazy, Suspense, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { confirm } from '../../../components/shared/confirm/confirm';
import { useToast } from '../../../context/toast';
import { moveAttachment, removeAttachment, type Attachment } from '../../../lib/api/attachmentsApi';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import type { RepairTicket } from '../../../types';
import { useTicketFiles } from '../hooks/ticketFiles';
import { stripSystem } from '../lib/issueRow';
import { groupLimit, isPhoto, PHOTO_GROUP_LABELS, photoGroups, photoRoomLeft, PHOTOS_SECTION_ID, uploadGroup } from '../lib/photoUpload';
import { PhotoStrip } from './PhotoStrip';

// Spec 0017, AC-24: the viewer and its library load on first open only
const PhotoViewer = lazy(() => import('./PhotoViewer').then((m) => ({ default: m.PhotoViewer })));

interface PhotosLineProps {
  ticket: RepairTicket;
  /** The page's choice, or null to follow the rule: open with any photo, or while a photo blocks the next move. */
  open: boolean | null;
  onOpenChange: (open: boolean) => void;
  blockedByPhoto: boolean;
}

/**
 * Spec 0024, AC-13: the ticket's photos as one line at the top of the Issues card, "Photos · 2 before
 * · 1 after", opening to the Before and After strip (spec 0018). The strip stays mounted while folded,
 * so Add photos can open the file picker in the same click.
 */
export function PhotosLine({ ticket, open, onOpenChange, blockedByPhoto }: PhotosLineProps) {
  const { showToast } = useToast();
  const { attachments, queue } = useTicketFiles();
  const panelId = useId();
  const container = useRef<HTMLDivElement>(null);
  /** Photo uploads only; documents queue in the Documents card. */
  const photoQueue = queue.items.filter((item) => item.kind === 'PHOTO');
  /** Index into `photos` while the viewer is open, else -1 (spec 0017, AC-24). */
  const [viewerIndex, setViewerIndex] = useState(-1);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  /** The photo whose move is in flight (spec 0018, AC-9). */
  const [movingId, setMovingId] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  const issues = ticket.issues ?? [];
  const list = attachments.list;
  // Spec 0018, AC-1 and AC-16: the server files a photo Before or After; the strip mirrors its rule
  const workStarted = ticket.workStartedAt != null;
  const target = PHOTO_GROUP_LABELS[uploadGroup(workStarted)].toLowerCase();
  const photoKind = list?.kinds.find((k) => k.kind === 'PHOTO');
  const canAddPhotos = list != null && list.can.addFiles && photoKind != null;
  const groups = list ? photoGroups(list, workStarted) : [];
  /** Every live photo in the order shown: the viewer walks all of them. */
  const photos = groups.flatMap((group) => group.photos);
  const inFlight = photoQueue.filter((item) => item.status === 'waiting' || item.status === 'uploading').length;
  const room = list ? photoRoomLeft(list.limits, inFlight, workStarted) : 0;
  const targetLimit = list ? groupLimit(list.limits, uploadGroup(workStarted)) : null;
  const limitText =
    targetLimit && room === 0
      ? `${PHOTO_GROUP_LABELS[uploadGroup(workStarted)]} photos full (${Math.min(targetLimit.max, targetLimit.count + inFlight)} of ${targetLimit.max})`
      : null;
  const issueNames = new Map(issues.map((issue, index) => [issue.id, `Issue ${index + 1}: ${stripSystem(issue.description)}`]));
  const before = groups.find((g) => g.kind === 'VEHICLE_PHOTO')?.photos.length ?? 0;
  const after = groups.find((g) => g.kind === 'PROOF')?.photos.length ?? 0;
  const shown = open ?? (photos.length > 0 || blockedByPhoto);

  /** Queue what fits in the group new photos land in; the queue uploads one at a time (spec 0017, AC-21, AC-23). */
  const addPhotos = (files: File[]) => {
    if (!list || !photoKind || !targetLimit) return;
    const taken = files.slice(0, room);
    if (taken.length < files.length) {
      showToast(
        room === 0
          ? `This ticket already has ${targetLimit.max} ${target} photos, the most allowed.`
          : `Only ${room} more ${target} ${room === 1 ? 'photo fits' : 'photos fit'} on this ticket, so the rest were left out.`,
        'error',
      );
    }
    if (taken.length) queue.add(taken, photoKind, list.limits.maxFileMb);
  };

  /** Spec 0017, AC-25: ask first, then the photo leaves the strip and the viewer. */
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

  /** Spec 0018, AC-9: the viewer's Move. The strip regroups; the viewer stays on the moved photo. */
  const movePhoto = async (photo: Attachment) => {
    const to = photo.kind === 'PROOF' ? 'VEHICLE_PHOTO' : 'PROOF';
    setMovingId(photo.id);
    try {
      await moveAttachment(ticket.id, photo.id, to);
      const fresh = await attachments.reload();
      if (fresh) {
        const order = photoGroups(fresh, workStarted).flatMap((group) => group.photos);
        setViewerIndex(order.findIndex((p) => p.id === photo.id));
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

  const openViewer = (photo: Attachment, thumb: HTMLButtonElement) => {
    opener.current = thumb;
    setViewerLoaded(true);
    setViewerIndex(photos.findIndex((p) => p.id === photo.id));
  };

  /** Opens the strip and the file picker in the same click (a later click would be blocked). */
  const choose = () => {
    onOpenChange(true);
    container.current?.querySelector<HTMLInputElement>('input[data-photo-choose]')?.click();
  };

  // Spec 0017, AC-20: with no photos, people who can't add see nothing
  if (list && photos.length === 0 && photoQueue.length === 0 && !canAddPhotos) return null;

  return (
    <div id={PHOTOS_SECTION_ID} ref={container} className="flex scroll-mt-24 flex-col gap-3 border-b border-border pb-3">
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
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={shown}
          aria-controls={panelId}
          onClick={() => onOpenChange(!shown)}
          className="group flex min-h-11 min-w-0 items-center gap-1.5 rounded-md text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
        >
          <span className="font-medium text-foreground">Photos</span>
          {/* While the list loads there are no counts yet */}
          {list && (
            <span className="text-muted-foreground tabular-nums">
              · {before} before · {after} after
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-snappy', shown && 'rotate-180')}
          />
        </button>
        {canAddPhotos && (
          <Button type="button" variant="ghost" size="sm" className="-mr-2 h-11 px-2 text-muted-strong md:h-8" disabled={limitText != null} onClick={choose}>
            Add photos
          </Button>
        )}
      </div>
      {attachments.state === 'error' && (
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          {attachments.errorMessage}
          <Button type="button" variant="link" size="sm" className="h-auto min-h-11 px-0 md:min-h-0" onClick={attachments.retry}>
            Try again
          </Button>
        </p>
      )}
      <div id={panelId} hidden={!shown}>
        {list && (
          <PhotoStrip
            groups={groups}
            queue={photoQueue}
            canAdd={canAddPhotos}
            limitText={limitText}
            label="Photos"
            onAdd={addPhotos}
            onRetry={queue.retry}
            onDismiss={queue.remove}
            onOpen={openViewer}
            onRemove={(photo) => void removePhoto(photo)}
            onLinkError={attachments.reload}
          />
        )}
      </div>
    </div>
  );
}
