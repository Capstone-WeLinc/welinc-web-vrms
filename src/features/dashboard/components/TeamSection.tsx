import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BadgePill } from '../../../components/shared/BadgePill';
import { ErrorState } from '../../../components/shared/ErrorState';
import { PlateChip } from '../../../components/shared/PlateChip';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { RoleBadge } from '../../../components/shared/RoleBadge';
import { useAuthStore } from '../../../store/authStore';
import type { MechanicRosterRow } from '../../../lib/api/vrmsConfigApi';
import type { RepairTicket } from '../../../types';
import { MechanicOpenTickets } from '../../user-management/components/MechanicOpenTickets';
import { WORK_LABELS, WORK_STATE_CLASSES, type WorkState } from '../../user-management/lib/workload';
import { useMechanicRoster } from '../hooks/useMechanicRoster';
import { dueLabel } from '../../../lib/utils/due';
import { buildTeam, FREE_SHOWN, showsEmail, summaryText, type TeamChip, type TeamPerson } from '../lib/team';
import { DashboardTicketRow, TicketRowList } from './DashboardTicketRow';

type OpenPerson = { id: string; name: string };

function ChipLink({ chip }: { chip: TeamChip }) {
  return (
    <li>
      <Link
        to={`/repairs/${chip.ticket.id}`}
        className="inline-flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
      >
        <PlateChip plate={chip.ticket.vehiclePlate} />
        <span>{chip.text}</span>
        {chip.overdue && <span className="font-medium text-destructive">{chip.overdue}</span>}
      </Link>
    </li>
  );
}

function PersonRow({
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
  const work: WorkState = row?.occupied ? 'occupied' : 'free';

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {open ? (
          <Button
            type="button"
            variant="link"
            onClick={open}
            title={row?.email ?? undefined}
            className="h-auto min-h-11 justify-start px-0 text-left text-base font-semibold whitespace-normal text-foreground wrap-anywhere md:min-h-9"
          >
            {person.name}
          </Button>
        ) : (
          <span className="text-base font-semibold wrap-anywhere text-foreground">{person.name}</span>
        )}
        {email && <span className="text-xs wrap-anywhere text-muted-foreground">{email}</span>}
        {row?.role === 'CHIEF_MECHANIC' && <RoleBadge role="CHIEF_MECHANIC" />}
        {row && !row.isActive && <BadgePill className="bg-status-cancelled-bg text-status-cancelled-fg">Inactive</BadgePill>}
        {row?.isActive && (
          <BadgePill className={WORK_STATE_CLASSES[work]}>{WORK_LABELS[work]}</BadgePill>
        )}
      </div>
      <ul aria-label={`${person.name}'s tickets`} className="flex flex-wrap gap-2">
        {person.chips.map((chip) => (
          <ChipLink key={chip.ticket.id} chip={chip} />
        ))}
        {person.more > 0 && (
          <li>
            {open ? (
              <Button type="button" variant="outline" size="sm" onClick={open} className="min-h-11 md:min-h-9">
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
    <div className="flex flex-col gap-1 px-4 py-3 text-sm">
      <p className="text-foreground">
        <span className="font-semibold">Free ({people.length})</span>
        <span className="text-muted-foreground">: </span>
        <span className="wrap-anywhere text-muted-foreground">{names.join(', ')}</span>
      </p>
      {people.length > FREE_SHOWN && (
        <Button
          type="button"
          variant="link"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="h-auto min-h-11 self-start px-0 md:min-h-9"
        >
          {expanded ? 'Show fewer' : 'Show all'}
        </Button>
      )}
    </div>
  );
}

function TeamSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <span className="sr-only">Loading the team</span>
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-full" />
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

  return (
    <section aria-labelledby="team-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="team-heading" className="text-lg font-semibold text-foreground">
          Team
        </h2>
        {team && !team.empty && <p className="text-sm text-muted-foreground">{summaryText(team.summary)}</p>}
      </div>

      {roster.state === 'loading' && <TeamSkeleton />}

      {roster.state === 'error' && (
        <div className="rounded-xl border border-border bg-card">
          <ErrorState
            title="We couldn’t load the team"
            message={roster.errorMessage ?? 'Couldn’t load the team.'}
            onRetry={roster.retry}
          />
        </div>
      )}

      {team && (
        <div className="flex flex-col gap-3">
          {team.noMechanic.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                No mechanic <span className="font-normal text-muted-foreground">({team.noMechanic.length})</span>
              </h3>
              <TicketRowList label="Open tickets with no mechanic">
                {team.noMechanic.map((ticket) => {
                  const due = dueLabel(ticket, fetchedAt);
                  return <DashboardTicketRow key={ticket.id} ticket={ticket} facts={due ? [due] : []} />;
                })}
              </TicketRowList>
            </div>
          )}

          {team.empty ? (
            <p className="text-sm text-muted-foreground">No mechanics yet.</p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {team.people.length > 0 && (
                <ul aria-label="People with open work" className="divide-y divide-border">
                  {team.people.map((person) => (
                    <PersonRow key={person.key} person={person} shared={team.shared} onOpen={openDialog} />
                  ))}
                </ul>
              )}
              <FreeLine people={team.free} shared={team.shared} />
            </div>
          )}
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
    </section>
  );
}
