import { Card } from '@/components/ui/card';
import { RoleChip } from '@/components/ui/role-chip';
import { roleLabel } from '@/lib/roles';
import { getInitials } from '../../../lib/utils/format';
import type { UserRoleAssignment } from '../../../types';

interface AccountSummaryProps {
  name: string;
  email: string;
  /** Every system and role on the account, from the auth token. */
  roles: UserRoleAssignment[];
}

/** Who you are and what you can open across WeLinc. */
export function AccountSummary({ name, email, roles }: AccountSummaryProps) {
  return (
    <Card className="gap-5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground"
        >
          {getInitials(name || email)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold text-foreground">{name || email}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      {roles.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Access</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {roles.map((assignment) => (
              <li key={`${assignment.system}-${assignment.role}`} className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{assignment.system}</span>
                <RoleChip>{roleLabel(assignment.role)}</RoleChip>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
