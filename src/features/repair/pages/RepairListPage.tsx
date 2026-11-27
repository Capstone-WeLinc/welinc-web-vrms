import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Clock, Plus, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/shared/data-table/DataTable';
import { lastPage, type Column, type RowAction } from '../../../components/shared/data-table/types';
import { ErrorState } from '../../../components/shared/ErrorState';
import { MechanicProblemBadge } from '../../../components/shared/MechanicProblemBadge';
import { FromVmmsChip } from '../../../components/shared/FromVmmsChip';
import { TruckRemovedChip } from '../../../components/shared/TruckRemovedChip';
import { PlateChip } from '../../../components/shared/PlateChip';
import { PriorityBadge } from '../../../components/shared/PriorityBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { getAvailableMechanics, getGarages, type GarageOption, type MechanicOption } from '../../../lib/api/vrmsConfigApi';
import { dueLabel } from '../../../lib/utils/due';
import { Can } from '../../../lib/permissions/Can';
import { useCan, usePermissions } from '../../../lib/permissions/usePermissions';
import type { RepairTicket } from '../../../types';
import { RepairListFilters } from '../components/RepairListFilters';
import { useRepairList } from '../hooks/useRepairList';
import { useRepairListFilters } from '../hooks/useRepairListFilters';
import { useReferrals } from '../hooks/useReferrals';
import { ReferralsView } from '../components/referrals/ReferralsView';
import { referralStatusParam, repairsView, type RepairsView } from '../lib/referrals';
import { RepairViewChips } from '../components/RepairViewChips';
import { REPAIR_VIEW_CONTEXT, REPAIR_VIEW_TITLES, viewAllowed } from '../lib/repairViews';
import type { ReferralStatus } from '../../../lib/api/referralsApi';
import { hasActiveFilters, REPAIR_LIST_PAGE_SIZE, repairListParams } from '../lib/repairListFilters';

function DueCell({ ticket, now }: { ticket: RepairTicket; now: number }) {
  const due = dueLabel(ticket, now);
  if (!due) return <span className="text-muted-foreground">—</span>;
  // Spec 0030, AC-12
  if (due.dueSoon) {
    return (
      <span className="inline-flex items-start gap-1.5 font-medium text-warning">
        <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {due.text}
      </span>
    );
  }
  if (!due.overdue) return <span>{due.text}</span>;
  return (
    <span className="inline-flex items-start gap-1.5 font-medium text-destructive">
      <AlertTriangle role="img" aria-label="Overdue" className="mt-0.5 size-4 shrink-0" />
      {due.text}
    </span>
  );
}

// design.md "Naming a ticket": the plate leads, the ticket ID is metadata and never breaks.
function TruckCell({ ticket }: { ticket: RepairTicket }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <PlateChip plate={ticket.vehiclePlate} />
        {ticket.vehicleModel && <span className="text-body font-normal text-foreground">{ticket.vehicleModel}</span>}
      </span>
      <span translate="no" className="text-caption font-normal whitespace-nowrap text-muted-foreground tabular-nums">{ticket.repairNumber}</span>
      {/* Spec 0029, AC-12 */}
      {ticket.fromVmmsWorkOrder && (
        <span>
          <FromVmmsChip workOrderNumber={ticket.fromVmmsWorkOrder} />
        </span>
      )}
      {/* Spec 0029, AC-35 */}
      {ticket.truckRemoved && (
        <span>
          <TruckRemovedChip />
        </span>
      )}
    </span>
  );
}

function IssueCell({ ticket }: { ticket: RepairTicket }) {
  if (!ticket.issueDescription) return <span className="text-muted-foreground">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Two lines in the list; focusable so keyboard users can read the full issue too. */}
        <span
          tabIndex={0}
          className="line-clamp-2 min-w-48 rounded-md text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {ticket.issueDescription}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{ticket.issueDescription}</TooltipContent>
    </Tooltip>
  );
}

function MechanicCell({ ticket }: { ticket: RepairTicket }) {
  const names = (ticket.mechanics ?? []).map((m) => m.name);
  if (names.length === 0) return <span className="text-muted-foreground">Unassigned</span>;
  return <span>{names.join(', ')}</span>;
}

function listColumns(rows: RepairTicket[], now: number, seesAll: boolean): Column<RepairTicket>[] {
  // design.md "Empty values": a column empty for every row is hidden (due dates arrive with feature 42).
  const anyDue = rows.some((t) => dueLabel(t, now) !== null);
  const columns: (Column<RepairTicket> | false)[] = [
    { id: 'truck', header: 'Truck', mobile: 'title', cell: (t) => <TruckCell ticket={t} /> },
    { id: 'issue', header: 'Issue', mobile: 'subtitle', cell: (t) => <IssueCell ticket={t} /> },
    {
      id: 'priority',
      header: 'Priority',
      mobile: 'field',
      cell: (t) => (t.priority ? <PriorityBadge priority={t.priority} /> : <span className="text-muted-foreground">—</span>),
    },
    { id: 'status', header: 'Status', mobile: 'badge', cell: (t) => (
        <span className="flex flex-wrap items-center gap-1">
          <StatusBadge status={t.status} />
          <MechanicProblemBadge ticket={t} />
        </span>
      ),
    },
    // A mechanic only sees their own tickets, so the column says nothing new for them.
    seesAll && { id: 'mechanic', header: 'Mechanic', mobile: 'field', cell: (t) => <MechanicCell ticket={t} /> },
    anyDue && { id: 'due', header: 'Due', mobile: 'field', cell: (t) => <DueCell ticket={t} now={now} /> },
    { id: 'garage', header: 'Garage', mobile: 'field', cell: (t) => t.garageLocation ?? <span className="text-muted-foreground">—</span> },
  ];
  return columns.filter((column): column is Column<RepairTicket> => column !== false);
}

