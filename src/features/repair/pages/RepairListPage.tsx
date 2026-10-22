import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Plus, SearchX, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/shared/data-table/DataTable';
import { lastPage, type Column, type RowAction } from '../../../components/shared/data-table/types';
import { ErrorState } from '../../../components/shared/ErrorState';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { getAvailableMechanics, getGarages, type GarageOption, type MechanicOption } from '../../../lib/api/vrmsConfigApi';
import { dueLabel } from '../../../lib/utils/due';
import { useAuthStore } from '../../../store/authStore';
import type { RepairTicket } from '../../../types';
import { RepairListFilters } from '../components/RepairListFilters';
import { useRepairList } from '../hooks/useRepairList';
import { useRepairListFilters } from '../hooks/useRepairListFilters';
import { hasActiveFilters, REPAIR_LIST_PAGE_SIZE, repairListParams } from '../lib/repairListFilters';

function DueCell({ ticket, now }: { ticket: RepairTicket; now: number }) {
  const due = dueLabel(ticket, now);
  if (!due) return <span>—</span>;
  if (!due.overdue) return <span>{due.text}</span>;
  return (
    <span className="inline-flex items-start gap-1.5 font-medium text-destructive">
      <AlertTriangle role="img" aria-label="Overdue" className="mt-0.5 size-4 shrink-0" />
      {due.text}
    </span>
  );
}

function IssueCell({ ticket }: { ticket: RepairTicket }) {
  if (!ticket.issueDescription) return <span>—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Focusable so keyboard users can read the full issue too. */}
        <span
          tabIndex={0}
          className="block max-w-32 truncate rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring xl:max-w-40 2xl:max-w-72"
        >
          {ticket.issueDescription}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{ticket.issueDescription}</TooltipContent>
    </Tooltip>
  );
}

function listColumns(now: number): Column<RepairTicket>[] {
  return [
    {
      id: 'repair',
      header: 'Repair #',
      mobile: 'title',
      // Beside the status badge on a 375px card the number wraps once, at a hyphen.
      cell: (t) => <span className="text-sm font-medium md:whitespace-nowrap">{t.repairNumber}</span>,
    },
    { id: 'vehicle', header: 'Vehicle', mobile: 'subtitle', cell: (t) => <span className="whitespace-nowrap">{t.vehiclePlate}</span> },
    { id: 'status', header: 'Status', mobile: 'badge', cell: (t) => <StatusBadge status={t.status} /> },
    { id: 'due', header: 'Due', mobile: 'field', cell: (t) => <DueCell ticket={t} now={now} /> },
    { id: 'issue', header: 'Issue', mobile: 'field', cell: (t) => <IssueCell ticket={t} /> },
    { id: 'garage', header: 'Garage', mobile: 'field', cell: (t) => t.garageLocation ?? '—' },
  ];
}

export function RepairListPage() {
  const isAdmin = useAuthStore((state) => state.user?.role === 'ADMIN');
  const navigate = useNavigate();
  const location = useLocation();
  const { filters, page, searchText, setSearchText, setFilters, setPage, clearFilters } = useRepairListFilters(isAdmin);
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
    if (isAdmin) {
      getAvailableMechanics()
        .then((list) => {
          if (!cancelled) setMechanics(list);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

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
    <Button asChild>
      <Link to="/repairs/new">
        <Plus aria-hidden="true" />
        New repair ticket
      </Link>
    </Button>
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
    : isAdmin
      ? { title: 'No open repair tickets', description: 'New tickets show up here.', icon: ClipboardList, action: newTicket }
      : {
          title: 'No repair tickets assigned to you',
          description: 'Tickets an admin assigns to you show up here.',
          icon: ClipboardList,
        };

  return (
    <div>
      <PageHeader
        title="Repair tickets"
        subtitle={isAdmin ? 'Open repair tickets across every garage.' : 'Open repair tickets assigned to you.'}
        icon={Wrench}
        action={isAdmin ? newTicket : undefined}
      />

      <RepairListFilters
        value={filters}
        searchText={searchText}
        garages={garages}
        mechanics={isAdmin ? mechanics : null}
        onSearchTextChange={setSearchText}
        onChange={setFilters}
      />

      {list.state === 'error' ? (
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <ErrorState
            title="We couldn’t load repair tickets"
            message={list.errorMessage ?? 'Repair tickets didn’t load.'}
            onRetry={list.retry}
          />
        </div>
      ) : (
        <DataTable
          columns={listColumns(list.fetchedAt)}
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
    </div>
  );
}
