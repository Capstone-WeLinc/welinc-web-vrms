import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ErrorState } from '../../../components/shared/ErrorState';
import { PlateChip } from '../../../components/shared/PlateChip';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import type { MechanicRosterRow } from '../../../lib/api/vrmsConfigApi';
import { dueLabel } from '../../../lib/utils/due';
import { MechanicOpenTickets } from '../../user-management/components/MechanicOpenTickets';
import type { useMechanicRoster } from '../hooks/useMechanicRoster';
import { FREE_SHOWN, showsEmail, type Team, type TeamChip, type TeamPerson } from '../lib/team';
import { DashboardPanel } from './DashboardPanel';
import { DashboardTicketRow, TicketRowList } from './DashboardTicketRow';

type OpenPerson = { id: string; name: string };

const CARD = 'rounded-xl border border-border bg-card';

/**
 * What the person is doing, in words. Working means a truck In progress (Occupied on the Users
 * page); Waiting means jobs, none started. Free is only the Free line: people with no tickets.
 */
function stateText(row: MechanicRosterRow | null) {
  if (!row) return 'Not on the roster yet';
  const parts = [!row.isActive ? 'Inactive' : row.occupied ? 'Working' : 'Waiting'];
  if (row.role === 'CHIEF_MECHANIC') parts.push('Chief mechanic');
  return parts.join(' · ');
}

/** One truck on a person's sheet: plate, status, and the time in status aligned right. */
function TruckLine({ chip }: { chip: TeamChip }) {
  return (
    <li>
      <Link
        to={`/repairs/${chip.ticket.id}`}
        className="flex min-h-11 items-center gap-3 px-4 py-2 outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none md:min-h-10"
      >
        <PlateChip plate={chip.ticket.vehiclePlate} />
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{chip.status}</span>
        <span className="flex shrink-0 flex-col items-end text-xs tabular-nums">
          <span className="text-muted-foreground">{chip.time}</span>
          {chip.overdue && <span className="font-medium text-destructive">{chip.overdue}</span>}
        </span>
      </Link>
    </li>
  );
}

/** Spec 0022, AC-12: one person as a small job sheet, with up to 3 trucks and "+N more". */
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
  const working = !!row?.isActive && row.occupied;

  return (
    <li className={cn(CARD, 'flex flex-col overflow-hidden')}>
      <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2.5">
        <div className="flex min-w-0 flex-col">
          {open ? (
            <Button
              type="button"
              variant="link"
              onClick={open}
              title={row?.email ?? undefined}
              className="h-auto min-h-11 justify-start p-0 text-left text-sm font-semibold whitespace-normal text-foreground wrap-anywhere md:min-h-0"
            >
              {person.name}
            </Button>
          ) : (
            <span className="text-sm font-semibold wrap-anywhere text-foreground">{person.name}</span>
          )}
          {email && <span className="text-xs wrap-anywhere text-muted-foreground">{email}</span>}
          <span className={cn('text-xs', working ? 'font-medium text-foreground' : 'text-muted-foreground')}>
            {stateText(row)}
          </span>
        </div>
        <span className="shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">
          {total} {total === 1 ? 'job' : 'jobs'}
        </span>
      </div>
      <ul aria-label={`${person.name}'s tickets`} className="divide-y divide-border border-t border-border">
        {person.chips.map((chip) => (
          <TruckLine key={chip.ticket.id} chip={chip} />
        ))}
      </ul>
      {person.more > 0 &&
        (open ? (
          <button
            type="button"
            onClick={open}
            className="min-h-11 border-t border-border px-4 text-left text-xs font-medium text-primary outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:min-h-9"
          >
            +{person.more} more
          </button>
        ) : (
          <span className="border-t border-border px-4 py-2 text-xs text-muted-foreground">+{person.more} more</span>
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
    <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
      <p>
        <span className="font-semibold text-foreground">Free ({people.length})</span>
        <span className="text-muted-foreground"> · </span>
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
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Spec 0022, AC-10 to AC-15: who holds which truck, how long it has sat, and who is free, as a
 * grid of job sheets. The roster read lives in the dashboard (the scoreboard shares it), so a
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
      <div className="flex min-h-12 items-baseline justify-between gap-3">
        <h2 id="team-heading" className="text-sm font-semibold text-foreground">
          Team
        </h2>
        {team && team.people.length > 0 && (
          <p className="text-xs text-muted-foreground">Who needs you first is at the top</p>
        )}
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
        <DashboardPanel id="no-mechanic-heading" title="No mechanic" danger count={team.noMechanic.length}>
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
        <ul aria-label="People with open work" className="grid items-start gap-3 sm:grid-cols-2 2xl:grid-cols-3">
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
