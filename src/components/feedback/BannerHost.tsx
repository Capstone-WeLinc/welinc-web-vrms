import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, Lock, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Banner } from '@/components/ui/banner';
import { useConnection } from '@/lib/connection/connection';
import { noAccessLine, readNoAccess } from '@/lib/navigation/noAccess';
import { useAuthStore } from '@/store/authStore';
import { staySignedIn } from '@/lib/session/session';
import { ANNOUNCE_AGAIN_MS, countdown, spokenTimeLeft } from '@/lib/session/timing';
import { useTimeLeft } from '../session/useCountdown';
import { NO_ACCESS_MS, pickBanner } from './bannerPriority';

/**
 * Suite spec 0016 AC-12: the one floating banner at the top center of the content area. It
 * replaces the old full width session strips (spec 0003, AC-23 and AC-25 keep their wording).
 */
export function BannerHost() {
  const { offline, backOnlineUntil } = useConnection();
  const reconnecting = useAuthStore((state) => state.reconnecting);
  const warning = useAuthStore((state) => state.idleWarning);
  const location = useLocation();
  const navigate = useNavigate();
  const noAccess = readNoAccess(location.state);

  const closeNoAccess = () => navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });

  // The note closes after 8 seconds, timed from when it first shows (it may wait behind a higher one)
  const slot = pickBanner({
    offline,
    reconnecting: reconnecting && !offline,
    signingOut: warning !== null,
    noAccess: noAccess !== null,
    backOnline: backOnlineUntil !== null,
  });
  const noAccessShowing = slot === 'noAccess';
  useEffect(() => {
    if (!noAccessShowing) return;
    const timer = setTimeout(closeNoAccess, NO_ACCESS_MS);
    return () => clearTimeout(timer);
    // closeNoAccess changes with the location; the timer belongs to this showing only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noAccessShowing]);

  let banner = null;
  if (slot === 'offline') {
    banner = (
      <Banner kind="warning" icon={WifiOff} title="You're offline">
        Changes won't save until the connection is back. We keep trying.
      </Banner>
    );
  } else if (slot === 'reconnecting') {
    banner = (
      <Banner kind="info" icon={RefreshCw} title="Reconnecting to the sign in service">
        You can keep working.
      </Banner>
    );
  } else if (slot === 'signingOut' && warning) {
    banner = <SigningOutBanner cutoff={warning.cutoff} cannotExtend={warning.cannotExtend} busy={warning.busy} />;
  } else if (slot === 'noAccess' && noAccess) {
    banner = (
      <Banner kind="info" icon={Lock} title={`You were sent to your ${noAccess.home}.`} onClose={closeNoAccess}>
        {noAccessLine(noAccess)}
      </Banner>
    );
  } else if (slot === 'backOnline') {
    banner = <Banner kind="success" icon={Wifi} title="Back online" />;
  }

  return (
    // Sticks just under the 64px app header, so it floats over the top of the page content
    <div className="pointer-events-none sticky top-16 z-50 h-0">
      {/* The signing out banner speaks through its own line, so its ticking time stays silent */}
      <div aria-live={slot === 'signingOut' ? 'off' : 'polite'} className="flex justify-center px-2 pt-4 md:px-4">
        {banner}
      </div>
    </div>
  );
}

/**
 * Signing out soon (suite spec 0016, AC-12; replaces spec 0003's idle dialog). It never takes
 * focus. **Stay signed in** is its only control; at the 12 hour end (or when Stay signed in finds
 * the cutoff didn't move) the text says it can't be extended, shows the time, and has no action.
 * Screen readers hear the minutes left once and again at 30 seconds; the ticking time is hidden
 * from them, and the switch to the 12 hour text is not announced again.
 */
function SigningOutBanner({ cutoff, cannotExtend, busy }: { cutoff: number; cannotExtend: boolean; busy: boolean }) {
  const left = useTimeLeft(cutoff);
  const endsAt = new Date(cutoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const spoken = useSpokenTimeLeft(left);
  const time = (
    <span aria-hidden="true" className="font-mono font-medium text-foreground">
      {countdown(left)}
    </span>
  );

  return (
    <Banner
      kind="warning"
      icon={Clock}
      announce={false}
      title={cannotExtend ? `Signing out at ${endsAt}` : 'Signing out soon'}
      action={cannotExtend ? undefined : { label: 'Stay signed in', onClick: () => void staySignedIn(), loading: busy }}
    >
      {cannotExtend
        ? 'This session reached its 12 hour limit and can\'t be extended. Save your work, then sign in again. '
        : 'You haven\'t done anything for a while. '}
      {time}
      <span role="status" className="sr-only">
        {spoken}
      </span>
    </Banner>
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
