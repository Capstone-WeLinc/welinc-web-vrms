import { Badge } from '@/components/ui/badge';
import { RoleBadge } from '../../../components/shared/RoleBadge';
import type { ManagedUser } from '../../../types';
import { vrmsRoles } from '../lib/accountStatus';

/** Name, plus a "You" badge on the signed in user's own row (AC-6, AC-22). */
export function UserNameCell({ user, isSelf }: { user: ManagedUser; isSelf: boolean }) {
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

/** The first VRMS role, plus "+{n}" when the user holds more than one. */
export function UserRoleCell({ user }: { user: ManagedUser }) {
  const [first, ...rest] = vrmsRoles(user);
  if (!first) return <span>—</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <RoleBadge role={first} />
      {rest.length > 0 && (
        <Badge variant="outline" className="tabular-nums">
          +{rest.length}
        </Badge>
      )}
    </span>
  );
}
