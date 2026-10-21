import { useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { confirmStore } from './confirm';

/** Renders the confirm() dialog. Mount once, inside BrowserRouter (App.tsx). */
export function ConfirmProvider() {
  const current = useSyncExternalStore(confirmStore.subscribe, confirmStore.getCurrent, confirmStore.getCurrent);
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;

  useEffect(() => confirmStore.attachProvider(), []);

  // Leaving the page answers every open and queued confirm with false.
  useEffect(() => {
    confirmStore.cancelAll();
  }, [routeKey]);

  if (!current) return null;

  const { id, options, opener } = current;
  const cancel = () => confirmStore.settle(id, false);

  return (
    // Keyed by request, so a queued confirm opens fresh after the previous one closes.
    <AlertDialog key={id} open onOpenChange={(open) => !open && cancel()}>
      <AlertDialogContent
        overlayProps={{ onClick: cancel }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (opener?.isConnected) opener.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title}</AlertDialogTitle>
          {options.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancel}>{options.cancelText ?? 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction
            variant={options.tone === 'destructive' ? 'destructive' : 'default'}
            onClick={() => confirmStore.settle(id, true)}
          >
            {options.confirmText ?? 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
