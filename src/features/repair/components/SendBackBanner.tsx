import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Callout } from '../../../components/shared/Callout';
import { formatDateTime, formatRelativeTime } from '../../../lib/utils/format';
import type { TicketRejection } from '../../../types';

interface SendBackBannerProps {
  rejection: TicketRejection;
  /** When the ticket loaded; the relative time starts from it and then counts on. */
  now: number;
}

const TICK_MS = 60_000;

/**
 * Spec 0014, AC-17: why the work came back, near the top of the ticket. The comment folds to
 * four lines. "Show more" appears only when the text is really cut off at the current width, so a
 * wide screen that already shows it all has no button (the page keys this by the rejection, so a
 * new Send back starts folded).
 */
export function SendBackBanner({ rejection, now }: SendBackBannerProps) {
  const [open, setOpen] = useState(false);
  const [cutOff, setCutOff] = useState(false);
  const [clock, setClock] = useState(now);
  const remarksRef = useRef<HTMLParagraphElement>(null);

  // The relative time counts on while the page stays open, once a minute
  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Measure while folded, and again when the width changes. While open the last answer stands, so
  // "Show less" stays available.
  useEffect(() => {
    const el = remarksRef.current;
    if (!el || open) return;
    const observer = new ResizeObserver(() => setCutOff(el.scrollHeight > el.clientHeight + 1));
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, rejection.remarks]);

  return (
    <Callout
      tone="warning"
      className="mb-4"
      title={`Sent back by ${rejection.byName}, ${formatRelativeTime(rejection.at, new Date(clock))}`}
    >
      <p ref={remarksRef} className={cn('whitespace-pre-line', !open && 'line-clamp-4')}>
        {rejection.remarks}
      </p>
      {cutOff && (
        <Button type="button" variant="link" aria-expanded={open} className="h-auto self-start px-0 py-1 text-xs" onClick={() => setOpen((v) => !v)}>
          {open ? 'Show less' : 'Show more'}
        </Button>
      )}
      <p className="mt-1 text-xs text-muted-strong">
        <time dateTime={rejection.at}>{formatDateTime(rejection.at)}</time>
      </p>
    </Callout>
  );
}
