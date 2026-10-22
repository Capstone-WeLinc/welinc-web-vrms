import { useState } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AuditEventItem } from '../../audit-logs/components/AuditEventItem';
import { getAuditEvents } from '../../../lib/api/auditApi';
import { dayKey, formatDayHeading } from '../../../lib/utils/format';
import type { AuditEvent } from '../../../types';
import { DetailSection } from './DetailSection';

const PAGE_SIZE = 50;

type Activity =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'ready'; events: AuditEvent[]; nextCursor: string | null; more: 'idle' | 'loading' | 'error' };

/** Consecutive events that share a local calendar day; events arrive newest first. */
function byDay(events: AuditEvent[]) {
  const days: { key: string; at: string; events: AuditEvent[] }[] = [];
  for (const event of events) {
    const key = dayKey(event.at);
    const last = days[days.length - 1];
    if (last && last.key === key) last.events.push(event);
    else days.push({ key, at: event.at, events: [event] });
  }
  return days;
}

/**
 * The ticket's audit events, admins only (spec 0004, AC-23). Collapsed at first; the first
 * expand loads the newest 50 from the same endpoint and renderer as the audit log page.
 */
export function ActivitySection({ ticketId }: { ticketId: string }) {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<Activity>({ status: 'idle' });

  const load = () => {
    setActivity({ status: 'loading' });
    getAuditEvents({ ticketId, limit: PAGE_SIZE })
      .then((page) => setActivity({ status: 'ready', events: page.data, nextCursor: page.nextCursor, more: 'idle' }))
      .catch(() => setActivity({ status: 'error' }));
  };

  const loadOlder = () => {
    if (activity.status !== 'ready' || !activity.nextCursor || activity.more === 'loading') return;
    const cursor = activity.nextCursor;
    setActivity({ ...activity, more: 'loading' });
    getAuditEvents({ ticketId, limit: PAGE_SIZE, cursor })
      .then((page) =>
        setActivity((current) =>
          current.status === 'ready'
            ? { ...current, events: [...current.events, ...page.data], nextCursor: page.nextCursor, more: 'idle' }
            : current,
        ),
      )
      .catch(() => setActivity((current) => (current.status === 'ready' ? { ...current, more: 'error' } : current)));
  };

  const toggle = () => {
    if (!open && activity.status === 'idle') load();
    setOpen(!open);
  };

  const now = new Date();
  const panelId = `activity-${ticketId}`;

  return (
    <DetailSection
      title="Activity"
      action={
        <Button variant="ghost" size="sm" aria-expanded={open} aria-controls={panelId} onClick={toggle}>
          {open ? 'Hide' : 'Show'}
          <ChevronDown aria-hidden="true" className={cn('transition-transform motion-reduce:transition-none', open && 'rotate-180')} />
        </Button>
      }
    >
      <div id={panelId} hidden={!open} aria-live="polite">
        {activity.status === 'loading' && (
          <div className="flex flex-col gap-4" aria-busy="true">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2 pt-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}
        {activity.status === 'error' && (
          <div role="alert" className="flex flex-col items-start gap-2 text-sm text-destructive sm:flex-row sm:items-center">
            <span className="inline-flex items-center gap-1.5">
              <AlertCircle aria-hidden="true" className="size-4" />
              Couldn’t load activity.
            </span>
            <Button variant="outline" size="sm" onClick={load}>
              Try again
            </Button>
          </div>
        )}
        {activity.status === 'ready' &&
          (activity.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {byDay(activity.events).map((day) => {
                const headingId = `${panelId}-${day.key}`;
                return (
                  <div key={day.key} className="flex flex-col gap-3">
                    <h3 id={headingId} className="text-sm font-semibold text-foreground">
                      {formatDayHeading(day.at, now)}
                    </h3>
                    <ol aria-labelledby={headingId} className="flex flex-col">
                      {day.events.map((event) => (
                        <AuditEventItem key={event.id} event={event} showTicket={false} />
                      ))}
                    </ol>
                  </div>
                );
              })}
              {activity.more === 'error' && (
                <p role="alert" className="inline-flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle aria-hidden="true" className="size-4" />
                  Couldn’t load older events.
                </p>
              )}
              {activity.nextCursor && (
                <Button variant="outline" className="self-start" loading={activity.more === 'loading'} onClick={loadOlder}>
                  {activity.more === 'error' ? 'Try again' : 'Load older events'}
                </Button>
              )}
            </div>
          ))}
      </div>
    </DetailSection>
  );
}
