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
  /** After the close animation; the caller puts focus back on the thumbnail. */
  onClosed: () => void;
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

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Every live photo on the ticket, with swipe, arrows, pinch and double tap zoom (spec 0017, AC-24). */
export function PhotoViewer({ photos, index, issueNames, onIndexChange, onClosed }: PhotoViewerProps) {
  const still = prefersReducedMotion();
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
      controller={{ closeOnBackdropClick: true }}
      styles={{ root: THEME }}
    />
  );
}
