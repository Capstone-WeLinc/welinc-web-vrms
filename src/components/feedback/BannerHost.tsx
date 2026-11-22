import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, Lock, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Banner } from '@/components/ui/banner';
import { useConnection } from '@/lib/connection/connection';
import { noAccessLine, readNoAccess } from '@/lib/navigation/noAccess';
import { useAuthStore } from '@/store/authStore';
import { useCountdown } from '../session/useCountdown';
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
  const ending = warning?.cannotExtend && warning.dismissed ? warning.cutoff : null;

  const closeNoAccess = () => navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });

  // The note closes after 8 seconds, timed from when it first shows (it may wait behind a higher one)
  const slot = pickBanner({
    offline,
    reconnecting: reconnecting && !offline,
    signingOut: ending !== null,
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
  } else if (slot === 'signingOut' && ending !== null) {
    banner = <SigningOutBanner cutoff={ending} />;
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
      <div aria-live="polite" className="flex justify-center px-2 pt-4 md:px-4">
        {banner}
      </div>
    </div>
  );
}

/**
 * After **Keep working** on the 12 hour warning (spec 0003, AC-23): when the session ends,
 * counting down, so closing the dialog never hides the deadline. Nothing can extend it.
 */
function SigningOutBanner({ cutoff }: { cutoff: number }) {
  const left = useCountdown(cutoff);
  const [endsAt] = useState(() => new Date(cutoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
  return (
    <Banner kind="warning" icon={Clock} title={`Signing out at ${endsAt}`}>
      This session reaches its 12 hour limit. Save your work, then sign in again.{' '}
      <span className="font-mono font-medium text-foreground">{left}</span>
    </Banner>
  );
}
