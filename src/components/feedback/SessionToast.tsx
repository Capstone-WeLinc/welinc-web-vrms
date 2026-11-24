import { useEffect, useRef, useState } from 'react';
import { Toast } from '@/components/ui/toast';
import { dismissSessionToast, showSessionToast } from '@/context/toast';
import { staySignedIn } from '@/lib/session/session';
import { ANNOUNCE_AGAIN_MS, countdown, spokenTimeLeft } from '@/lib/session/timing';
import { useAuthStore } from '@/store/authStore';
import { useTimeLeft } from '../session/useCountdown';

type Warning = { cutoff: number; cannotExtend: boolean; busy: boolean };

/**
 * Suite spec 0019, AC-25: shows the session warning toast while the session code says signing out
 * is near (`idleWarning`), and takes it away when it closes (Stay signed in worked, a check found
 * the cutoff moved, or the tab left). The timing is suite spec 0016 AC-12 to AC-12b, unchanged.
 */
export function SessionToastHost() {
  const open = useAuthStore((state) => state.idleWarning !== null);
  useEffect(() => {
    if (!open) return;
    showSessionToast(() => <SessionToast />);
    return dismissSessionToast;
  }, [open]);
  return null;
}

/** The toast itself; it reads the store, so it redraws on its own as the state changes. */
export function SessionToast() {
  const warning = useAuthStore((state) => state.idleWarning);
  if (!warning) return null;
  return <SessionToastBody warning={warning} />;
}

/**
 * Idle: "Still there?" with a live countdown and Stay signed in. The 12 hour end (or when Stay
 * signed in found the cutoff didn't move): the time it ends, no action. It never takes focus,
 * keeps the ticking time hidden from screen readers, and speaks once on open and again at 30 s.
 */
export function SessionToastBody({ warning }: { warning: Warning }) {
  const left = useTimeLeft(warning.cutoff);
  const spoken = useSpokenTimeLeft(left);
  const speech = (
    <span role="status" className="sr-only">
      {spoken}
    </span>
  );

  if (warning.cannotExtend) {
    const endsAt = new Date(warning.cutoff).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return (
      <Toast
        kind="warning"
        persistent
        announce={false}
        title={`Your session ends at ${endsAt}`}
        body={
          <>
            This is the 12 hour limit. Sign in again to keep working.
            {speech}
          </>
        }
        onClose={() => undefined}
      />
    );
  }
  return (
    <Toast
      kind="warning"
      persistent
      announce={false}
      title="Still there?"
      body={
        <>
          You'll be signed out in{' '}
          <span aria-hidden="true" className="font-mono font-medium text-foreground">
            {countdown(left)}
          </span>{' '}
          for inactivity.
          {speech}
        </>
      }
      action={{ label: 'Stay signed in', onClick: () => void staySignedIn(), loading: warning.busy, keepOpen: true }}
      onClose={() => undefined}
    />
  );
}

/**
 * The line a screen reader hears: empty on the first render, then set, so the live region exists
 * before its text arrives and the text is read; set again once at 30 seconds.
 */
function useSpokenTimeLeft(left: number): string {
  const [spoken, setSpoken] = useState('');
  const saidAgain = useRef(false);
  const first = useRef(left);
  useEffect(() => {
    setSpoken(spokenTimeLeft(first.current));
  }, []);
  useEffect(() => {
    if (saidAgain.current || first.current <= ANNOUNCE_AGAIN_MS || left > ANNOUNCE_AGAIN_MS) return;
    saidAgain.current = true;
    setSpoken(spokenTimeLeft(ANNOUNCE_AGAIN_MS));
  }, [left]);
  return spoken;
}
