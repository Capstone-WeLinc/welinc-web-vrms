import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { BadgePill } from '../../../components/shared/BadgePill';
import { ErrorState } from '../../../components/shared/ErrorState';
import { PlateChip } from '../../../components/shared/PlateChip';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { RoleBadge } from '../../../components/shared/RoleBadge';
import type { MechanicRosterRow } from '../../../lib/api/vrmsConfigApi';
import { getInitials } from '../../../lib/utils/format';
import { dueLabel } from '../../../lib/utils/due';
import { useAuthStore } from '../../../store/authStore';
import type { RepairTicket } from '../../../types';
import { MechanicOpenTickets } from '../../user-management/components/MechanicOpenTickets';
import { WORK_LABELS, WORK_STATE_CLASSES, type WorkState } from '../../user-management/lib/workload';
import { useMechanicRoster } from '../hooks/useMechanicRoster';
import {
  buildTeam,
  FREE_SHOWN,
  showsEmail,
  WORKLOAD_GROUPS,
  workloadGroupOf,
  workloadSegments,
  type TeamChip,
  type TeamPerson,
  type TeamSummary,
  type WorkloadGroup,
} from '../lib/team';
import { DashboardPanel } from './DashboardPanel';
import { DashboardTicketRow, TicketRowList } from './DashboardTicketRow';

type OpenPerson = { id: string; name: string };

// The Admin pipeline's chart colors, so a status reads the same on both dashboards.
const GROUP_FILL: Record<WorkloadGroup, string> = {
  IN_PROGRESS: 'fill-chart-1',
  ASSIGNED: 'fill-chart-2',
  FOR_VERIFICATION: 'fill-chart-4',
  OTHER: 'fill-chart-5',
};
const GROUP_DOT: Record<WorkloadGroup, string> = {
  IN_PROGRESS: 'bg-chart-1',
  ASSIGNED: 'bg-chart-2',
  FOR_VERIFICATION: 'bg-chart-4',
  OTHER: 'bg-chart-5',
};

function Dot({ className }: { className: string }) {
  return <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', className)} />;
}

