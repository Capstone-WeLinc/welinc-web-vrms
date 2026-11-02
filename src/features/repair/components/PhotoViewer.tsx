import { useEffect, useSyncExternalStore } from 'react';
import { ImageOff } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/captions.css';
import type { Attachment } from '../../../lib/api/attachmentsApi';
import { photoCaption } from '../lib/photoCaption';

interface PhotoViewerProps {
  photos: Attachment[];
  /** The photo to open on, or -1 when closed. */
  index: number;
  /** Issue descriptions by id, for the caption of a tagged photo. */
  issueNames: Map<string, string>;
  onIndexChange: (index: number) => void;
  /** First load error on a photo: fetch fresh links once, like a thumbnail does (AC-26). */
  onLinkError: () => Promise<unknown>;
  /** After the close animation; the caller puts focus back on the thumbnail. */
  onClosed: () => void;
  /** Spec 0018, AC-9: move the shown photo to the other group. Offered only when the photo's `canMove` is set. */
  onMove?: (photo: Attachment) => void;
  /** The photo whose move is in flight, so its button waits. */
  movingId?: string | null;
}

/** The text button in the viewer's toolbar: reachable by Tab, named by its text (AC-19). */
function MoveButton({ photo, moving, onMove }: { photo: Attachment; moving: boolean; onMove: (photo: Attachment) => void }) {
  const to = photo.kind === 'PROOF' ? 'Before' : 'After';
  return (
    <button
      type="button"
      className="my-1 mr-2 min-h-11 rounded-md bg-primary-foreground/15 px-3 text-sm font-semibold whitespace-nowrap text-primary-foreground outline-none hover:bg-primary-foreground/25 focus-visible:ring-2 focus-visible:ring-highlight disabled:opacity-60"
      onClick={() => onMove(photo)}
      disabled={moving}
      aria-busy={moving}
    >
      {moving ? 'Moving…' : `Move to ${to}`}
    </button>
  );
}

// Themed only through the library's CSS variables, mapped to design.md tokens (AC-24)
const THEME: Record<`--yarl__${string}`, string> = {
  '--yarl__color_backdrop': 'color-mix(in srgb, var(--foreground) 94%, transparent)',
  '--yarl__color_button': 'var(--primary-foreground)',
  '--yarl__color_button_active': 'var(--highlight)',
  '--yarl__color_button_disabled': 'color-mix(in srgb, var(--primary-foreground) 40%, transparent)',
  '--yarl__slide_title_color': 'var(--primary-foreground)',
  '--yarl__slide_description_color': 'var(--primary-foreground)',
  '--yarl__slide_title_font_size': '0.875rem',
  '--yarl__slide_title_font_weight': '600',
  '--yarl__slide_captions_container_background': 'color-mix(in srgb, var(--foreground) 70%, transparent)',
  '--yarl__slide_icon_loading_color': 'var(--primary-foreground)',
  '--yarl__slide_icon_error_color': 'var(--destructive)',
};

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

// Follows the setting while the viewer is open, not just at the first render
function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function prefersReducedMotion() {
  return window.matchMedia(REDUCED_MOTION).matches;
}

/** Shown by the viewer when a photo will not load; asks for fresh links once, so the next open works (AC-26). */
function LinkError({ onError }: { onError: () => Promise<unknown> }) {
  useEffect(() => {
    void onError();
  }, [onError]);
  return (
    <div role="alert" className="flex max-w-xs flex-col items-center gap-2 p-4 text-center text-sm text-primary-foreground">
      <ImageOff aria-hidden="true" className="size-8" />
      Could not load this photo. Close the viewer and open it again.
    </div>
  );
}

/** Every live photo on the ticket, with swipe, arrows, pinch and double tap zoom (spec 0017, AC-24). */
export function PhotoViewer({ photos, index, issueNames, onIndexChange, onLinkError, onClosed, onMove, movingId = null }: PhotoViewerProps) {
  const still = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const shown = index >= 0 ? photos[index] : undefined;
  const move = onMove && shown?.canMove ? <MoveButton key="move" photo={shown} moving={movingId === shown.id} onMove={onMove} /> : null;
  return (
    <Lightbox
      open={index >= 0}
      index={Math.max(0, index)}
      close={() => onIndexChange(-1)}
      plugins={[Zoom, Captions]}
      slides={photos.map((photo) => {
        const caption = photoCaption(photo, issueNames);
        return {
          src: photo.url,
          width: photo.width ?? undefined,
          height: photo.height ?? undefined,
          alt: `Photo by ${photo.uploadedBy.name}`,
          title: caption.title,
          description: caption.description,
        };
      })}
      on={{ view: ({ index: next }) => onIndexChange(next), exited: onClosed }}
      animation={still ? { fade: 0, swipe: 0, navigation: 0, zoom: 0 } : undefined}
      zoom={{ doubleTapDelay: 300, scrollToZoom: true }}
      captions={{ descriptionTextAlign: 'start', descriptionMaxLines: 3 }}
      render={{ iconError: () => <LinkError onError={onLinkError} /> }}
      controller={{ closeOnBackdropClick: true }}
      toolbar={{ buttons: move ? [move, 'close'] : ['close'] }}
      styles={{ root: THEME }}
    />
  );
}
