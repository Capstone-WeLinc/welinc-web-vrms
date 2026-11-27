import { Link } from 'react-router-dom';
import { Grip, House, ShieldCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useSystemRoleLabel } from '@/lib/roles';
import { SYSTEM_ICONS, SYSTEM_LINES } from '@/lib/systemLines';
import { useAuthStore } from '../../store/authStore';
import {
  holdsAdminAnywhere,
  openSystemUrl,
  otherSystems,
  suiteManagementUrl,
  switchSystemUrl,
  systemRoleTag,
} from '../../lib/session/switchSystem';

const CARD = 'flex items-center gap-3 rounded-2xl px-3.5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring';
const TILE = 'flex size-10 shrink-0 items-center justify-center rounded-xl';
const TAG = 'shrink-0 rounded-md px-2 py-0.5 text-caption font-semibold whitespace-nowrap';
const OTHER_CARD = cn(CARD, 'border border-border hover:bg-accent');
const OTHER_TILE = cn(TILE, 'bg-info-bg text-primary');
const OTHER_TAG = cn(TAG, 'bg-info-bg text-primary');

function CardText({ title, line }: { title: string; line: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-body font-semibold text-foreground">{title}</span>
      <span className="truncate text-caption font-normal text-muted-foreground">{line}</span>
    </span>
  );
}

/**
 * Spec 0027, AC-9a (board `Switcher16`, built like the portal's `SuiteSwitcher`): the grid button
 * in the top bar. Wide cards, one per row: VRMS ticked, then your other systems (BMS, VMMS) with
 * your role there, each through the launcher's `open`, then Suite management for admins. The
 * caller shows it only when `canSwitchSystem` is true.
 */
export function SystemSwitcher() {
  const user = useAuthStore((state) => state.user);
  const label = useSystemRoleLabel();

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Switch system"
        className="flex size-10 items-center justify-center rounded-full text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent max-sm:size-11"
      >
        <Grip aria-hidden="true" className="size-5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-88 max-w-(--radix-popover-content-available-width) rounded-2xl p-0">
        <nav aria-label="Switch system" className="flex flex-col">
          <div className="flex items-center px-4 pt-3.5 pb-2.5">
            <span className="flex-1 text-small font-semibold text-muted-strong">Switch to</span>
            {/* It leaves the app, so a plain link */}
            <a
              href={switchSystemUrl()}
              className="flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-small font-semibold text-primary outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <House aria-hidden="true" className="size-3.5" />
              Home
            </a>
          </div>
          <ul className="flex flex-col gap-2 px-3 pb-3">
            <li>
              <Link to="/" aria-current="page" className={cn(CARD, 'bg-accent ring-2 ring-primary ring-inset')}>
                <span aria-hidden="true" className={cn(TILE, 'bg-primary text-highlight')}>
                  <SystemIcon system="VRMS" />
                </span>
                <CardText title="VRMS" line={SYSTEM_LINES.VRMS} />
                <span className={cn(TAG, 'bg-primary text-primary-foreground')}>You are here</span>
              </Link>
            </li>
            {otherSystems(user).map((system) => {
              const tag = systemRoleTag(user, system, label);
              return (
                <li key={system}>
                  <a href={openSystemUrl(system)} className={OTHER_CARD}>
                    <span aria-hidden="true" className={OTHER_TILE}>
                      <SystemIcon system={system} />
                    </span>
                    <CardText title={system} line={SYSTEM_LINES[system] ?? system} />
                    {tag && <span className={OTHER_TAG}>{tag}</span>}
                  </a>
                </li>
              );
            })}
            {holdsAdminAnywhere(user) && (
              <li>
                <a href={suiteManagementUrl()} className={OTHER_CARD}>
                  <span aria-hidden="true" className={OTHER_TILE}>
                    <ShieldCheck className="size-5" />
                  </span>
                  <CardText title="Suite management" line="Users and permissions" />
                  <span className={OTHER_TAG}>Admin</span>
                </a>
              </li>
            )}
          </ul>
        </nav>
      </PopoverContent>
    </Popover>
  );
}

function SystemIcon({ system }: { system: string }) {
  const Icon = SYSTEM_ICONS[system] ?? ShieldCheck;
  return <Icon className="size-5" />;
}
