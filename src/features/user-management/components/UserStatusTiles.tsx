import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '../../../components/shared/KpiCard';
import { statusLabel } from '../../../components/shared/statusLabels';
import type { TeamMember } from '../../../types';
import { ACCOUNT_STATUSES, getAccountStatus, type AccountStatus } from '../lib/accountStatus';

// No context line: the visible text must match the tile's name, "{caption}, {count}".
interface UserStatusTilesProps {
  /** Every loaded user, not the filtered set. */
  users: TeamMember[];
  loading: boolean;
  selected: AccountStatus | 'all';
  /** Called with the pressed tile's status; the page clears the filter when it is already selected. */
  onSelect: (status: AccountStatus) => void;
}

/** One toggle tile per account status, in sort order (spec 0006, AC-3). */
export function UserStatusTiles({ users, loading, selected, onSelect }: UserStatusTilesProps) {
  const counts = new Map<AccountStatus, number>(ACCOUNT_STATUSES.map((status) => [status, 0]));
  for (const user of users) {
    const status = getAccountStatus(user);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
      {ACCOUNT_STATUSES.map((status) =>
        loading ? (
          <Skeleton key={status} className="h-24 rounded-2xl" />
        ) : (
          <KpiCard
            key={status}
            caption={statusLabel(status)}
            value={counts.get(status) ?? 0}
           
            selected={selected === status}
            onSelect={() => onSelect(status)}
          />
        ),
      )}
    </div>
  );
}
