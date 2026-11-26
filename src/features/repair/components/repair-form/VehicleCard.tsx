import { Link } from 'react-router-dom';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Callout } from '../../../../components/shared/Callout';
import { formatShortDate } from '../../../../lib/utils/format';
import type { VehicleSummaryState } from '../../hooks/useVehicleSummary';

export const OPEN_TICKET_NOTE = (repairNumber: string) =>
  `This truck already has an open repair, ${repairNumber}. Add the new issues there.`;

/** The truck's facts after a pick, and the open ticket block (spec 0016, AC-3, AC-9 and AC-12). */
export function VehicleCard({ state }: { state: VehicleSummaryState }) {
  const { summary, loading, failed, retrying, retry } = state;

  if (loading) {
    return (
      <div aria-busy="true" className="flex flex-col gap-2 sm:col-span-2">
        <Skeleton className="h-16 w-full" />
        <span className="sr-only">Loading vehicle details</span>
      </div>
    );
  }
  if (failed) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-muted-foreground sm:col-span-2">
        Couldn’t load the vehicle details.
        <Button type="button" variant="link" size="sm" className="h-auto min-h-11 px-0 md:min-h-0" loading={retrying} onClick={retry}>
          {!retrying && <RotateCw aria-hidden="true" />}
          Retry
        </Button>
      </div>
    );
  }
  if (!summary) return null;

  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      {summary.openTicket && (
        <Callout tone="warning">
          {OPEN_TICKET_NOTE(summary.openTicket.repairNumber)}{' '}
          <Link to={`/repairs/${summary.openTicket.id}`} className="font-medium underline underline-offset-2">
            Open {summary.openTicket.repairNumber}
          </Link>
        </Callout>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border bg-secondary/40 p-3 text-body sm:grid-cols-3">
        <Fact term="Model">{summary.model}</Fact>
        <Fact term="Type">{summary.type?.name ?? 'Not set'}</Fact>
        <Fact term="Status">
          <StatusBadge status={summary.status} />
        </Fact>
        <Fact term="Last reading">{summary.lastOdometer > 0 ? `${summary.lastOdometer.toLocaleString('en-US')} km` : 'None yet'}</Fact>
        <Fact term="Last repair">{summary.lastRepairAt ? formatShortDate(summary.lastRepairAt) : 'None yet'}</Fact>
      </dl>
    </div>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-muted-foreground">{term}</dt>
      <dd className="break-words font-medium">{children}</dd>
    </div>
  );
}