/** Spec 0022, AC-7: the summary line, as three counts with the dot of what each means. */
function SummaryStrip({ summary }: { summary: TeamSummary }) {
  const items = [
    { value: summary.working, label: 'working', dot: GROUP_DOT.IN_PROGRESS },
    { value: summary.waiting, label: 'with work waiting', dot: GROUP_DOT.ASSIGNED },
    { value: summary.free, label: 'free', dot: 'bg-chart-3' },
  ];
  return (
    <ul aria-label="Team summary" className="flex flex-wrap gap-x-5 gap-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
          <Dot className={item.dot} />
          <span className="text-lg font-semibold text-foreground tabular-nums">{item.value}</span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function Legend() {
  return (
    <ul aria-label="Bar colors" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {WORKLOAD_GROUPS.map((group) => (
        <li key={group.key} className="flex items-center gap-1.5">
          <Dot className={GROUP_DOT[group.key]} />
          {group.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * A person's open tickets by status as one bar, scaled to the busiest person on the list so bar
 * lengths compare across the team. Widths are SVG units, so no inline style.
 */
function WorkloadBar({ row, scale }: { row: MechanicRosterRow; scale: number }) {
  const segments = workloadSegments(row.byStatus);
  const label = `${row.total} open: ${segments.map((s) => `${s.count} ${s.label.toLowerCase()}`).join(', ')}`;
  const starts = segments.map((_, index) => segments.slice(0, index).reduce((sum, s) => sum + s.count, 0));
  return (
    <div role="img" aria-label={label} className="flex items-center gap-2">
      <svg
        viewBox={`0 0 ${Math.max(scale, row.total, 1)} 1`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
      >
        {segments.map((segment, index) => (
          <rect key={segment.key} x={starts[index]} y={0} width={segment.count} height={1} className={GROUP_FILL[segment.key]} />
        ))}
      </svg>
      <span aria-hidden="true" className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
        {row.total} open
      </span>
    </div>
  );
}

function ChipLink({ chip }: { chip: TeamChip }) {
  return (
    <li>
      <Link
        to={`/repairs/${chip.ticket.id}`}
        className="inline-flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-background py-1 pr-2.5 pl-1 text-xs text-foreground outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none md:min-h-9"
      >
        <PlateChip plate={chip.ticket.vehiclePlate} />
        <span className="flex items-center gap-1.5">
          <Dot className={GROUP_DOT[workloadGroupOf(chip.ticket.status)]} />
          {chip.text}
        </span>
        {chip.overdue && <span className="font-medium text-destructive">{chip.overdue}</span>}
      </Link>
    </li>
  );
}

function Avatar({ name, muted }: { name: string; muted: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        muted ? 'bg-status-cancelled-bg text-status-cancelled-fg' : 'bg-primary/10 text-primary',
      )}
    >
      {getInitials(name)}
    </span>
  );
}

function PersonRow({
  person,
  shared,
  scale,
  onOpen,
}: {
  person: TeamPerson;
  shared: ReadonlySet<string>;
  /** The highest roster total on the list, the bars' full width. */
  scale: number;
  onOpen: (person: OpenPerson) => void;
}) {
  const { row } = person;
  const open = row ? () => onOpen({ id: row.authUserId, name: row.name }) : undefined;
  const email = row?.email && showsEmail(person, shared) ? row.email : null;
  const work: WorkState = row?.occupied ? 'occupied' : 'free';

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-start md:gap-6 md:px-5">
      <div className="flex min-w-0 items-start gap-3 md:w-64 md:shrink-0">
        <Avatar name={person.name} muted={!row?.isActive} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {open ? (
              <Button
                type="button"
                variant="link"
                onClick={open}
                title={row?.email ?? undefined}
                className="h-auto min-h-11 justify-start px-0 text-left text-sm font-semibold whitespace-normal text-foreground wrap-anywhere md:min-h-0"
              >
                {person.name}
              </Button>
            ) : (
              <span className="text-sm font-semibold wrap-anywhere text-foreground">{person.name}</span>
            )}
            {row?.role === 'CHIEF_MECHANIC' && <RoleBadge role="CHIEF_MECHANIC" />}
            {row && !row.isActive && <BadgePill className="bg-status-cancelled-bg text-status-cancelled-fg">Inactive</BadgePill>}
            {row?.isActive && <BadgePill className={WORK_STATE_CLASSES[work]}>{WORK_LABELS[work]}</BadgePill>}
          </div>
          {email && <span className="text-xs wrap-anywhere text-muted-foreground">{email}</span>}
          {row && <WorkloadBar row={row} scale={scale} />}
        </div>
      </div>
      <ul aria-label={`${person.name}'s tickets`} className="flex min-w-0 flex-1 flex-wrap gap-2 md:pt-0.5">
        {person.chips.map((chip) => (
          <ChipLink key={chip.ticket.id} chip={chip} />
        ))}
        {person.more > 0 && (
          <li>
            {open ? (
              <Button type="button" variant="ghost" size="sm" onClick={open} className="min-h-11 md:min-h-9">
                +{person.more} more
              </Button>
            ) : (
              <span className="inline-flex min-h-9 items-center text-xs text-muted-foreground">+{person.more} more</span>
            )}
          </li>
        )}
      </ul>
    </li>
  );
}

function FreeLine({ people, shared }: { people: MechanicRosterRow[]; shared: ReadonlySet<string> }) {
  const [expanded, setExpanded] = useState(false);
  if (people.length === 0) return null;
  const shown = expanded ? people : people.slice(0, FREE_SHOWN);
  const names = shown.map((row) => (row.email && showsEmail(row, shared) ? `${row.name} (${row.email})` : row.name));

  return (
    <div className="flex flex-col gap-1 bg-muted/40 px-4 py-3 text-sm md:px-5">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="flex items-center gap-2 font-semibold text-foreground">
          <Dot className="bg-chart-3" />
          Free ({people.length})
        </span>
        <span className="wrap-anywhere text-muted-foreground">{names.join(', ')}</span>
      </p>
      {people.length > FREE_SHOWN && (
        <Button
          type="button"
          variant="link"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="h-auto min-h-11 self-start px-0 md:min-h-0"
        >
          {expanded ? 'Show fewer' : 'Show all'}
        </Button>
      )}
    </div>
  );
}

function TeamSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col divide-y divide-border">
      <span className="sr-only">Loading the team</span>
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex items-start gap-3 px-4 py-3.5 md:px-5">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-1.5 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Spec 0022, AC-10 to AC-15: who holds which truck, how long it has sat, and who is free. Owns the
 * roster read, so a roster failure shows here and never blanks the rest of the dashboard.
 */
export function TeamSection({
  active,
  fetchedAt,
  onTicketsChanged,
}: {
  active: RepairTicket[];
  fetchedAt: number;
  /** Refetch the dashboard's tickets after a Reassign or Unassign (AC-14). */
  onTicketsChanged: () => void;
}) {
  const viewerId = useAuthStore((state) => state.user?.id);
  const roster = useMechanicRoster();
  // The last person opened stays set while the dialog closes, so its title does not flicker
  const [openPerson, setOpenPerson] = useState<OpenPerson | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const openDialog = (person: OpenPerson) => {
    setOpenPerson(person);
    setDialogOpen(true);
  };

  const team = useMemo(
    () => (roster.state === 'ready' ? buildTeam(roster.rows, active, viewerId, fetchedAt) : null),
    [roster.state, roster.rows, active, viewerId, fetchedAt],
  );

  const changed = () => {
    onTicketsChanged();
    roster.refresh();
  };

  const hasPeople = !!team && team.people.length > 0;
  const scale = team ? Math.max(0, ...team.people.map((p) => p.row?.total ?? 0)) : 0;

  return (
    <DashboardPanel
      id="team-heading"
      title="Team"
      icon={Users}
      tone="primary"
      meta={
        team && !team.empty ? (
          <div className="flex flex-col gap-2">
            <SummaryStrip summary={team.summary} />
            {hasPeople && <Legend />}
          </div>
        ) : null
      }
    >
      {roster.state === 'loading' && <TeamSkeleton />}

      {roster.state === 'error' && (
        <ErrorState
          title="We couldn’t load the team"
          message={roster.errorMessage ?? 'Couldn’t load the team.'}
          onRetry={roster.retry}
        />
      )}

      {team && (
        <div className="flex flex-col divide-y divide-border">
          {team.noMechanic.length > 0 && (
            <div className="flex flex-col">
              <h3 className="flex items-center gap-2 px-4 pt-3 pb-1 text-sm font-semibold text-destructive md:px-5">
                <AlertTriangle aria-hidden="true" className="size-4" />
                No mechanic
                <span className="font-normal tabular-nums">({team.noMechanic.length})</span>
              </h3>
              <TicketRowList label="Open tickets with no mechanic">
                {team.noMechanic.map((ticket) => {
                  const due = dueLabel(ticket, fetchedAt);
                  return <DashboardTicketRow key={ticket.id} ticket={ticket} facts={due ? [due] : []} />;
                })}
              </TicketRowList>
            </div>
          )}

          {team.empty && <p className="px-4 py-6 text-sm text-muted-foreground md:px-5">No mechanics yet.</p>}

          {hasPeople && (
            <ul aria-label="People with open work" className="divide-y divide-border">
              {team.people.map((person) => (
                <PersonRow key={person.key} person={person} shared={team.shared} scale={scale} onOpen={openDialog} />
              ))}
            </ul>
          )}

          {!team.empty && <FreeLine people={team.free} shared={team.shared} />}
        </div>
      )}

      {/* AC-14: keeps the person it opened with, so it stays open if they drop off the list */}
      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={openPerson ? `${openPerson.name}'s open tickets` : 'Open tickets'}
      >
        {openPerson && <MechanicOpenTickets user={openPerson} onChanged={changed} className="" />}
      </ResponsiveDialog>
    </DashboardPanel>
  );
}
