import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { confirm } from '../../../components/shared/confirm/confirm';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useToast } from '../../../context/toast';
import { approveDeletion, restoreUser, type DeletionRequest } from '../../../lib/api/authApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { formatManilaDay } from '../../auth/lib/accountDeletion';
import { decisionFailureMessage } from '../lib/deletionRequests';
import type { useDeletionRequests } from '../hooks/useDeletionRequests';
import { RejectDeletionDialog } from './RejectDeletionDialog';

type DeletionRequestsPanelProps = {
  lists: ReturnType<typeof useDeletionRequests>;
  /** The Users list changed (a person was deleted or restored). */
  onUsersChanged: () => void;
};

const codeOf = (err: unknown) => (isAxiosError<{ code?: string }>(err) ? err.response?.data?.code : undefined);

/**
 * Suite spec 0012, AC-23: pending requests (oldest first) with Approve and Reject, then the
 * accounts in grace (soonest erasure first) with Restore.
 */
export function DeletionRequestsPanel({ lists, onUsersChanged }: DeletionRequestsPanelProps) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [reject, setReject] = useState<{ open: boolean; request: DeletionRequest | null; session: number }>({
    open: false,
    request: null,
    session: 0,
  });
  const { pending, grace } = lists;

  const approve = async (request: DeletionRequest) => {
    const name = request.user?.name ?? 'this person';
    const ok = await confirm({
      title: `Delete ${name}’s account?`,
      description:
        'They are signed out everywhere and can’t sign in to any WeLinc system. Their open VRMS tickets are unassigned and go back to the Chief Mechanic. You can restore the account until their data is erased.',
      confirmText: 'Approve and delete',
      tone: 'destructive',
    });
    if (!ok) return;
    setBusy(request.id);
    try {
      const done = await approveDeletion(request.id);
      showToast(
        done.eraseAfter ? `${name}’s account is deleted. Their data is erased on ${formatManilaDay(done.eraseAfter)}.` : `${name}’s account is deleted.`,
        'success',
      );
      lists.reload();
      onUsersChanged();
    } catch (err) {
      showToast(decisionFailureMessage(codeOf(err), getApiErrorMessage(err, 'We couldn’t approve the request. Try again.')), 'error');
      lists.reload();
    } finally {
      setBusy(null);
    }
  };

  const restore = async (userId: string, name: string) => {
    const ok = await confirm({
      title: `Restore ${name}’s account?`,
      description: 'Their data is kept. The account comes back turned off: activate it when they should sign in again. Their old tickets stay unassigned.',
      confirmText: 'Restore account',
    });
    if (!ok) return;
    setBusy(userId);
    try {
      await restoreUser(userId);
      showToast(`${name}’s account is restored and turned off.`, 'success');
      lists.reload();
      onUsersChanged();
    } catch (err) {
      showToast(decisionFailureMessage(codeOf(err), getApiErrorMessage(err, 'We couldn’t restore the account. Try again.')), 'error');
      lists.reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Waiting for a decision</CardTitle>
          <CardDescription>People who asked to delete their account. Oldest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.status === 'loading' && <Skeleton className="h-16 w-full" />}
          {pending.status === 'error' && <ErrorState title="Requests didn’t load" message={pending.message} onRetry={lists.reload} />}
          {pending.status === 'ready' && pending.rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No one is waiting. New requests show here.</p>
          )}
          {pending.status === 'ready' && pending.rows.length > 0 && (
            <ul className="divide-y divide-border">
              {pending.rows.map((request) => (
                <li key={request.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{request.user?.name}</p>
                    <p className="text-sm break-all text-muted-foreground">{request.user?.email}</p>
                    <p className="mt-2 text-sm break-words">
                      {request.reason ? <q>{request.reason}</q> : <span className="text-muted-foreground">No reason given.</span>}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Asked on <time dateTime={request.requestedAt}>{formatManilaDay(request.requestedAt)}</time>
                      {request.user && request.user.systems.length > 1 ? `, uses ${request.user.systems.join(', ')}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy !== null}
                      onClick={() => setReject((current) => ({ open: true, request, session: current.session + 1 }))}
                    >
                      Reject
                    </Button>
                    <Button variant="destructive" size="sm" loading={busy === request.id} disabled={busy !== null} onClick={() => approve(request)}>
                      Approve
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pending.status === 'ready' && pending.nextCursor && (
            <Button variant="outline" className="mt-4" loading={pending.loadingMore} onClick={lists.morePending}>
              Load more
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deleted, not erased yet</CardTitle>
          <CardDescription>Accounts you can still restore. Soonest erasure first.</CardDescription>
        </CardHeader>
        <CardContent>
          {grace.status === 'loading' && <Skeleton className="h-16 w-full" />}
          {grace.status === 'error' && <ErrorState title="Deleted accounts didn’t load" message={grace.message} onRetry={lists.reload} />}
          {grace.status === 'ready' && grace.rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No deleted accounts are waiting to be erased.</p>
          )}
          {grace.status === 'ready' && grace.rows.length > 0 && (
            <ul className="divide-y divide-border">
              {grace.rows.map((item) => (
                <li key={item.user.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{item.user.name}</p>
                    <p className="text-sm break-all text-muted-foreground">{item.user.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Erased on <time dateTime={item.eraseAfter}>{formatManilaDay(item.eraseAfter)}</time>
                      {item.requestId ? ', they asked for it' : ', deleted by an admin'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    loading={busy === item.user.id}
                    disabled={busy !== null}
                    onClick={() => restore(item.user.id, item.user.name)}
                  >
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {grace.status === 'ready' && grace.nextCursor && (
            <Button variant="outline" className="mt-4" loading={grace.loadingMore} onClick={lists.moreGrace}>
              Load more
            </Button>
          )}
        </CardContent>
      </Card>

      <RejectDeletionDialog
        key={reject.session}
        open={reject.open}
        onOpenChange={(open) => setReject((current) => ({ ...current, open }))}
        request={reject.request}
        onRejected={() => {
          setReject((current) => ({ ...current, open: false }));
          showToast('Request rejected. They got your note.', 'success');
          lists.reload();
          onUsersChanged();
        }}
      />
    </div>
  );
}
