import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control';
import { PageHeader } from '../../../components/layout/PageHeader';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { resolveRange } from '../../../components/shared/date-range/dateRange';
import { getAuditActors } from '../../../lib/api/auditApi';
import type { AuditActor } from '../../../types';
import { AuditFilters } from '../components/AuditFilters';
import { AuditTimeline, AuditTimelineSkeleton } from '../components/AuditTimeline';
import { useAuditEvents } from '../hooks/useAuditEvents';
import { useDeliveries } from '../hooks/useDeliveries';
import { DeliveriesView } from '../components/DeliveriesView';
import { auditView, deliveryFiltersFrom, deliveryParams, type AuditView } from '../lib/deliveries';
import { DEFAULT_AUDIT_FILTERS, hasActiveAuditFilters, type AuditFilterValues } from '../lib/auditEvents';

const PANEL = 'rounded-2xl border border-transparent bg-card shadow-card';

export function AuditLogsPage() {
  // Spec 0029, AC-22: Activity (the ticket log) and Deliveries (messages to VMMS and BMS)
  const [searchParams, setSearchParams] = useSearchParams();
  const view = auditView(searchParams.get('view'));
  const deliveryFilters = deliveryFiltersFrom(searchParams);
  // On Activity it loads once, for the tab's failed count
  const deliveries = useDeliveries(view === 'deliveries' ? deliveryFilters : {}, view === 'deliveries');
  const showView = (next: AuditView) => setSearchParams(next === 'deliveries' ? { view: 'deliveries' } : {}, { replace: true });
  const [filters, setFilters] = useState<AuditFilterValues>(DEFAULT_AUDIT_FILTERS);
  const [actors, setActors] = useState<AuditActor[]>([]);
  const timeline = useAuditEvents(filters);
  const range = resolveRange(filters.range);

  useEffect(() => {
    let cancelled = false;
    // Without the list the Person filter keeps only "All people"; the page still works.
    getAuditActors()
      .then((list) => {
        if (!cancelled) setActors(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  let body;
  if (timeline.state === 'loading') {
    body = <AuditTimelineSkeleton />;
  } else if (timeline.state === 'error') {
    body = (
      <ErrorState
        kind="page"
        title="We couldn’t load the audit log"
        message={timeline.errorMessage ?? 'The audit log didn’t load.'}
        onRetry={timeline.retry}
      />
    );
  } else if (timeline.events.length === 0) {
    body = (
      <div className={PANEL}>
        {hasActiveAuditFilters(filters) ? (
          <EmptyState
            title="No events match these filters"
            description="Try another event type, person or date range."
            icon={History}
            action={
              <Button variant="outline" onClick={() => setFilters(DEFAULT_AUDIT_FILTERS)}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState title="No activity yet" description="Changes to repair tickets show up here." icon={History} />
        )}
      </div>
    );
  } else {
    body = (
      <AuditTimeline
        events={timeline.events}
        hasOlder={timeline.hasOlder}
        more={timeline.more}
        onLoadOlder={timeline.loadOlder}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Audit log"
        context={
          view === 'deliveries'
            ? 'Every message VRMS sends to VMMS and BMS, and how each try went.'
            : 'Every change to repair tickets: who made it and when.'
        }
      />
      <SegmentedControl aria-label="View" value={view} onValueChange={(next) => showView(next as AuditView)} className="mb-4">
        <SegmentedControlItem value="activity">Activity</SegmentedControlItem>
        <SegmentedControlItem value="deliveries">
          Deliveries
          {deliveries.failedCount !== null && deliveries.failedCount > 0 && (
            <span className="font-mono text-caption text-destructive">
              {deliveries.failedCount.toLocaleString()}
              <span className="sr-only"> failed</span>
            </span>
          )}
        </SegmentedControlItem>
      </SegmentedControl>
      {view === 'deliveries' ? (
        <DeliveriesView
          filters={deliveryFilters}
          onFiltersChange={(next) => setSearchParams(deliveryParams(next), { replace: true })}
          list={deliveries}
        />
      ) : (
        <>
          <AuditFilters
            value={filters}
            actors={actors}
            rangeError={range.status === 'invalid' ? range.error : undefined}
            onChange={setFilters}
          />
          <div aria-busy={timeline.state === 'loading' || undefined}>{body}</div>
        </>
      )}
    </div>
  );
}
