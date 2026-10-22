import { AlertCircle, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { dayKey, formatDayHeading } from '../../../lib/utils/format';
import type { AuditEvent } from '../../../types';
import { AuditEventItem } from './AuditEventItem';

interface AuditTimelineProps {
  events: AuditEvent[];
  hasOlder: boolean;
  more: 'idle' | 'loading' | 'error';
  onLoadOlder: () => void;
}

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

export function AuditTimeline({ events, hasOlder, more, onLoadOlder }: AuditTimelineProps) {
  // Headings compare against the clock at render time (spec 0003, Value sourcing).
  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      {byDay(events).map((day) => {
        const heading = formatDayHeading(day.at, now);
        const headingId = `audit-day-${day.key}`;
        return (
          <Card key={day.key} className="gap-4 p-4 md:p-5" aria-labelledby={headingId} role="region">
            <h2 id={headingId} className="text-sm font-semibold text-foreground">
              {heading}
            </h2>
            <ol aria-labelledby={headingId} className="flex flex-col">
              {day.events.map((event) => (
                <AuditEventItem key={event.id} event={event} />
              ))}
            </ol>
          </Card>
        );
      })}

      <div className="flex flex-col items-center gap-2 py-2" aria-live="polite">
        {more === 'error' ? (
          <div role="alert" className="flex flex-col items-center gap-2 text-sm text-destructive sm:flex-row">
            <span className="inline-flex items-center gap-1.5">
              <AlertCircle aria-hidden="true" className="size-4" />
              Couldn’t load older events.
            </span>
            <Button variant="outline" size="sm" onClick={onLoadOlder}>
              Try again
            </Button>
          </div>
        ) : hasOlder ? (
          <Button variant="outline" loading={more === 'loading'} onClick={onLoadOlder} className="w-full sm:w-auto">
            Load older events
          </Button>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <CircleCheck aria-hidden="true" className="size-4" />
            You’ve reached the start of the log.
          </p>
        )}
      </div>
    </div>
  );
}

export function AuditTimelineSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      {[4, 3].map((rows, index) => (
        <Card key={index} className="gap-5 p-4 md:p-5">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="flex gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}
