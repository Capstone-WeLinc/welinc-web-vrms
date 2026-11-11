import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { confirm } from '../../../components/shared/confirm/confirm';
import { useToast } from '../../../context/toast';
import { cancelDeletionRequest, getOwnDeletionRequest, type DeletionRequest } from '../../../lib/api/authApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { deletionCardState, formatManilaDay } from '../lib/accountDeletion';
import { DeleteAccountDialog } from './DeleteAccountDialog';

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; request: DeletionRequest | null };

/** Suite spec 0012, AC-22: the danger zone at the bottom of My profile. */
export function DeleteAccountCard() {
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [dialog, setDialog] = useState({ open: false, session: 0 });
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOwnDeletionRequest()
      .then((request) => {
        if (!cancelled) setState({ status: 'ready', request });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const openDialog = () => setDialog((current) => ({ open: true, session: current.session + 1 }));

  const cancelRequest = async () => {
    const ok = await confirm({
      title: 'Cancel your deletion request?',
      description: 'Your account stays as it is. You can ask again later.',
      confirmText: 'Cancel request',
      cancelText: 'Keep request',
    });
    if (!ok) return;
    setCancelling(true);
    try {
      await cancelDeletionRequest();
      showToast('Your deletion request is cancelled.', 'success');
      setState({ status: 'ready', request: await getOwnDeletionRequest() });
    } catch (err) {
      showToast(getApiErrorMessage(err, 'We couldn’t cancel your request. Try again.'), 'error');
    } finally {
      setCancelling(false);
    }
  };

  const view = state.status === 'ready' ? deletionCardState(state.request) : null;

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Delete account</CardTitle>
        <CardDescription>Ask an admin to close your WeLinc account and erase your personal data.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {state.status === 'loading' && <Skeleton className="h-9 w-full sm:w-64" />}

        {state.status === 'error' && (
          <>
            <p className="text-sm text-muted-foreground">We couldn’t check for a deletion request.</p>
            <Button variant="outline" onClick={() => { setState({ status: 'loading' }); setAttempt((n) => n + 1); }}>
              Try again
            </Button>
          </>
        )}

        {view?.kind === 'none' && (
          <>
            <p className="text-sm text-muted-foreground">An admin reviews it first. Until then you can cancel.</p>
            <Button variant="destructive" className="w-full sm:w-auto" onClick={openDialog}>
              Delete account
            </Button>
          </>
        )}

        {view?.kind === 'pending' && (
          <>
            <p className="text-sm" role="status">
              You asked to delete your account on <strong>{formatManilaDay(view.requestedAt)}</strong>. An admin
              is reviewing it.
            </p>
            <Button variant="outline" className="w-full sm:w-auto" loading={cancelling} onClick={cancelRequest}>
              Cancel request
            </Button>
          </>
        )}

        {view?.kind === 'rejected' && (
          <>
            <div className="text-sm">
              <p>
                Your request was not approved
                {view.decidedAt ? ` on ${formatManilaDay(view.decidedAt)}` : ''}.
              </p>
              {view.note && (
                <p className="mt-1 text-muted-foreground">
                  The admin’s note: <q className="break-words">{view.note}</q>
                </p>
              )}
            </div>
            <Button variant="destructive" className="w-full shrink-0 sm:w-auto" onClick={openDialog}>
              Ask again
            </Button>
          </>
        )}
      </CardContent>

      <DeleteAccountDialog
        key={dialog.session}
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        onRequested={(request) => {
          setDialog((current) => ({ ...current, open: false }));
          setState({ status: 'ready', request });
          showToast('Your request is sent. An admin reviews it.', 'success');
        }}
      />
    </Card>
  );
}