export function RepairListPage() {
  // Spec 0011: ticket.view_all reads every ticket and can filter by mechanic
  const seesAll = useCan('ticket.view_all');
  const canCreate = useCan('ticket.create');
  // Spec 0029, AC-7: VMMS referrals are a second view of this page, for integration.respond only
  const canRespond = useCan('integration.respond');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = repairsView(searchParams.get('view'), canRespond);
  const referralStatus = referralStatusParam(searchParams.get('referralStatus'));
  // On the Tickets view it loads the waiting ones, for the tab's count
  const referrals = useReferrals(view === 'referrals' ? referralStatus : 'WAITING', canRespond);
  const showView = (next: RepairsView) => setSearchParams(next === 'referrals' ? { view: 'referrals' } : {}, { replace: true });
  const showReferralStatus = (next: ReferralStatus) =>
    setSearchParams(next === 'WAITING' ? { view: 'referrals' } : { view: 'referrals', referralStatus: next }, { replace: true });
  const { filters: urlFilters, page, searchText, setSearchText, setFilters, setPage, clearFilters } = useRepairListFilters(seesAll);
  const { inRoster } = usePermissions();
  // Spec 0027, AC-4: a preset this viewer's sidebar doesn't offer (an old link) reads as none.
  const preset = urlFilters.view && viewAllowed(urlFilters.view, { seesAll, inRoster }) ? urlFilters.view : null;
  const filters = preset === urlFilters.view ? urlFilters : { ...urlFilters, view: null };
  const list = useRepairList(repairListParams(filters, page));
  const [garages, setGarages] = useState<GarageOption[]>([]);
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    // Without options a filter keeps only its "All" choice; the list still works.
    getGarages()
      .then((list) => {
        if (!cancelled) setGarages(list);
      })
      .catch(() => {});
    if (seesAll) {
      getAvailableMechanics()
        .then((list) => {
          if (!cancelled) setMechanics(list);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [seesAll]);

  // A page past the last one (tickets closed since the link was made) moves to the last page (AC-8).
  const last = lastPage(list.total, REPAIR_LIST_PAGE_SIZE);
  const pastEnd = list.state === 'ready' && page > last;
  useEffect(() => {
    if (pastEnd) setPage(last);
  }, [pastEnd, last, setPage]);

  // The detail page's back link returns to this exact view.
  const open = (path: string) => navigate(path, { state: { from: location.pathname + location.search } });

  const rowActions = (row: RepairTicket): RowAction[] => [
    { label: 'View details', onSelect: () => open(`/repairs/${row.id}?mode=readonly`) },
    { label: 'Edit ticket', onSelect: () => open(`/repairs/${row.id}`) },
  ];

  const newTicket = (
    <Can I="ticket.create">
      <Button asChild>
        <Link to="/repairs/new">
          <Plus aria-hidden="true" />
          New repair ticket
        </Link>
      </Button>
    </Can>
  );

  const empty = hasActiveFilters(filters)
    ? {
        title: 'No tickets match these filters',
        description: 'Try another search, or clear the filters to see every open ticket.',
        icon: SearchX,
        action: (
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        ),
      }
    : seesAll
      ? { title: 'No open repair tickets', description: 'New tickets show up here.', icon: ClipboardList, action: newTicket }
      : {
          title: 'No repair tickets assigned to you',
          description: 'Tickets an admin assigns to you show up here.',
          icon: ClipboardList,
        };

  return (
    <div>
      <PageHeader
        title={view === 'tickets' && preset ? REPAIR_VIEW_TITLES[preset] : seesAll ? 'Repair tickets' : 'My repairs'}
        context={
          view === 'referrals'
            ? 'Trucks VMMS inspections sent for repair. Open a ticket from each one.'
            : preset
              ? REPAIR_VIEW_CONTEXT[preset]
              : seesAll
              ? 'Open repair tickets across every garage.'
              : 'Open repair tickets assigned to you.'
        }
        action={canCreate && view === 'tickets' ? newTicket : undefined}
      />

      {canRespond && (
        <SegmentedControl aria-label="View" value={view} onValueChange={(next) => showView(next as RepairsView)} className="mb-4">
          <SegmentedControlItem value="tickets">Tickets</SegmentedControlItem>
          <SegmentedControlItem value="referrals">
            Referrals
            {referrals.waitingCount !== null && referrals.waitingCount > 0 && (
              <span className="font-mono text-caption">{referrals.waitingCount.toLocaleString()}</span>
            )}
          </SegmentedControlItem>
        </SegmentedControl>
      )}

      {view === 'referrals' ? (
        <ReferralsView status={referralStatus} onStatusChange={showReferralStatus} list={referrals} />
      ) : (
        <>
      <RepairViewChips />
      <RepairListFilters
        value={filters}
        searchText={searchText}
        garages={garages}
        mechanics={seesAll ? mechanics : null}
        onSearchTextChange={setSearchText}
        onChange={setFilters}
      />

      {list.state === 'error' ? (
        <ErrorState
          kind="page"
          title="We couldn’t load repair tickets"
          message={list.errorMessage ?? 'Repair tickets didn’t load.'}
          onRetry={list.retry}
        />
      ) : (
        <DataTable
          columns={listColumns(list.rows, list.fetchedAt, seesAll)}
          rows={list.rows}
          getRowId={(row) => row.id}
          state={pastEnd ? 'loading' : list.state}
          label="Open repair tickets"
          onRowClick={(row) => open(`/repairs/${row.id}`)}
          rowActions={rowActions}
          pagination={{ page, pageSize: REPAIR_LIST_PAGE_SIZE, total: list.total, onPageChange: setPage }}
          empty={empty}
        />
      )}
        </>
      )}
    </div>
  );
}
