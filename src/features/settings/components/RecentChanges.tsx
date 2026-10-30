import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailSection } from '../../../components/shared/DetailSection';
import { getSettingChanges, type HistoryChange } from '../../../lib/api/settingsApi';
import { useCan } from '../../../lib/permissions/usePermissions';
import { useLoad } from '../../knowledge-base/hooks/useLoad';
import { RECENT_COUNT } from '../lib/changes';
import { ChangeList } from './ChangeList';

const fetchRecent = () => getSettingChanges({ kind: 'setting', limit: 100 }).then((page) => page.data);

/**
 * The last few setting changes for one section, with a link to the full history (spec 0012,
 * AC-26). `keys` limits it to the entries the section shows. Needs settings.manage.
 */
export function RecentChanges({ keys, refreshToken }: { keys: ReadonlySet<string>; refreshToken: number }) {
  const canSee = useCan('settings.manage');
  const { state, data } = useLoad(canSee ? `recent:${refreshToken}` : null, fetchRecent, '');
  if (!canSee || state === 'error') return null;

  const recent: HistoryChange[] = (data ?? []).filter((c) => keys.has(c.key)).slice(0, RECENT_COUNT);
  return (
    <DetailSection title="Recent changes">
      {state === 'loading' ? (
        <Skeleton className="h-16 w-full" aria-label="Loading recent changes" />
      ) : recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">No changes yet.</p>
      ) : (
        <ChangeList changes={recent} />
      )}
      <Link to="/settings/history" className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:underline">
        See the full history
      </Link>
    </DetailSection>
  );
}
