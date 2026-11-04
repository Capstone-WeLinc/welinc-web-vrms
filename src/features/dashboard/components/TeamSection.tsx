import { useState } from 'react';
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
import { MechanicOpenTickets } from '../../user-management/components/MechanicOpenTickets';
import type { useMechanicRoster } from '../hooks/useMechanicRoster';
import { FREE_SHOWN, showsEmail, workloadGroupOf, type Team, type TeamChip, type TeamPerson, type WorkloadGroup } from '../lib/team';
import { DashboardPanel } from './DashboardPanel';
import { DashboardTicketRow, TicketRowList } from './DashboardTicketRow';

type OpenPerson = { id: string; name: string };

// The Admin pipeline's chart colors, so a status reads the same on both dashboards.
const GROUP_DOT: Record<WorkloadGroup, string> = {
  IN_PROGRESS: 'bg-chart-1',
  ASSIGNED: 'bg-chart-2',
  FOR_VERIFICATION: 'bg-chart-4',
  OTHER: 'bg-chart-5',
};

const CARD = 'rounded-xl border border-border bg-card shadow-xs';

// Free means no tickets at all (the Free line), so a person card is Occupied or Waiting. Occupied
// keeps the Users page's color; Waiting wears the pending status color, as Assigned does.
const OCCUPIED_BADGE = { label: 'Occupied', className: 'bg-status-in-progress-bg text-status-in-progress-fg' };
const WAITING_BADGE = { label: 'Waiting', className: 'bg-status-pending-bg text-status-pending-fg' };

function Dot({ className }: { className: string }) {
  return <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', className)} />;
}

function ChipLink({ chip }: { chip: TeamChip }) {
  return (
    <li>
      <Link
        to={`/repairs/${chip.ticket.id}`}
        className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-muted/60 px-2 py-1.5 text-xs text-foreground outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none md:min-h-9"
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
        'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        muted ? 'bg-status-cancelled-bg text-status-cancelled-fg' : 'bg-primary/10 text-primary',
      )}
    >
      {getInitials(name)}
    </span>
  );
}

/** Spec 0022, AC-12: one person as a card, with up to 3 trucks and "+N more". */
function PersonCard({
  person,
  shared,
  onOpen,
}: {
  person: TeamPerson;
  shared: ReadonlySet<string>;
  onOpen: (person: OpenPerson) => void;
}) {
  const { row } = person;
  const open = row ? () => onOpen({ id: row.authUserId, name: row.name }) : undefined;
  const email = row?.email && showsEmail(person, shared) ? row.email : null;
  const total = row?.total ?? person.chips.length + person.more;
  const badge = row?.occupied ? OCCUPIED_BADGE : WAITING_BADGE;

  return (
    <li className={cn(CARD, 'flex flex-col gap-3 p-4')}>
      <div className="flex items-start gap-3">
        <Avatar name={person.name} muted={!row?.isActive} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {open ? (
            <Button
              type="button"
              variant="link"
              onClick={open}
              title={row?.email ?? undefined}
              className="h-auto min-h-11 justify-start px-0 py-0 text-left text-sm font-semibold whitespace-normal text-foreground wrap-anywhere md:min-h-0"
            >
              {person.name}
            </Button>
          ) : (
            <span className="text-sm font-semibold wrap-anywhere text-foreground">{person.name}</span>
          )}
          {email && <span className="text-xs wrap-anywhere text-muted-foreground">{email}</span>}
          <div className="flex flex-wrap items-center gap-1.5">
            {row?.role === 'CHIEF_MECHANIC' && <RoleBadge role="CHIEF_MECHANIC" />}
            {row && !row.isActive && <BadgePill className="bg-status-cancelled-bg text-status-cancelled-fg">Inactive</BadgePill>}
            {row?.isActive && <BadgePill className={badge.className}>{badge.label}</BadgePill>}
            <span className="text-xs text-muted-foreground tabular-nums">{total} open</span>
          </div>
        </div>
      </div>
      <ul aria-label={`${person.name}'s tickets`} className="flex flex-col gap-1.5">
        {person.chips.map((chip) => (
          <ChipLink key={chip.ticket.id} chip={chip} />
        ))}
      </ul>
      {person.more > 0 &&
        (open ? (
          <Button type="button" variant="ghost" size="sm" onClick={open} className="min-h-11 self-start md:min-h-8">
            +{person.more} more
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">+{person.more} more</span>
        ))}
    </li>
  );
}

