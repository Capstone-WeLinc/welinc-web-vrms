import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '../../store/authStore';
import { staySignedIn } from '../../lib/session/session';
import { signOutFlow } from '../../lib/session/signOutFlow';
import { countdown } from '../../lib/session/timing';

/**
 * The idle warning (spec 0003, AC-23): opens a minute before the session's cutoff with a
 * countdown. **Stay signed in** keeps the session; Escape counts as staying too. When the cutoff
 * passes, the session module leaves for the portal with `reason=idle`.
 */
export function IdleWarningDialog() {
  const warning = useAuthStore((state) => state.idleWarning);
  const stayRef = useRef<HTMLButtonElement>(null);
  const endsAt = warning
    ? new Date(warning.cutoff).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <AlertDialog
      open={warning !== null}
      onOpenChange={(open) => {
        if (!open && warning && !warning.cannotExtend) void staySignedIn();
      }}
    >
      <AlertDialogContent
        onOpenAutoFocus={(event) => {
          // Start on the safe action: a stray Enter keeps the session, it never logs out
          if (!stayRef.current) return;
          event.preventDefault();
          stayRef.current.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Clock aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {warning?.cannotExtend ? 'Your session is ending' : 'Are you still there?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {warning?.cannotExtend
              ? `This session has reached its 12 hour limit and ends at ${endsAt}. Save your work, then sign in again.`
              : `There has been no activity for a while, so you will be signed out at ${endsAt}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {warning && <Countdown cutoff={warning.cutoff} />}
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={(event) => {
              event.preventDefault();
              void signOutFlow({ ask: false });
            }}
          >
            Log out
          </AlertDialogCancel>
          {!warning?.cannotExtend && (
            <AlertDialogAction
              ref={stayRef}
              disabled={warning?.busy}
              onClick={(event) => {
                event.preventDefault();
                void staySignedIn();
              }}
            >
              {warning?.busy ? 'Checking...' : 'Stay signed in'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Ticks once a second while the warning is open; mounted only then, so it starts on time. */
function Countdown({ cutoff }: { cutoff: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  const left = countdown(cutoff - now);
  return (
    <p
      role="timer"
      aria-live="off"
      aria-label={`Time left: ${left}`}
      className="text-center text-3xl font-semibold tabular-nums text-foreground"
    >
      {left}
    </p>
  );
}
