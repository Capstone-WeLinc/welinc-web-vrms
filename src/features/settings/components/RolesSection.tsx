import { Fragment, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { DetailSection } from '../../../components/shared/DetailSection';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useHasTabBar } from '../../../components/layout/useNavSections';
import { showToast } from '../../../context/toast';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useLeaveGuard } from '../../../hooks/useLeaveGuard';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { getPermissionChanges, getPermissionMatrix, updatePermissions, type MatrixKey, type PermissionMatrix } from '../../../lib/api/permissionsApi';
import type { ModuleName } from '../../../lib/permissions/keys';
import { usePermissions } from '../../../lib/permissions/usePermissions';
import { useLoad } from '../../knowledge-base/hooks/useLoad';
import { cellKey, fromPermissionChange, pendingGrants, RECENT_COUNT, type MatrixEdits } from '../lib/changes';
import { STALE_SETTINGS_TOAST } from '../lib/sections';
import { ChangeList } from './ChangeList';
import { PermissionReviewDialog } from './PermissionReviewDialog';

const PINNED = 'sticky left-0 z-1 border-r border-border bg-card md:border-r-0';
const HEAD = 'text-xs font-medium uppercase tracking-wide text-muted-strong';
/** A cell or row that differs from what is saved: a gold wash, so the edits read at a glance. */
const EDITED = 'bg-highlight/15';

const fetchRoles = () =>
  Promise.all([getPermissionMatrix(), getPermissionChanges(RECENT_COUNT)]).then(([matrix, changes]) => ({ matrix, changes: changes.data }));

interface CellProps {
  permission: MatrixKey;
  role: PermissionMatrix['roles'][number];
  edits: MatrixEdits;
  saving: boolean;
  onEdit: (key: string, value: boolean) => void;
}

function cellState({ permission, role, edits }: Pick<CellProps, 'permission' | 'role' | 'edits'>) {
  const grant = permission.grants[role.role];
  const edited = edits[cellKey(role.role, permission.key)];
  const saved = grant?.allowed === true;
  return { locked: grant?.locked === true, checked: edited ?? saved, changed: edited !== undefined && edited !== saved };
}

function GrantCheckbox({ permission, role, edits, saving, onEdit, id }: CellProps & { id?: string }) {
  const { locked, checked, changed } = cellState({ permission, role, edits });
  return (
    <Checkbox
      id={id}
      checked={checked}
      disabled={locked || saving}
      aria-label={id ? undefined : `${permission.label} for ${role.label}${locked ? ', locked' : ''}${changed ? ', not saved yet' : ''}`}
      onCheckedChange={(value) => onEdit(cellKey(role.role, permission.key), value === true)}
    />
  );
}

function ModuleOff({ permission, modules }: { permission: MatrixKey; modules: Record<ModuleName, boolean> }) {
  return permission.module && !modules[permission.module] ? <Badge variant="outline">Module off</Badge> : null;
}

