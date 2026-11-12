import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, SearchX, UserPlus, Users } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { PageHeader } from '../../../components/layout/PageHeader';
import { confirmStore } from '../../../components/shared/confirm/confirm';
import { DataTable } from '../../../components/shared/data-table/DataTable';
import { lastPage, type RowAction } from '../../../components/shared/data-table/types';
import { useAuthStore } from '../../../store/authStore';
import type { ManagedUser } from '../../../types';
import { TeamPersonDialog } from '../components/TeamPersonDialog';
import { UserListFilters } from '../components/UserListFilters';
import { UserStatusTiles } from '../components/UserStatusTiles';
import { usersColumns } from '../components/usersColumns';
import { useUserFilters } from '../hooks/useUserFilters';
import { useUsers } from '../hooks/useUsers';
import { useVrmsRoles } from '../hooks/useVrmsRoles';
import { useWorkload } from '../hooks/useWorkload';
import { workStateOf } from '../lib/workload';
import { onMechanicRoster, sortUsers } from '../lib/accountStatus';
import { rowFocusRef } from '../lib/focusReturn';
import { addUserUrl, manageAccountUrl } from '../lib/portalLinks';
import { hasActiveFilters, matchesUserFilters, USERS_PAGE_SIZE } from '../lib/userFilters';

/** The open person dialog, with the row as it was when it opened. */
type DialogState = { open: boolean; user: ManagedUser | null; session: number };

/**
 * The VRMS team and their work (suite spec 0013, AC-31), behind `team.manage` in App.tsx and on
 * the server. Account changes moved to the portal's Admin section: each row's Manage account and
 * Add user open it in a new tab, and the list refetches when this tab is shown again.
 */
export function UsersPage() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const isMobile = useIsMobile();
  const [dialog, setDialog] = useState<DialogState>({ open: false, user: null, session: 0 });
  // Read by callbacks that run outside render: the debounced search and a refetch.
  const dialogRef = useRef(dialog);
  useEffect(() => {
    dialogRef.current = dialog;
  }, [dialog]);

  const { filters, page, searchText, setSearchText, setFilters, setPage, clearFilters } = useUserFilters(
    () => dialogRef.current.open || confirmStore.getCurrent() !== null,
  );

  // A refetch that drops the open person closes their dialog (spec 0006, AC-11).
  const list = useUsers((users) => {
    const { open, user } = dialogRef.current;
    if (!open || !user || users.some((u) => u.id === user.id)) return;
    setDialog((current) => ({ ...current, open: false }));
  });

  const openDialog = (user: ManagedUser) => setDialog((current) => ({ open: true, user, session: current.session + 1 }));
  const closeDialog = () => setDialog((current) => ({ ...current, open: false }));

  // Spec 0004, AC-20: the role filter reads welinc-auth's catalog, one request
  const roles = useVrmsRoles();

  // Feature 57: Occupied or Free and open counts for each mechanic
  const { workload, reload: reloadWorkload } = useWorkload(list.users);

  const sorted = useMemo(() => sortUsers(list.users), [list.users]);
  const visible = useMemo(
    () => sorted.filter((user) => matchesUserFilters(user, filters, workStateOf(user, workload))),
    [sorted, filters, workload],
  );
  // A page past the end shows the last page; the URL stays as it is (AC-6).
  const shownPage = Math.min(page, lastPage(visible.length, USERS_PAGE_SIZE));
  const pageRows = visible.slice((shownPage - 1) * USERS_PAGE_SIZE, shownPage * USERS_PAGE_SIZE);

  const dialogFocus = useMemo(() => (dialog.user ? rowFocusRef(dialog.user.id) : undefined), [dialog.user]);

  const rowActions = (user: ManagedUser): RowAction[] => [
    ...(onMechanicRoster(user) ? [{ label: 'Open tickets', onSelect: () => openDialog(user) }] : []),
    { label: 'Manage account', hint: 'Opens the portal', externalHref: manageAccountUrl(user.id) },
  ];

  const addUser = (
    <a
      href={addUserUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants(), 'w-full md:w-auto')}
    >
      <UserPlus aria-hidden="true" />
      Add user
      <ExternalLink aria-hidden="true" />
      <span className="sr-only"> (opens the portal in a new tab)</span>
    </a>
  );

  const empty = hasActiveFilters(filters)
    ? {
        title: 'No users match these filters',
        description: 'Try another search, or clear the filters to see everyone.',
        icon: SearchX,
        action: (
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        ),
      }
    : {
        title: 'No users yet',
        description: 'Add the first admin or mechanic in the portal.',
        icon: Users,
        action: addUser,
      };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Your VRMS team and their open work. Account changes happen in the portal."
        icon={Users}
        action={addUser}
      />

      {list.status !== 'error' && (
        <UserStatusTiles
          users={list.users}
          loading={list.status === 'loading'}
          selected={filters.status}
          onSelect={(status) => setFilters({ status: filters.status === status ? 'all' : status })}
        />
      )}

      <UserListFilters
        value={filters}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onChange={setFilters}
        onClear={clearFilters}
        roles={roles}
      />

      <DataTable
        columns={usersColumns(currentUserId, isMobile, workload)}
        rows={pageRows}
        getRowId={(user) => user.id}
        state={list.status}
        errorMessage={list.errorMessage}
        onRetry={list.retry}
        label="Users"
        onRowClick={openDialog}
        rowActions={rowActions}
        rowActionsLabel={(user) => `Actions for ${user.name}`}
        pagination={
          visible.length > USERS_PAGE_SIZE
            ? { page: shownPage, pageSize: USERS_PAGE_SIZE, total: visible.length, onPageChange: setPage }
            : undefined
        }
        empty={empty}
      />

      <TeamPersonDialog
        key={dialog.session}
        open={dialog.open}
        onOpenChange={(open) => !open && closeDialog()}
        user={dialog.user}
        finalFocusRef={dialogFocus}
        onWorkChanged={reloadWorkload}
      />
    </div>
  );
}
