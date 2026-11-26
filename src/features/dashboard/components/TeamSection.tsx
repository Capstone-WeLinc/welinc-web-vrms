import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ErrorState } from '../../../components/shared/ErrorState';
import { PlateChip } from '../../../components/shared/PlateChip';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import type { MechanicRosterRow } from '../../../lib/api/vrmsConfigApi';
import { dueLabel } from '../../../lib/utils/due';
import { MechanicOpenTickets } from '../../user-management/components/MechanicOpenTickets';
import type { useMechanicRoster } from '../hooks/useMechanicRoster';
import { showsEmail, type Team, type TeamChip, type TeamMix, type TeamPerson } from '../lib/team';
import { DashboardPanel, PanelEmpty } from './DashboardPanel';
import { DashboardTicketRow, TicketRowList } from './DashboardTicketRow';

type OpenPerson = { id: string; name: string };

/** What the person is doing: Inactive is the only state worth a word; the bar says the rest. */
function isInactive(row: MechanicRosterRow | null) {
  return row !== null && !row.isActive;
}

/** One truck under an opened person: plate, status, and the time in status aligned right. */
function TruckLine({ chip }: { chip: TeamChip }) {
  return (
    <li>
      <Link
        to={`/repairs/${chip.ticket.id}`}
        className="flex min-h-11 items-center gap-3 rounded-md px-2 py-1.5 outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none md:min-h-9"
      >
        <PlateChip plate={chip.ticket.vehiclePlate} />
        <span className="min-w-0 flex-1 truncate text-body text-foreground">{chip.status}</span>
        <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
          {chip.overdue ? <span className="font-medium text-destructive">{chip.overdue}</span> : chip.time}
        </span>
      </Link>
    </li>
  );
}

const SEGMENTS = [
  { key: 'working', label: 'In progress', className: 'bg-primary' },
  { key: 'signOff', label: 'For verification', className: 'bg-chart-4' },
  { key: 'notStarted', label: 'Not started', className: 'bg-primary/20' },
] as const;

/** A person's jobs as one stacked bar, scaled to the busiest person so rows compare at a glance. */
function WorkloadBar({ mix, scale }: { mix: TeamMix; scale: number }) {
  return (
    <span aria-hidden="true" className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      {SEGMENTS.map((segment) =>
        mix[segment.key] > 0 ? (
          <span
            key={segment.key}
            className={cn('h-full border-r-2 border-card last:border-r-0', segment.className)}
            style={{ width: `${(mix[segment.key] / scale) * 100}%` }}
          />
        ) : null,
      )}
    </span>
  );
}

/** The one thing worth saying about a person, in the color of what it asks for. */
function noteOf(mix: TeamMix): { text: string; className: string } | null {
  if (mix.overdue > 0) return { text: `${mix.overdue} overdue`, className: 'font-medium text-destructive' };
  if (mix.signOff > 0) return { text: `${mix.signOff} for verification`, className: 'text-status-for-verification-fg' };
  if (mix.working === 0) return { text: 'Nothing started', className: 'text-muted-foreground' };
  return null;
}

function describe(mix: TeamMix) {
  return SEGMENTS.filter((s) => mix[s.key] > 0)
    .map((s) => `${mix[s.key]} ${s.label.toLowerCase()}`)
    .join(', ');
}

