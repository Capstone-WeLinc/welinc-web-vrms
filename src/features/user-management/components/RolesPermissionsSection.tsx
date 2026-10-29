import { Fragment } from 'react';
import { Check, Lock, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DetailSection } from '../../../components/shared/DetailSection';
import { ErrorState } from '../../../components/shared/ErrorState';
import type { MatrixGrant } from '../../../lib/api/permissionsApi';
import { formatDateTime } from '../../../lib/utils/format';
import { usePermissionMatrix } from '../hooks/usePermissionMatrix';
import { changeActor, changeSubject, changeVerb } from '../lib/permissionChanges';

/** One cell: allowed, not allowed, and a lock when nobody can change it. The words are for screen readers. */
function GrantCell({ grant }: { grant: MatrixGrant | undefined }) {
  const allowed = grant?.allowed === true;
  const Icon = allowed ? Check : Minus;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon aria-hidden="true" className={allowed ? 'size-4 text-success' : 'size-4 text-muted-foreground'} />
      {grant?.locked && <Lock aria-hidden="true" className="size-3.5 text-muted-foreground" />}
      <span className="sr-only">
        {allowed ? 'Allowed' : 'Not allowed'}
        {grant?.locked ? ', locked' : ''}
      </span>
    </span>
  );
}

/**
 * Read only view of what each role may do, and the last ten changes (spec 0011, AC-25). Editing
 * waits for the Settings hub (feature 52).
 */
export function RolesPermissionsSection() {
  const { state, matrix, changes, errorMessage, retry } = usePermissionMatrix();

  return (
    <DetailSection title="Roles and permissions" className="mt-6">
      <p className="-mt-2 text-sm text-muted-foreground">
        What each VRMS role may do. A lock marks a right nobody can change. Editing comes with the Settings page.
      </p>

      {state === 'loading' && (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading permissions">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      )}

      {state === 'error' && <ErrorState title="Couldn’t load the permissions." message={errorMessage ?? 'Check your connection, then try again.'} onRetry={retry} retryText="Retry" />}

      {matrix && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Permission</TableHead>
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
                      {group.name}
                    </TableHead>
                  </TableRow>
                  {group.keys.map((key) => (
                    <TableRow key={key.key}>
                      <TableHead scope="row" className="h-auto py-2 font-normal whitespace-normal text-foreground">
                        {key.label}
                      </TableHead>
                      {matrix.roles.map((role) => (
                        <TableCell key={role.role} className="text-center">
                          <GrantCell grant={key.grants[role.role]} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">Recent changes</h3>
            {changes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No changes yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {changes.map((change) => {
                  const subject = changeSubject(change, matrix);
                  return (
                    <li key={change.id} className="flex flex-col gap-0.5 py-2 text-sm">
                      <span className="break-words text-foreground">
                        {changeVerb(change)}: {subject.permission} for {subject.role}
                      </span>
                      <span className="text-xs break-words text-muted-foreground">
                        {changeActor(change)} · <time dateTime={change.createdAt}>{formatDateTime(change.createdAt)}</time>
                        {change.note && ` · “${change.note}”`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </DetailSection>
  );
}
