import type { Column } from '../../../components/shared/data-table/types';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import type { MechanicWorkload } from '../../../lib/api/vrmsConfigApi';
import type { TeamMember } from '../../../types';
import { getAccountStatus } from '../lib/accountStatus';
import { UserNameCell, UserRoleCell } from './UserCells';
import { UserWorkCell } from './UserWorkCell';

/**
 * The Users table (spec 0006, AC-6). Desktop shows name and email in one User column; a phone
 * card needs them apart, as its title and subtitle, so each layout gets its own set. Work shows a
 * mechanic's Occupied or Free and open counts (feature 57).
 */
export function usersColumns(
  currentUserId: string | undefined,
  isMobile: boolean,
  workload: ReadonlyMap<string, MechanicWorkload> | null,
): Column<TeamMember>[] {
  const name = (user: TeamMember) => <UserNameCell user={user} isSelf={user.id === currentUserId} />;

  const rest: Column<TeamMember>[] = [
    { id: 'role', header: 'Role', mobile: 'field', cell: (user) => <UserRoleCell user={user} /> },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      cell: (user) => <StatusBadge status={getAccountStatus(user)} />,
    },
    { id: 'work', header: 'Work', mobile: 'field', cell: (user) => <UserWorkCell user={user} workload={workload} /> },
  ];

  if (isMobile) {
    return [
      { id: 'name', header: 'Name', mobile: 'title', cell: name },
      { id: 'email', header: 'Email', mobile: 'subtitle', cell: (user) => <span className="break-all">{user.email}</span> },
      ...rest,
    ];
  }

  return [
    {
      id: 'user',
      header: 'User',
      cell: (user) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          {name(user)}
          <span className="text-sm break-all text-muted-foreground">{user.email}</span>
        </span>
      ),
    },
    ...rest,
  ];
}
