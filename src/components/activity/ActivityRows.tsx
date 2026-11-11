import { KeyRound, LogIn, Mail, MonitorSmartphone, ShieldAlert, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ActivityCategory, ActivityEvent } from '../../lib/api/activityApi';
import {
  eventTitle,
  groupByDay,
  isWarning,
  manilaFull,
  manilaTime,
  whereText,
  type ActivityLabels,
} from '../../lib/activity/activityFormat';

const ICONS: Record<ActivityCategory, typeof LogIn> = {
  SIGN_IN: LogIn,
  SESSION: MonitorSmartphone,
  CODE: Mail,
  ACCOUNT: UserCog,
};

interface ActivityRowsProps {
  events: ActivityEvent[];
  labels: ActivityLabels;
  /** `self`: your own list (an admin's action reads "An admin ..."); `admin`: names the actor. */
  viewer: 'self' | 'admin';
}

/** Account events grouped by Manila day (spec 0011, AC-19, AC-20). */
export function ActivityRows({ events, labels, viewer }: ActivityRowsProps) {
  const days = groupByDay(events);
  // AC-18: DB-IP Lite is CC BY 4.0, so any screen that shows a place credits it
  const showsPlace = events.some((e) => !e.localNetwork && (e.country || e.network));
  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <section key={day.key} aria-label={day.heading}>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{day.heading}</h3>
          <ul className="divide-y divide-border">
            {day.events.map((event) => (
              <ActivityRow key={event.id} event={event} labels={labels} viewer={viewer} />
            ))}
          </ul>
        </section>
      ))}
      {showsPlace && (
        <p className="text-xs text-muted-foreground">
          Places are approximate.{' '}
          <a href="https://db-ip.com" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            IP data by DB-IP
          </a>
        </p>
      )}
    </div>
  );
}

function ActivityRow({ event, labels, viewer }: { event: ActivityEvent; labels: ActivityLabels; viewer: 'self' | 'admin' }) {
  const warning = isWarning(event);
  const Icon = warning ? ShieldAlert : event.type === 'PASSWORD_CHANGED' ? KeyRound : ICONS[event.category];
  const where = whereText(event);
  const actor = viewer === 'admin' && event.actor.kind === 'ADMIN' && event.actor.name ? `By ${event.actor.name}` : null;
  const meta = [actor, where].filter(Boolean).join(', ');
  return (
    <li className="flex items-start gap-3 py-3">
      <span
        aria-hidden="true"
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${warning ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium break-words text-foreground">{eventTitle(event, labels, viewer)}</p>
        {meta && (
          <p className="text-xs break-words text-muted-foreground" title={event.userAgent ?? undefined}>
            {meta}
          </p>
        )}
      </div>
      <time dateTime={event.createdAt} title={manilaFull(event.createdAt)} className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
        {manilaTime(event.createdAt)}
      </time>
    </li>
  );
}

/** The loading rows for an activity list. */
export function ActivityRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      <Skeleton className="mb-2 h-3 w-16" />
      <ul className="divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-3 w-14" />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ShowMoreProps {
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  onMore: () => void;
}

/** Show more below a list, loading the next page in place; a failure keeps the button to try again. */
export function ActivityShowMore({ hasMore, loading, error, onMore }: ShowMoreProps) {
  if (!hasMore) return null;
  return (
    <div className="flex flex-col items-start gap-2">
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <Button type="button" variant="outline" size="sm" loading={loading} onClick={onMore}>
        {error ? 'Try again' : 'Show more'}
      </Button>
    </div>
  );
}
