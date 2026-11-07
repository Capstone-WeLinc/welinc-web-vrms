import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
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
import { confirmStore, type ConfirmRequest } from './confirm';

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

  // Keyed by request, so a queued confirm opens fresh after the previous one closes.
  return current ? <ConfirmDialog key={current.id} request={current} /> : null;
}

function ConfirmDialog({ request }: { request: ConfirmRequest }) {
  const { id, options, opener } = request;
  const groupName = useId();
  const [choice, setChoice] = useState(options.choices?.[0]?.value);
  const cancel = () => confirmStore.settle(id, false);

  return (
    <AlertDialog open onOpenChange={(open) => !open && cancel()}>
      <AlertDialogContent
        overlayProps={{ onClick: cancel }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (opener?.isConnected) opener.focus();
        }}
      >
        {options.tone === 'warning' ? (
          // A soft amber icon beside the words: a heads-up, not an alarm
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-highlight/20 text-warning-text">
              <TriangleAlert className="size-5" />
            </span>
            <AlertDialogHeader className="text-left">
              <AlertDialogTitle>{options.title}</AlertDialogTitle>
              {options.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
            </AlertDialogHeader>
          </div>
        ) : (
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            {options.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
          </AlertDialogHeader>
        )}
        {options.choices && (
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{options.title}</legend>
            {options.choices.map((item) => (
              <label key={item.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={groupName}
                  value={item.value}
                  checked={choice === item.value}
                  onChange={() => setChoice(item.value)}
                  className="size-4 accent-primary"
                />
                {item.label}
              </label>
            ))}
          </fieldset>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancel}>{options.cancelText ?? 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction
            variant={options.tone === 'destructive' ? 'destructive' : 'default'}
            onClick={() => confirmStore.settle(id, true, choice)}
          >
            {options.confirmText ?? 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
