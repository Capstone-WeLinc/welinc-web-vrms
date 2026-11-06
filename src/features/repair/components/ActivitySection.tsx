import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditEventItem } from '../../audit-logs/components/AuditEventItem';
import { getAuditEvents } from '../../../lib/api/auditApi';
import { dayKey, formatDayHeading } from '../../../lib/utils/format';
import type { AuditEvent } from '../../../types';
import { DetailSection } from '../../../components/shared/DetailSection';

const PAGE_SIZE = 50;

type Activity =
  | { status: 'loading' | 'error' }
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

/** Spec 0024, AC-15: the newest events shown before Show all. */
const RECENT = 5;

/**
 * The ticket's audit events (spec 0004, AC-23), shown open with the 5 newest (spec 0024, AC-15).
 * Show all loads the first 50 in their place, then pages on by cursor. The 3 second refresh never
 * reloads it: it loads per ticket only.
 */
export function ActivitySection({ ticketId }: { ticketId: string }) {
  const [all, setAll] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; activity: Activity } | null>(null);
  const key = `${ticketId}:${all ? 'all' : 'recent'}:${attempt}`;
  // A result for another ticket, mode or attempt means this one is still loading
  const activity: Activity = result?.key === key ? result.activity : { status: 'loading' };

  useEffect(() => {
    let cancelled = false;
    getAuditEvents({ ticketId, limit: all ? PAGE_SIZE : RECENT })
      .then((page) => {
        if (!cancelled) setResult({ key, activity: { status: 'ready', events: page.data, nextCursor: all ? page.nextCursor : null, more: 'idle' } });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, activity: { status: 'error' } });
      });
    return () => {
      cancelled = true;
    };
  }, [ticketId, all, attempt, key]);

  /** Today's paging, once Show all has loaded the first page. */
  const loadOlder = () => {
    if (activity.status !== 'ready' || !activity.nextCursor || activity.more === 'loading') return;
    const cursor = activity.nextCursor;
    const update = (change: (current: Extract<Activity, { status: 'ready' }>) => Activity) =>
      setResult((r) => (r && r.key === key && r.activity.status === 'ready' ? { key, activity: change(r.activity) } : r));
    update((current) => ({ ...current, more: 'loading' }));
    getAuditEvents({ ticketId, limit: PAGE_SIZE, cursor })
      .then((page) => update((current) => ({ ...current, events: [...current.events, ...page.data], nextCursor: page.nextCursor, more: 'idle' })))
      .catch(() => update((current) => ({ ...current, more: 'error' })));
  };

  // Show all only when the 5 newest may not be everything
  const canShowAll = !all && activity.status === 'ready' && activity.events.length >= RECENT;

  const now = new Date();
  const panelId = `activity-${ticketId}`;

  return (
    <DetailSection
      title="Activity"
      action={
        canShowAll ? (
          <Button variant="ghost" size="sm" className="h-11 px-2 text-muted-strong md:h-8" onClick={() => setAll(true)}>
            Show all
          </Button>
        ) : null
      }
    >
      <div id={panelId} aria-live="polite">
        {activity.status === 'loading' && (
          <div className="flex flex-col gap-4" aria-busy="true">
            {(all ? [0, 1, 2] : [0, 1]).map((row) => (
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
            <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          </div>
        )}
        {activity.status === 'ready' &&
          (activity.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet</p>
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
