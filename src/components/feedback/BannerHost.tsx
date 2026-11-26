import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Banner } from '@/components/ui/banner';
import { useConnection } from '@/lib/connection/connection';
import { noAccessLine, readNoAccess } from '@/lib/navigation/noAccess';
import { useAuthStore } from '@/store/authStore';
import { NO_ACCESS_MS, pickBanner } from './bannerPriority';

/**
 * Suite spec 0016 AC-12: the one floating banner at the top center of the content area. It
 * replaces the old full width session strips. Signing out soon is the session warning toast now
 * (suite spec 0019, AC-25, `SessionToast.tsx`), which shows alongside these.
 */
export function BannerHost() {
  const { offline, backOnlineUntil } = useConnection();
  const reconnecting = useAuthStore((state) => state.reconnecting);
  const location = useLocation();
  const navigate = useNavigate();
  const noAccess = readNoAccess(location.state);

  const closeNoAccess = () => navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });

  // The note closes after 8 seconds, timed from when it first shows (it may wait behind a higher one)
  const slot = pickBanner({
    offline,
    reconnecting: reconnecting && !offline,
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
