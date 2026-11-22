import { Badge } from '@/components/ui/badge';
import { RoleChip } from '@/components/ui/role-chip';
import { roleLabel } from '@/lib/roles';
import type { TeamMember } from '../../../types';
import { isTemporaryRole, vrmsRoles } from '../lib/accountStatus';

/** Name, plus a "You" badge on the signed in user's own row (AC-6, AC-22). */
export function UserNameCell({ user, isSelf }: { user: TeamMember; isSelf: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-medium">{user.name}</span>
      {isSelf && (
        <Badge variant="secondary" className="text-muted-strong">
          You
        </Badge>
      )}
    </span>
  );
}

/**
 * The first VRMS role, plus "+{n}" when the user holds more than one, and a Temporary tag when a
 * role comes from a temporary grant (suite spec 0014, task 13a), so nobody takes them for staff.
 */
export function UserRoleCell({ user }: { user: TeamMember }) {
  const roles = vrmsRoles(user);
  const [first, ...rest] = roles;
  if (!first) return <span>—</span>;
  const temporary = roles.some((role) => isTemporaryRole(user, role));
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <RoleChip>{roleLabel(first)}</RoleChip>
      {rest.length > 0 && (
        <Badge variant="outline" className="tabular-nums">
          +{rest.length}
        </Badge>
      )}
      {temporary && <Badge variant="outline">Temporary</Badge>}
    </span>
  );
}