function FreeLine({ people, shared }: { people: MechanicRosterRow[]; shared: ReadonlySet<string> }) {
  const [expanded, setExpanded] = useState(false);
  if (people.length === 0) return null;
  const shown = expanded ? people : people.slice(0, FREE_SHOWN);
  const names = shown.map((row) => (row.email && showsEmail(row, shared) ? `${row.name} (${row.email})` : row.name));

  return (
    <div className={cn(CARD, 'flex flex-col gap-1 px-4 py-3 text-sm')}>
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
    <div role="status" aria-busy="true" className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      <span className="sr-only">Loading the team</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className={cn(CARD, 'flex flex-col gap-3 p-4')}>
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Spec 0022, AC-10 to AC-15: who holds which truck, how long it has sat, and who is free, as a
 * grid of person cards. The roster read lives in the dashboard (the stats band shares it), so a
 * roster failure shows here and never blanks the rest of the page.
 */
export function TeamSection({
  roster,
  team,
  fetchedAt,
  onTicketsChanged,
}: {
  roster: ReturnType<typeof useMechanicRoster>;
  team: Team | null;
  fetchedAt: number;
  /** Refetch the dashboard's tickets after a Reassign or Unassign (AC-14). */
  onTicketsChanged: () => void;
}) {
  // The last person opened stays set while the dialog closes, so its title does not flicker
  const [openPerson, setOpenPerson] = useState<OpenPerson | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const openDialog = (person: OpenPerson) => {
    setOpenPerson(person);
    setDialogOpen(true);
  };

  const changed = () => {
    onTicketsChanged();
    roster.refresh();
  };

  return (
    <section aria-labelledby="team-heading" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users aria-hidden="true" className="size-4.5" />
        </span>
        <h2 id="team-heading" className="text-base font-semibold text-foreground">
          Team
        </h2>
      </div>

      {roster.state === 'loading' && <TeamSkeleton />}

      {roster.state === 'error' && (
        <div className={CARD}>
          <ErrorState
            title="We couldn’t load the team"
            message={roster.errorMessage ?? 'Couldn’t load the team.'}
            onRetry={roster.retry}
          />
        </div>
      )}

      {team && team.noMechanic.length > 0 && (
        <DashboardPanel id="no-mechanic-heading" title="No mechanic" icon={AlertTriangle} tone="danger" count={team.noMechanic.length}>
          <TicketRowList label="Open tickets with no mechanic">
            {team.noMechanic.map((ticket) => {
              const due = dueLabel(ticket, fetchedAt);
              return <DashboardTicketRow key={ticket.id} ticket={ticket} facts={due ? [due] : []} />;
            })}
          </TicketRowList>
        </DashboardPanel>
      )}

      {team?.empty && <p className="text-sm text-muted-foreground">No mechanics yet.</p>}

      {team && team.people.length > 0 && (
        <ul aria-label="People with open work" className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {team.people.map((person) => (
            <PersonCard key={person.key} person={person} shared={team.shared} onOpen={openDialog} />
          ))}
        </ul>
      )}

      {team && !team.empty && <FreeLine people={team.free} shared={team.shared} />}

      {/* AC-14: keeps the person it opened with, so it stays open if they drop off the list */}
      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={openPerson ? `${openPerson.name}'s open tickets` : 'Open tickets'}
      >
        {openPerson && <MechanicOpenTickets user={openPerson} onChanged={changed} className="" />}
      </ResponsiveDialog>
    </section>
  );
}