/** Phones: one card per permission, a 44px row per role, so no column hides off screen. */
function MatrixCards({ matrix, modules, ...cell }: Omit<CellProps, 'permission' | 'role'> & { matrix: PermissionMatrix; modules: Record<ModuleName, boolean> }) {
  const baseId = useId();
  return (
    <div className="flex flex-col gap-5">
      {matrix.groups.map((group) => (
        <section key={group.name} aria-label={group.name} className="flex flex-col gap-2">
          <h3 className={HEAD}>{group.name}</h3>
          {group.keys.map((permission) => (
            <div key={permission.key} className="rounded-lg border border-border">
              <p className="flex flex-wrap items-center gap-2 px-3 pt-3 text-sm font-medium text-foreground">
                {permission.label}
                <ModuleOff permission={permission} modules={modules} />
              </p>
              <ul className="mt-1 divide-y divide-border">
                {matrix.roles.map((role) => {
                  const { locked, changed } = cellState({ permission, role, edits: cell.edits });
                  const id = `${baseId}-${permission.key}-${role.role}`;
                  return (
                    <li key={role.role} className={cn('flex min-h-11 items-center gap-3 px-3', changed && EDITED)}>
                      <GrantCheckbox {...cell} permission={permission} role={role} id={id} />
                      <label htmlFor={id} className={cn('flex-1 py-2 text-sm', locked ? 'text-muted-foreground' : 'text-foreground')}>
                        {role.label}
                        {changed && <span className="sr-only">, not saved yet</span>}
                      </label>
                      {locked && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock aria-hidden="true" className="size-3.5" />
                          Locked
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function MatrixTable({ matrix, modules, ...cell }: Omit<CellProps, 'permission' | 'role'> & { matrix: PermissionMatrix; modules: Record<ModuleName, boolean> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className={cn(PINNED, HEAD)}>
            Permission
          </TableHead>
          {matrix.roles.map((role) => (
            <TableHead key={role.role} scope="col" className={cn('w-28 text-center', HEAD)}>
              {role.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {matrix.groups.map((group) => (
          <Fragment key={group.name}>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="colgroup" colSpan={matrix.roles.length + 1} className={cn('bg-muted/50', HEAD)}>
                {group.name}
              </TableHead>
            </TableRow>
            {group.keys.map((permission) => (
              <TableRow key={permission.key}>
                <TableHead scope="row" className={cn(PINNED, 'h-auto min-w-40 py-2 font-normal whitespace-normal text-foreground')}>
                  <span className="flex flex-wrap items-center gap-2">
                    {permission.label}
                    <ModuleOff permission={permission} modules={modules} />
                  </span>
                </TableHead>
                {matrix.roles.map((role) => {
                  const { locked, changed } = cellState({ permission, role, edits: cell.edits });
                  return (
                    <TableCell key={role.role} className={cn('text-center', changed && EDITED)}>
                      {/* The lock hangs to the right, so locked and open boxes share one centre line */}
                      <span className="relative inline-flex align-middle">
                        <GrantCheckbox {...cell} permission={permission} role={role} />
                        {locked && <Lock aria-hidden="true" className="absolute top-1/2 left-full ml-1.5 size-3.5 -translate-y-1/2 text-muted-foreground" />}
                      </span>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Spec 0012, AC-24: the permission matrix as an editable table (cards on phones). Locked cells
 * can't be changed; keys of an off module are marked and stay editable. Edits collect into one
 * bar, and Save opens a review of who gains and loses what before anything is sent.
 */
export function RolesSection() {
  const { state, data, errorMessage, retry, replace } = useLoad('roles', fetchRoles, 'Could not load the permissions.');
  const { modules, refresh: refreshPermissions } = usePermissions();
  const [edits, setEdits] = useState<MatrixEdits>({});
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const submittedRef = useRef(false);
  const hasTabBar = useHasTabBar();
  const isMobile = useIsMobile();

  const matrix = data?.matrix ?? null;
  const changes = matrix ? pendingGrants(matrix, edits) : [];
  const dirty = changes.length > 0;

  useLeaveGuard({
    isDirty: dirty,
    submittedRef,
    savingRef,
    title: 'Discard your changes?',
    description: 'The permissions you changed are not saved yet.',
  });

  const discard = () => {
    setEdits({});
    setReviewing(false);
  };

  const save = async (note: string) => {
    if (!matrix || !dirty) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const saved = await updatePermissions({ version: matrix.version, changes, note: note || undefined });
      // The history is read again with the new matrix so the save shows at once
      const fresh = await getPermissionChanges(RECENT_COUNT).catch(() => null);
      replace({ matrix: saved, changes: fresh?.data ?? data?.changes ?? [] });
      discard();
      refreshPermissions();
      showToast(changes.length === 1 ? 'Saved 1 change.' : `Saved ${changes.length} changes.`);
    } catch (err) {
      if (getApiErrorStatus(err) === 409) {
        discard();
        retry();
        showToast(STALE_SETTINGS_TOAST, 'error');
      } else {
        setReviewing(false);
        showToast(getApiErrorMessage(err, 'Could not save the permissions.'), 'error');
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading permissions">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (state === 'error' || !matrix || !data) {
    return <ErrorState title="Couldn’t load the permissions." message={errorMessage ?? 'Check your connection, then try again.'} onRetry={retry} retryText="Retry" />;
  }

  const cell = { edits, saving, onEdit: (key: string, value: boolean) => setEdits((prev) => ({ ...prev, [key]: value })) };

  return (
    <div className="flex flex-col gap-4">
      <DetailSection title="Permission matrix">
        <p className="-mt-2 flex items-start gap-2 text-sm text-pretty text-muted-foreground">
          <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Locked rights can’t be changed, so an Admin can never lock everyone out of Settings or Users.
        </p>
        {isMobile ? <MatrixCards matrix={matrix} modules={modules} {...cell} /> : <MatrixTable matrix={matrix} modules={modules} {...cell} />}
      </DetailSection>

      <DetailSection title="Recent changes">
        {data.changes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes yet.</p>
        ) : (
          <ChangeList changes={data.changes.map((c) => fromPermissionChange(c, matrix))} />
        )}
        <Link to="/settings/history" className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:underline">
          See the full history
        </Link>
      </DetailSection>

      {dirty && (
        <div
          role="region"
          aria-label="Unsaved changes"
          // Above the phone tab bar (h-16) when this user has one
          className={cn(
            'sticky z-10 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-lg md:flex-row md:items-center',
            hasTabBar ? 'bottom-20 md:bottom-4' : 'bottom-4',
          )}
        >
          <p className="min-w-0 flex-1 text-sm" aria-live="polite">
            <span className="font-medium text-foreground">{changes.length === 1 ? '1 permission changed' : `${changes.length} permissions changed`}</span>
            <span className="block text-muted-foreground">Marked in gold. They apply to everyone as soon as you save.</span>
          </p>
          <div className="flex flex-col-reverse gap-2 md:flex-row">
            <Button type="button" variant="outline" size="touch" onClick={discard} disabled={saving}>
              Discard
            </Button>
            <Button type="button" size="touch" onClick={() => setReviewing(true)} disabled={saving}>
              Review and save
            </Button>
          </div>
        </div>
      )}

      <PermissionReviewDialog open={reviewing} matrix={matrix} changes={changes} saving={saving} onConfirm={save} onCancel={() => setReviewing(false)} />
    </div>
  );
}
