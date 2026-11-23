import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailSection } from '../../../components/shared/DetailSection';
import { getSettingChanges } from '../../../lib/api/settingsApi';
import { useCan } from '../../../lib/permissions/usePermissions';
import { useLoad } from '../../knowledge-base/hooks/useLoad';
import { RECENT_COUNT } from '../lib/changes';
import { ChangeList } from './ChangeList';

// The load key is `<refreshToken>:<comma joined keys>`, so the fetch below never changes
const fetchRecent = (loadKey: string) =>
  getSettingChanges({
    kind: 'setting',
    limit: RECENT_COUNT,
    keys: loadKey.slice(loadKey.indexOf(':') + 1).split(','),
  }).then((page) => page.data);

/**
 * The newest few setting changes for one section, with a link to the full history (spec 0012,
 * AC-26, AC-31). The server keeps only the section's `keys`, so its own newest changes show
 * however many other changes came after them. A section with no keys asks nothing. Needs
 * settings.manage.
 */
export function RecentChanges({
  keys,
  refreshToken,
  units,
}: {
  keys: ReadonlySet<string>;
  refreshToken: number;
  units?: Record<string, string>;
}) {
  const canSee = useCan('settings.manage');
  const joined = [...keys].sort().join(',');
  const { state, data } = useLoad(canSee && joined ? `${refreshToken}:${joined}` : null, fetchRecent, '');
  if (!canSee || state === 'error') return null;

  const recent = joined ? (data ?? []) : [];
  return (
    <DetailSection title="Recent changes">
      {joined && state === 'loading' ? (
        <Skeleton className="h-16 w-full" aria-label="Loading recent changes" />
      ) : recent.length === 0 ? (
        <p className="text-body text-muted-foreground">No changes yet.</p>
      ) : (
        <ChangeList changes={recent} units={units} />
      )}
      <Link to="/settings/history" className="text-body font-medium text-primary underline-offset-4 hover:underline focus-visible:underline">
        See the full history
      </Link>
    </DetailSection>
  );
}