/** Spec 0022: one person as one roster row; it opens in place to show their trucks. */
function PersonRow({
  person,
  scale,
  shared,
  onOpen,
}: {
  person: TeamPerson;
  scale: number;
  shared: ReadonlySet<string>;
  onOpen: (person: OpenPerson) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { row, mix } = person;
  const email = row?.email && showsEmail(person, shared) ? row.email : null;
  const total = row?.total ?? person.chips.length + person.more;
  const note = noteOf(mix);
  const panelId = `team-${person.key}`;

  // The line under the name: who they are when it matters, then the truck they are on now
  const sub: { key: string; node: ReactNode }[] = [];
  if (!row) sub.push({ key: 'missing', node: 'Not on the roster yet' });
  else if (isInactive(row)) sub.push({ key: 'inactive', node: 'Inactive' });
  else if (row.role === 'CHIEF_MECHANIC') sub.push({ key: 'chief', node: 'Chief mechanic' });
  if (email) sub.push({ key: 'email', node: email });
  if (person.onNow.length > 0) {
    sub.push({
      key: 'on',
      node: (
        <>
          On <span className="font-mono font-medium text-foreground uppercase">{person.onNow[0]}</span>
          {person.onNow.length > 1 && ` +${person.onNow.length - 1}`}
        </>
      ),
    });
  }

  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
        title={row?.email ?? undefined}
        className="group flex min-h-11 w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-left outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none md:px-5"
      >
        <span className="order-1 flex min-w-0 flex-1 items-center gap-2 sm:w-44 sm:flex-none">
          <ChevronRight
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none',
              expanded && 'rotate-90',
            )}
          />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-body font-medium text-foreground">{person.name}</span>
            {sub.length > 0 && (
              <span className="truncate text-caption text-muted-foreground">
                {sub.map((part, index) => (
                  <span key={part.key}>
                    {index > 0 && <span aria-hidden="true"> · </span>}
                    {part.node}
                  </span>
                ))}
              </span>
            )}
          </span>
        </span>
        <span className="order-2 w-8 text-right text-body font-medium text-foreground tabular-nums sm:order-3">{total}</span>
        <span className="order-3 flex basis-full items-center sm:order-2 sm:flex-1 sm:basis-auto">
          <WorkloadBar mix={mix} scale={scale} />
          <span className="sr-only">{describe(mix)}</span>
        </span>
        <span className={cn('order-4 basis-full truncate text-caption sm:w-32 sm:basis-auto', note?.className)}>{note?.text}</span>
      </button>
      {expanded && (
        <div id={panelId} className="flex flex-col gap-1 px-4 pb-3 sm:pl-11 md:pr-5">
          <ul aria-label={`${person.name}'s tickets`} className="flex flex-col">
            {person.chips.map((chip) => (
              <TruckLine key={chip.ticket.id} chip={chip} />
            ))}
          </ul>
          {row && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => onOpen({ id: row.authUserId, name: row.name })}
              className="h-auto min-h-11 self-start px-2 md:min-h-8"
            >
              {person.more > 0 ? `See all ${total} and reassign` : 'Reassign or unassign'}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

/** The Free tab: everyone active with no open work, in the same quiet rows, two columns wide. */
function FreeList({ people, shared }: { people: MechanicRosterRow[]; shared: ReadonlySet<string> }) {
  if (people.length === 0) return <PanelEmpty>Nobody is free right now.</PanelEmpty>;
  return (
    <ul aria-label="Free mechanics" className="-mb-px grid sm:grid-cols-2">
      {people.map((row) => (
        <li
          key={row.authUserId}
          title={row.email ?? undefined}
          className="flex min-h-11 min-w-0 items-center gap-3 border-b border-border px-4 py-2.5 md:px-5 sm:odd:border-r"
        >
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-status-completed-fg" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-body text-foreground">{row.name}</span>
            {row.email && showsEmail(row, shared) && (
              <span className="truncate text-caption text-muted-foreground">{row.email}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TeamSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 p-5">
      <span className="sr-only">Loading the team</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-2 flex-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <ul aria-hidden="true" className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-2 text-caption text-muted-foreground md:px-5">
      {SEGMENTS.map((segment) => (
        <li key={segment.key} className="flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', segment.className)} />
          {segment.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Spec 0022, AC-10 to AC-15: who holds which truck, how long it has sat, and who is free, as one
 * roster: a row per person with a workload bar, busiest first, opening in place to show trucks.
 * The roster read lives in the dashboard (the summary shares it), so a roster failure shows here
 * and never blanks the rest of the page.
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
  const [view, setView] = useState<'busy' | 'free'>('busy');
  const openDialog = (person: OpenPerson) => {
    setOpenPerson(person);
    setDialogOpen(true);
  };

  const changed = () => {
    onTicketsChanged();
    roster.refresh();
  };

  const scale = Math.max(
    1,
    ...(team?.people ?? []).map((p) => p.mix.working + p.mix.signOff + p.mix.notStarted),
  );

  return (
    <div className="flex flex-col gap-6">
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

      <Tabs value={view} onValueChange={(value) => setView(value as 'busy' | 'free')} className="gap-0">
        <DashboardPanel
          id="team-heading"
          title="Team"
          action={
            team && !team.empty ? (
              <TabsList aria-label="Team view" className="h-9">
                <TabsTrigger value="busy" className="h-full px-3">
                  Busy <span className="text-muted-strong tabular-nums">{team.people.length}</span>
                </TabsTrigger>
                <TabsTrigger value="free" className="h-full px-3">
                  Free <span className="text-muted-strong tabular-nums">{team.free.length}</span>
                </TabsTrigger>
              </TabsList>
            ) : undefined
          }
        >
          {roster.state === 'loading' && <TeamSkeleton />}

          {roster.state === 'error' && (
            <ErrorState
              kind="tile"
              subject="people"
              title="We couldn’t load the team"
              message={roster.errorMessage ?? 'Couldn’t load the team.'}
              onRetry={roster.retry}
            />
          )}

          {team?.empty && <PanelEmpty>No mechanics yet.</PanelEmpty>}

          {team && !team.empty && (
            <>
              <TabsContent value="busy">
                {team.people.length === 0 ? (
                  <PanelEmpty>Nobody has open work.</PanelEmpty>
                ) : (
                  <>
                    <Legend />
                    <ul aria-label="People with open work, busiest first" className="divide-y divide-border">
                      {team.people.map((person) => (
                        <PersonRow key={person.key} person={person} scale={scale} shared={team.shared} onOpen={openDialog} />
                      ))}
                    </ul>
                  </>
                )}
              </TabsContent>
              <TabsContent value="free">
                <FreeList people={team.free} shared={team.shared} />
              </TabsContent>
            </>
          )}
        </DashboardPanel>
      </Tabs>

      {/* AC-14: keeps the person it opened with, so it stays open if they drop off the list */}
      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={openPerson ? `${openPerson.name}'s open tickets` : 'Open tickets'}
      >
        {openPerson && <MechanicOpenTickets user={openPerson} onChanged={changed} className="" />}
      </ResponsiveDialog>
    </div>
  );
}
