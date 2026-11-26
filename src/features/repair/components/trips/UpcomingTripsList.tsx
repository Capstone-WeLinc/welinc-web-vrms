import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { VehicleScheduleState } from '../../hooks/useVehicleSchedule';
import { tripStatusLabel, tripWhen } from '../../lib/expedite';
import { BMS_UNREACHABLE, NO_TRIPS, visibleTrips } from '../../lib/tripsList';

/**
 * Spec 0029 (child 0003), AC-16: a truck's upcoming trips and Job Orders from BMS, read live.
 * When BMS can't answer it says so, and nothing else on the page waits on it.
 */
export function UpcomingTripsList({ state }: { state: VehicleScheduleState }) {
  const { trips, loading, retrying, retry } = state;

  if (loading) {
    return (
      <div aria-busy="true" className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <span className="sr-only">Loading upcoming trips from BMS</span>
      </div>
    );
  }
  if (!trips) return null;
  if (!trips.available) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-muted-foreground">
        {BMS_UNREACHABLE}
        <Button type="button" variant="link" size="sm" className="h-auto min-h-11 px-0 md:min-h-0" loading={retrying} onClick={retry}>
          {!retrying && <RotateCw aria-hidden="true" />}
          Retry
        </Button>
      </div>
    );
  }
  if (trips.items.length === 0) {
    return <p className="text-body text-muted-foreground">{NO_TRIPS}</p>;
  }

  const { shown, more } = visibleTrips(trips.items);
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {shown.map((trip) => (
          <li key={trip.bookingNumber} className="flex items-start justify-between gap-3 px-3 py-2">
            <div className="flex min-w-0 flex-col">
              <span className="text-body font-medium text-foreground">{tripWhen(trip)}</span>
              <span className="font-mono text-caption text-muted-foreground [overflow-wrap:anywhere]">
                {trip.jobOrderNumber ? `${trip.jobOrderNumber}, ${trip.bookingNumber}` : trip.bookingNumber}
              </span>
            </div>
            <span className="shrink-0 text-caption text-muted-foreground">{tripStatusLabel(trip.status)}</span>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p className="text-caption text-muted-foreground">
          And {more} more in the next 14 days.
        </p>
      )}
    </div>
  );
}
