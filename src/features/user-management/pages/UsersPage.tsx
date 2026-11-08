import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchX, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/useIsMobile';
import { PageHeader } from '../../../components/layout/PageHeader';
import { confirmStore } from '../../../components/shared/confirm/confirm';
import { DataTable } from '../../../components/shared/data-table/DataTable';
import { lastPage } from '../../../components/shared/data-table/types';
import { useToast } from '../../../context/toast';
import { useAuthStore } from '../../../store/authStore';
import type { ManagedUser } from '../../../types';
import { UserFormDialog, type SaveOutcome } from '../components/UserFormDialog';
import { UserSessionsDialog } from '../components/UserSessionsDialog';
import { UserListFilters } from '../components/UserListFilters';
import { UserStatusTiles } from '../components/UserStatusTiles';
import { usersColumns } from '../components/usersColumns';
import { useUserActions } from '../hooks/useUserActions';
import { useUserFilters } from '../hooks/useUserFilters';
import { useUsers } from '../hooks/useUsers';
import { useWorkload } from '../hooks/useWorkload';
import { workStateOf } from '../lib/workload';
import { syncAfterSave } from '../lib/mechanicSync';
import { syncMechanics } from '../../../lib/api/vrmsConfigApi';
import { sortUsers } from '../lib/accountStatus';
import { rowFocusRef } from '../lib/focusReturn';
import { hasActiveFilters, matchesUserFilters, USERS_PAGE_SIZE } from '../lib/userFilters';

/** The open dialog: New user, or Edit with the row as it was when the dialog opened. */
type DialogState = { open: boolean; user: ManagedUser | null; session: number };

/** users.manage, in App.tsx and on the server (spec 0006, spec 0011). */
export function UsersPage() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const newUserButton = useRef<HTMLButtonElement>(null);
  const [dialog, setDialog] = useState<DialogState>({ open: false, user: null, session: 0 });
  // Read by callbacks that run outside render: the debounced search and a refetch.
  const dialogRef = useRef(dialog);
  useEffect(() => {
    dialogRef.current = dialog;
  }, [dialog]);

  const { filters, page, searchText, setSearchText, setFilters, setPage, clearFilters } = useUserFilters(
    () => dialogRef.current.open || confirmStore.getCurrent() !== null,
  );

  // A refetch that drops the row being edited closes its dialog (AC-11).
  const list = useUsers((users) => {
    const { open, user: editing } = dialogRef.current;
    if (!open || !editing || users.some((user) => user.id === editing.id)) return;
    showToast(`${editing.name} is no longer in the list.`, 'info');
    setDialog((current) => ({ ...current, open: false }));
  });

  const openDialog = (user: ManagedUser | null) => setDialog((current) => ({ open: true, user, session: current.session + 1 }));
  const closeDialog = () => setDialog((current) => ({ ...current, open: false }));
  const [sessions, setSessions] = useState<DialogState>({ open: false, user: null, session: 0 });
  const openSessions = (user: ManagedUser) => setSessions((current) => ({ open: true, user, session: current.session + 1 }));

  const { rowActions } = useUserActions({
    currentUserId,
    onEdit: openDialog,
    onSessions: openSessions,
    runWrite: list.runWrite,
    upsertUser: list.upsertUser,
  });

  // Once on open, silently: picks up mechanics added or changed elsewhere (spec 0009, AC-12)
  useEffect(() => {
    syncMechanics({ quiet: true }).catch(() => undefined);
  }, []);

  const onSaved = (user: ManagedUser, outcome: SaveOutcome) => {
    list.upsertUser(user);
    syncAfterSave(showToast);
    if (outcome === 'created') showToast(`${user.name} added. A setup code was sent to ${user.email}.`);
    else if (outcome === 'attached') showToast(`${user.name} added to VRMS. They keep their current password.`);
    else if (outcome === 'created-mail-failed')
      showToast(`${user.name} was added, but the setup email couldn’t be sent. Use Resend setup code.`, 'error');
    else showToast(`${user.name} updated.`);

    // Your own row: keep the header's name and email right (the store is memory only).
    const me = useAuthStore.getState().user;
    if (me && me.id === user.id) {
      const updated = { ...me, name: user.name, email: user.email };
      useAuthStore.setState({ user: updated });
    }
    closeDialog();
  };

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

  const sessionsFocus = useMemo(() => (sessions.user ? rowFocusRef(sessions.user.id) : newUserButton), [sessions.user]);
  const editFocus = useMemo(() => (dialog.user ? rowFocusRef(dialog.user.id) : newUserButton), [dialog.user]);

  const newUser = (
    <Button ref={newUserButton} onClick={() => openDialog(null)}>
      <UserPlus aria-hidden="true" />
      New user
    </Button>
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
        description: 'Add the first admin or mechanic.',
        icon: Users,
        action: (
          <Button onClick={() => openDialog(null)}>
            <UserPlus aria-hidden="true" />
            New user
          </Button>
        ),
      };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage who can sign in to VRMS and what they can do."
        icon={Users}
        action={newUser}
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

      <UserFormDialog
        key={dialog.session}
        open={dialog.open}
        onOpenChange={(open) => !open && closeDialog()}
        user={dialog.user}
        currentUserId={currentUserId}
        finalFocusRef={editFocus}
        runWrite={list.runWrite}
        refetch={list.refetch}
        onSaved={onSaved}
        onWorkChanged={reloadWorkload}
      />

      <UserSessionsDialog
        key={`sessions-${sessions.session}`}
        open={sessions.open}
        onOpenChange={(open) => !open && setSessions((current) => ({ ...current, open: false }))}
        user={sessions.user}
        finalFocusRef={sessionsFocus}
      />
    </div>
  );
}
