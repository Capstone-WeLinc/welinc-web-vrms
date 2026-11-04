import { useState } from 'react';
import { ArrowDownUp, HardHat, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/PageHeader';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import type { MechanicRosterRow } from '../../../lib/api/vrmsConfigApi';
import { nameKey, sharedNames } from '../../repair/lib/mechanicOrder';
import { MechanicOpenTickets } from '../../user-management/components/MechanicOpenTickets';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { MechanicRow } from '../components/MechanicRow';
import { MechanicsFilters } from '../components/MechanicsFilters';
import { useMechanicRoster } from '../hooks/useMechanicRoster';
import { useMechanicsFilters } from '../hooks/useMechanicsFilters';
import { hasMechanicsFilters, idsOf, keepOrder, matchesMechanicsFilters, needsSortAgain, sameIds, sortRoster } from '../lib/mechanicsList';

type FixedOrder = { key: string; ids: string[] };

/**
 * Spec 0022: the read only workload screen for people with mechanics.view. The order is fixed
 * when the list loads or the filters change; refreshes update counts in place (AC-8).
 */
export function MechanicsPage() {
  const roster = useMechanicRoster();
  const { filters, searchText, setSearchText, setFilters, clearFilters } = useMechanicsFilters();
  const [fixed, setFixed] = useState<FixedOrder | null>(null);
  // The row is kept, not looked up, so the dialog stays open if that person drops off the list (AC-10)
  const [openRow, setOpenRow] = useState<MechanicRosterRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const openTickets = (row: MechanicRosterRow) => {
    setOpenRow(row);
    setDialogOpen(true);
  };

  // Filters run on the live rows, so someone who stops matching leaves at once (AC-7)
  const matching = roster.rows.filter((row) => matchesMechanicsFilters(row, filters));
  const filterKey = `${filters.work}|${filters.search}`;
  let shown: MechanicRosterRow[] = [];
  if (roster.state === 'ready') {
    if (fixed?.key !== filterKey) {
      shown = sortRoster(matching);
      setFixed({ key: filterKey, ids: idsOf(shown) });
    } else {
      shown = keepOrder(matching, fixed.ids);
      // Keep the stored order in step: new people at the end, gone people out
      if (!sameIds(idsOf(shown), fixed.ids)) setFixed({ key: filterKey, ids: idsOf(shown) });
    }
  }

  const shared = sharedNames(roster.rows);
  const sortAgain = () => setFixed({ key: filterKey, ids: idsOf(sortRoster(matching)) });
  const filtered = hasMechanicsFilters(filters);

  return (
    <div>
      <PageHeader title="Mechanics" subtitle="Who is busy, and with what." icon={HardHat} />

      {roster.state !== 'error' && (
        <MechanicsFilters
          value={filters}
          searchText={searchText}
          onSearchTextChange={setSearchText}
          onChange={setFilters}
          onClear={clearFilters}
        />
      )}

      {roster.state === 'loading' && (
        <p role="status" className="py-8 text-center text-sm text-muted-foreground">
          Loading the mechanics…
        </p>
      )}

      {roster.state === 'error' && <ErrorState message={roster.errorMessage ?? ''} onRetry={roster.retry} />}

      {roster.state === 'ready' && roster.rows.length === 0 && (
        <EmptyState title="No mechanics yet" description="People with a mechanic role show here after they sign in." icon={HardHat} />
      )}

      {roster.state === 'ready' && roster.rows.length > 0 && shown.length === 0 && (
        <EmptyState
          title="No mechanics match"
          description="Try another name or work filter."
          icon={SearchX}
          action={
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      )}

      {shown.length > 0 && (
        <>
          <div className="mb-2 flex min-h-11 flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-sm text-muted-foreground">
              {shown.length === 1 ? '1 mechanic' : `${shown.length.toLocaleString()} mechanics`}
              {filtered ? ' match' : ''}
            </p>
            {needsSortAgain(shown) && (
              <Button variant="outline" size="sm" className="h-11 md:h-9" onClick={sortAgain}>
                <ArrowDownUp aria-hidden="true" />
                Sort again
              </Button>
            )}
          </div>
          {roster.refreshFailed && (
            <p role="status" className="mb-2 text-sm text-destructive">
              Couldn’t refresh the list. It tries again in a moment.
            </p>
          )}
          <ul aria-label="Mechanics" className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {shown.map((row) => (
              <MechanicRow key={row.authUserId} row={row} showEmail={shared.has(nameKey(row.name))} onOpen={openTickets} />
            ))}
          </ul>
        </>
      )}

      {openRow && (
        <ResponsiveDialog open={dialogOpen} onOpenChange={setDialogOpen} title={`${openRow.name}’s open tickets`}>
          <MechanicOpenTickets key={openRow.authUserId} user={{ id: openRow.authUserId, name: openRow.name }} readOnly />
        </ResponsiveDialog>
      )}
    </div>
  );
}
