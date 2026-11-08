import { useRef } from 'react';
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
import { keepWorking, staySignedIn } from '../../lib/session/session';
import { signOutFlow } from '../../lib/session/signOutFlow';
import { useCountdown } from './useCountdown';

/**
 * The idle warning (spec 0003, AC-23): opens a minute before the session's cutoff with a
 * countdown. **Stay signed in** keeps the session; Escape counts as staying too. At the 12 hour
 * limit nothing can extend it, so the choice is **Keep working** (close this and finish up; a
 * banner keeps counting) or **Sign out now**. When the cutoff passes, the session module leaves
 * for the portal with `reason=idle`, or `reason=maxage` at the 12 hour end.
 */
export function IdleWarningDialog() {
  const warning = useAuthStore((state) => state.idleWarning);
  const stayRef = useRef<HTMLButtonElement>(null);
  const ending = warning?.cannotExtend ?? false;
  const endsAt = warning
    ? new Date(warning.cutoff).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <AlertDialog
      open={warning !== null && !warning.dismissed}
      onOpenChange={(open) => {
        if (open || !warning) return;
        // Escape is the safe choice: stay signed in, or at the 12 hour limit, keep working
        if (warning.cannotExtend) keepWorking();
        else void staySignedIn();
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
          <AlertDialogTitle>{ending ? 'Your session is ending' : 'Are you still there?'}</AlertDialogTitle>
          <AlertDialogDescription>
            {ending
              ? `This session reaches its 12 hour limit at ${endsAt}. Keep working to save what you have open, then sign in again.`
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
            {ending ? 'Sign out now' : 'Log out'}
          </AlertDialogCancel>
          {ending ? (
            <AlertDialogAction
              ref={stayRef}
              onClick={(event) => {
                event.preventDefault();
                keepWorking();
              }}
            >
              Keep working
            </AlertDialogAction>
          ) : (
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
  const left = useCountdown(cutoff);
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
