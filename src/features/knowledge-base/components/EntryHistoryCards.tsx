import { Link } from 'react-router-dom';
import { DetailItem, DetailSection } from '../../../components/shared/DetailSection';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import type { KnowledgeEntryDetail } from '../../../lib/api/knowledgeApi';
import { formatPeso } from '../../../lib/utils/format';
import { formatDay, formatDays, workTime } from '../lib/entryFormat';

/** "From your repairs" (AC-13). Every number comes from the API's stats; costs only reach editors. */
export function FromYourRepairsCard({ stats }: { stats: KnowledgeEntryDetail['stats'] }) {
  const work = workTime(stats);
  return (
    <DetailSection title="From your repairs">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-1 xl:grid-cols-2">
        <DetailItem label="Seen">
          <span className="text-heading font-semibold tabular-nums">
            {stats.seenCount === 1 ? '1 time' : `${stats.seenCount} times`}
          </span>
        </DetailItem>
        <DetailItem label="Last seen">
          <span className="tabular-nums">{stats.lastSeenAt ? formatDay(stats.lastSeenAt) : 'Not seen on a ticket yet'}</span>
        </DetailItem>
        <DetailItem label="Typical work time">
          {work ? (
            <>
              <span className="font-medium tabular-nums">{work.value}</span>
              <span className="block text-caption text-muted-foreground">{work.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground">No estimate yet</span>
          )}
        </DetailItem>
        {stats.typicalDays != null && (
          <DetailItem label="Typical time to close">
            <span className="tabular-nums">Usually closed in {formatDays(stats.typicalDays)}</span>
          </DetailItem>
        )}
        {stats.typicalCost != null && (
          <DetailItem label="Typical cost">
            <span className="font-medium tabular-nums">About {formatPeso(stats.typicalCost)}</span>
          </DetailItem>
        )}
      </dl>
    </DetailSection>
  );
}

/** Vehicles that keep coming back with this problem (AC-14). Hidden when none. */
export function RepeatVehiclesCard({ vehicles }: { vehicles: KnowledgeEntryDetail['repeatVehicles'] }) {
  if (vehicles.length === 0) return null;
  return (
    <DetailSection title="Keeps coming back">
      <p className="-mt-2 text-caption text-muted-foreground">Vehicles with this problem more than once in the last year.</p>
      <ul className="flex flex-col divide-y divide-border">
        {vehicles.map((v) => (
          <li key={v.plate} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <span className="font-medium text-foreground">{v.plate}</span>
            <span className="text-right text-body text-muted-foreground tabular-nums">
              {v.count} times · last {formatDay(v.lastAt)}
            </span>
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}

/** The last tickets linked to this entry, for editors (AC-15). Hidden when none. */
export function RecentTicketsCard({ tickets }: { tickets: NonNullable<KnowledgeEntryDetail['recentTickets']> }) {
  if (tickets.length === 0) return null;
  return (
    <DetailSection title="Recent tickets">
      <ul className="flex flex-col divide-y divide-border">
        {tickets.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-col">
              <Link
                to={`/repairs/${t.id}`}
                className="rounded-md text-body font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t.repairNumber}
              </Link>
              <span className="text-caption text-muted-foreground tabular-nums">
                {t.plate} · {formatDay(t.createdAt)}
              </span>
            </div>
            <StatusBadge status={t.status} />
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}
