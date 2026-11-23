import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BadgePill } from '../../../components/shared/BadgePill';
import { formatRelativeTime } from '../../../lib/utils/format';
import type { SessionView } from '../../../lib/api/sessionsApi';

interface SessionRowsProps {
  sessions: SessionView[];
  /** Shows End on every row but the current one. */
  onEnd?: (session: SessionView) => void;
  /** The row whose End is running. */
  endingSid?: string | null;
}

function systemsText(session: SessionView) {
  return session.systems.length > 0 ? session.systems.join(', ') : 'No system opened yet';
}

/** One row per session: device, systems, last active, and End (spec 0003, AC-34, AC-35). */
export function SessionRows({ sessions, onEnd, endingSid }: SessionRowsProps) {
  return (
    <ul className="divide-y divide-border">
      {sessions.map((session) => {
        const Icon = session.kind === 'mobile' ? Smartphone : Monitor;
        return (
          <li key={session.sid} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate text-body font-medium text-foreground" title={session.device}>
                  {session.device}
                </span>
                {session.current && <BadgePill className="bg-success/15 text-success">This device</BadgePill>}
              </p>
              <p className="truncate text-caption text-muted-foreground">
                {systemsText(session)}, active{' '}
                <time dateTime={session.lastActiveAt} title={new Date(session.lastActiveAt).toLocaleString()}>
                  {formatRelativeTime(session.lastActiveAt)}
                </time>
              </p>
            </div>
            {onEnd && !session.current && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={endingSid === session.sid}
                disabled={endingSid != null && endingSid !== session.sid}
                onClick={() => onEnd(session)}
                aria-label={`End the session on ${session.device}`}
              >
                End
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The loading rows for a sessions list. */
export function SessionRowsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-border" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}
