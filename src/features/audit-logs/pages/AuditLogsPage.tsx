import { useEffect, useState } from 'react';
import { ClipboardList, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/PageHeader';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { resolveRange } from '../../../components/shared/date-range/dateRange';
import { getAuditActors } from '../../../lib/api/auditApi';
import type { AuditActor } from '../../../types';
import { AuditFilters } from '../components/AuditFilters';
import { AuditTimeline, AuditTimelineSkeleton } from '../components/AuditTimeline';
import { useAuditEvents } from '../hooks/useAuditEvents';
import { DEFAULT_AUDIT_FILTERS, hasActiveAuditFilters, type AuditFilterValues } from '../lib/auditEvents';

const PANEL = 'rounded-xl border border-border bg-card shadow-xs';

export function AuditLogsPage() {
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
      <div className={PANEL}>
        <ErrorState
          title="We couldn’t load the audit log"
          message={timeline.errorMessage ?? 'The audit log didn’t load.'}
          onRetry={timeline.retry}
        />
      </div>
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
        subtitle="Every change to repair tickets: who made it and when."
        icon={ClipboardList}
      />
      <AuditFilters
        value={filters}
        actors={actors}
        rangeError={range.status === 'invalid' ? range.error : undefined}
        onChange={setFilters}
      />
      <div aria-busy={timeline.state === 'loading' || undefined}>{body}</div>
    </div>
  );
}
