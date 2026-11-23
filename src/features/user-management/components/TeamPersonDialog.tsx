import type { RefObject } from 'react';
import { ExternalLink } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import type { TeamMember } from '../../../types';
import { getAccountStatus, onMechanicRoster } from '../lib/accountStatus';
import { manageAccountUrl } from '../lib/portalLinks';
import { MechanicOpenTickets } from './MechanicOpenTickets';
import { UserRoleCell } from './UserCells';

interface TeamPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: TeamMember | null;
  finalFocusRef?: RefObject<HTMLElement | null>;
  /** After an unassign or reassign lands, so the Work column catches up. */
  onWorkChanged: () => void;
}

/**
 * Suite spec 0013, AC-31: one person on the team view. Their role, status and open tickets (with
 * Unassign and Reassign) stay in VRMS; every account change is one Manage account link to the
 * portal, opened in a new tab so the list is still here when they come back.
 */
export function TeamPersonDialog({ open, onOpenChange, user, finalFocusRef, onWorkChanged }: TeamPersonDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={user?.name ?? 'Team member'}
      description={user?.email}
      finalFocusRef={finalFocusRef}
    >
      {user && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <UserRoleCell user={user} />
            <StatusBadge status={getAccountStatus(user)} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body text-muted-foreground">
              Name, email, role, reset codes, sessions and deactivation are in the portal.
            </p>
            <a
              href={manageAccountUrl(user.id)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0')}
            >
              Manage account
              <ExternalLink aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
          {onMechanicRoster(user) && <MechanicOpenTickets user={user} onChanged={onWorkChanged} />}
        </div>
      )}
    </ResponsiveDialog>
  );
}
