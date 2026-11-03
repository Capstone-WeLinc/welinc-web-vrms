import { useEffect, useRef, useState, type RefObject } from 'react';
import { ArrowRight, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getVehicleChanges, type ManagedVehicle, type VehicleChange } from '../../../lib/api/vehiclesApi';
import { formatDateTime } from '../../../lib/utils/format';
import { useLoad } from '../../knowledge-base/hooks/useLoad';
import { describeChange } from '../lib/vehicleChanges';

const fetchFirstPage = (id: string) => getVehicleChanges(id);

interface VehicleHistoryDialogProps {
  vehicle: ManagedVehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalFocusRef?: RefObject<HTMLElement | null>;
}

function Entry({ change }: { change: VehicleChange }) {
  const entry = describeChange(change);
  const { detail } = entry;
  return (
    // tabIndex -1 lets Load more move focus to the first new entry (it is not a tab stop)
    <li id={`change-${change.id}`} tabIndex={-1} className="flex flex-col gap-0.5 py-3 text-sm outline-none first:pt-0 last:pb-0">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-foreground">{entry.what}:</span>
        <span className="flex flex-wrap items-center gap-1 text-foreground">
          <span className="text-muted-foreground">{entry.before}</span>
          <ArrowRight role="img" aria-label="changed to" className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="font-medium">{entry.after}</span>
        </span>
      </span>
      <span className="text-xs wrap-break-word text-muted-foreground">
        {entry.who} · <time dateTime={change.createdAt}>{formatDateTime(change.createdAt)}</time>
      </span>
      {detail?.kind === 'reason' && (
        <span className="max-w-full text-xs wrap-anywhere whitespace-pre-line text-muted-strong">
          <span className="font-medium">Reason:</span> {detail.text}
        </span>
      )}
      {detail?.kind === 'ticket' && (
        <Link
          to={`/repairs/${detail.ticket.id}`}
          className="w-fit text-xs font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:underline"
        >
          Ticket {detail.ticket.repairNumber}
        </Link>
      )}
      {detail?.kind === 'removed' && <span className="text-xs text-muted-foreground">Ticket removed</span>}
    </li>
  );
}

/**
 * Spec 0020, AC-13: a truck's status and type changes, newest first, 20 at a time. A failed
 * Load more keeps what is shown and offers a retry under it.
 */
export function VehicleHistoryDialog({ vehicle, open, onOpenChange, finalFocusRef }: VehicleHistoryDialogProps) {
  const first = useLoad(vehicle.id, fetchFirstPage, 'The history didn’t load.');
  const [older, setOlder] = useState<VehicleChange[]>([]);
  // undefined until a Load more answers; then the cursor that page returned
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [more, setMore] = useState<'idle' | 'loading' | 'error'>('idle');
  const [moreError, setMoreError] = useState('');
  // Said to screen readers after a Load more, which otherwise changes the list silently
  const [announcement, setAnnouncement] = useState('');
  // The first entry a Load more added: focus moves there, so it does not drop when the button goes
  const pendingFocus = useRef<string | null>(null);
  const next = cursor === undefined ? (first.data?.nextCursor ?? null) : cursor;
  const items = [...(first.data?.items ?? []), ...older];

  useEffect(() => {
    if (!pendingFocus.current) return;
    document.getElementById(`change-${pendingFocus.current}`)?.focus();
    pendingFocus.current = null;
  }, [older]);

  const loadMore = async () => {
    if (!next) return;
    setMore('loading');
    try {
      const page = await getVehicleChanges(vehicle.id, next);
      pendingFocus.current = page.items[0]?.id ?? null;
      setAnnouncement(`${page.items.length} older ${page.items.length === 1 ? 'change' : 'changes'} loaded.`);
      setOlder((rows) => [...rows, ...page.items]);
      setCursor(page.nextCursor);
      setMore('idle');
    } catch (err) {
      setMoreError(getApiErrorMessage(err, 'Older changes didn’t load.'));
      setMore('error');
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`History of ${vehicle.plateNumber}`}
      description="Every status and type change, newest first."
      finalFocusRef={finalFocusRef}
      footer={
        <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      {first.state === 'loading' && (
        <div className="flex flex-col gap-4" role="status" aria-busy="true">
          <span className="sr-only">Loading history</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}
      {first.state === 'error' && <ErrorState message={first.errorMessage ?? 'The history didn’t load.'} onRetry={first.retry} />}
      {first.state === 'ready' && items.length === 0 && <EmptyState title="No changes recorded yet." icon={History} />}
      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y divide-border">
            {items.map((change) => (
              <Entry key={change.id} change={change} />
            ))}
          </ul>
          <p role="status" className="sr-only">
            {announcement}
          </p>
          {more === 'error' && (
            <p role="alert" className="text-sm text-destructive">
              {moreError}
            </p>
          )}
          {next && (
            <Button type="button" variant="outline" className="self-start" loading={more === 'loading'} onClick={() => void loadMore()}>
              {more === 'error' ? 'Try again' : 'Load more'}
            </Button>
          )}
        </div>
      )}
    </ResponsiveDialog>
  );
}
