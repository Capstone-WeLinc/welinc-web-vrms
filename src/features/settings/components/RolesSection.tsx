import { Fragment, useId, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { DetailSection } from '../../../components/shared/DetailSection';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useHasTabBar } from '../../../components/layout/useNavSections';
import { showToast } from '../../../context/toast';
import { useLeaveGuard } from '../../../hooks/useLeaveGuard';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { getPermissionChanges, getPermissionMatrix, updatePermissions } from '../../../lib/api/permissionsApi';
import { usePermissions } from '../../../lib/permissions/usePermissions';
import { useLoad } from '../../knowledge-base/hooks/useLoad';
import { cellKey, fromPermissionChange, pendingGrants, RECENT_COUNT, type MatrixEdits } from '../lib/changes';
import { STALE_SETTINGS_TOAST } from '../lib/sections';
import { ChangeList } from './ChangeList';

const NOTE_MAX = 500;
const PINNED = 'sticky left-0 z-1 border-r border-border bg-card md:border-r-0';

const fetchRoles = () =>
  Promise.all([getPermissionMatrix(), getPermissionChanges(RECENT_COUNT)]).then(([matrix, changes]) => ({ matrix, changes: changes.data }));

/**
 * Spec 0012, AC-24: the permission matrix as an editable table. Locked cells can't be clicked;
 * keys of an off module are marked and stay editable. Edits collect into one Save and Discard bar.
 */
export function RolesSection() {
  const { state, data, errorMessage, retry, replace } = useLoad('roles', fetchRoles, 'Could not load the permissions.');
  const { modules, refresh: refreshPermissions } = usePermissions();
  const [edits, setEdits] = useState<MatrixEdits>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const submittedRef = useRef(false);
  const noteId = useId();
  const hasTabBar = useHasTabBar();

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
    setNote('');
  };

  const save = async () => {
    if (!matrix || !dirty) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const saved = await updatePermissions({ version: matrix.version, changes, note: note.trim() || undefined });
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

  return (
    <div className="flex flex-col gap-4">
      <DetailSection title="Roles and permissions">
        <p className="-mt-2 text-sm text-muted-foreground">What each VRMS role may do. A lock marks a right nobody can change.</p>
        {/* The permission column stays pinned so a phone that scrolls to Mechanic still shows which row it is on */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className={PINNED}>
                Permission
              </TableHead>
              {matrix.roles.map((role) => (
                <TableHead key={role.role} scope="col" className="w-24 text-center">
                  {role.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.groups.map((group) => (
              <Fragment key={group.name}>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="colgroup" colSpan={matrix.roles.length + 1} className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <span className="sticky left-2 inline-block">{group.name}</span>
                  </TableHead>
                </TableRow>
                {group.keys.map((key) => (
                  <TableRow key={key.key}>
                    <TableHead scope="row" className={cn(PINNED, 'h-auto min-w-40 py-2 font-normal whitespace-normal text-foreground')}>
                      <span className="flex flex-wrap items-center gap-2">
                        {key.label}
                        {key.module && !modules[key.module] && <Badge variant="secondary">Module off</Badge>}
                      </span>
                    </TableHead>
                    {matrix.roles.map((role) => {
                      const grant = key.grants[role.role];
                      const edited = edits[cellKey(role.role, key.key)];
                      const checked = edited ?? grant?.allowed === true;
                      return (
                        <TableCell key={role.role} className="text-center">
                          <span className="inline-flex items-center gap-1">
                            <Checkbox
                              checked={checked}
                              disabled={grant?.locked || saving}
                              aria-label={`${key.label} for ${role.label}${grant?.locked ? ', locked' : ''}`}
                              onCheckedChange={(value) =>
                                setEdits((prev) => ({ ...prev, [cellKey(role.role, key.key)]: value === true }))
                              }
                            />
                            {grant?.locked && <Lock aria-hidden="true" className="size-3.5 text-muted-foreground" />}
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
      </DetailSection>

      <DetailSection title="Recent changes">
        {data.changes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes yet.</p>
        ) : (
          <ChangeList changes={data.changes.map((c) => fromPermissionChange(c, matrix))} />
        )}
      </DetailSection>

      {dirty && (
        <div
          role="region"
          aria-label="Unsaved changes"
          // Above the phone tab bar (h-16) when this user has one
          className={cn(
            'sticky z-10 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-lg md:flex-row md:items-end',
            hasTabBar ? 'bottom-20 md:bottom-4' : 'bottom-4',
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor={noteId} className="text-sm font-medium text-foreground">
              {changes.length === 1 ? '1 permission changed' : `${changes.length} permissions changed`}
              <span className="font-normal text-muted-foreground"> · note (optional)</span>
            </Label>
            <Input id={noteId} value={note} maxLength={NOTE_MAX} placeholder="Why this change?" onChange={(event) => setNote(event.target.value)} />
          </div>
          <div className="flex flex-col-reverse gap-2 md:flex-row">
            <Button type="button" variant="outline" size="touch" onClick={discard} disabled={saving}>
              Discard
            </Button>
            <Button type="button" size="touch" onClick={save} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
