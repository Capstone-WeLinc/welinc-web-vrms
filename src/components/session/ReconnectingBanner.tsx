import { Clock, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCountdown } from './useCountdown';

/**
 * The quiet "Reconnecting" banner (spec 0003, AC-25): shown while a background refresh can't
 * reach the server. The page keeps working on the current token meanwhile.
 */
export function ReconnectingBanner() {
  const reconnecting = useAuthStore((state) => state.reconnecting);
  const warning = useAuthStore((state) => state.idleWarning);
  const ending = warning?.cannotExtend && warning.dismissed ? warning.cutoff : null;
  return (
    <div role="status" aria-live="polite">
      {ending !== null && <SessionEndingBanner cutoff={ending} />}
      {reconnecting && (
        <p className="flex items-center justify-center gap-2 border-b border-highlight bg-highlight/15 px-4 py-2 text-sm text-foreground">
          <RefreshCw aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
          Reconnecting to the sign in service. You can keep working.
        </p>
      )}
    </div>
  );
}

/**
 * After **Keep working** on the 12 hour warning (spec 0003, AC-23): a quiet reminder of when the
 * session ends, counting down, so closing the dialog never hides the deadline.
 */
function SessionEndingBanner({ cutoff }: { cutoff: number }) {
  const left = useCountdown(cutoff);
  const endsAt = new Date(cutoff).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <p className="flex items-center justify-center gap-2 border-b border-highlight bg-highlight/15 px-4 py-2 text-sm text-foreground">
      <Clock aria-hidden="true" className="size-4 shrink-0" />
      <span>
        This session reaches its 12 hour limit at {endsAt}. Save your work, then sign in again.{' '}
        <span className="font-semibold tabular-nums">{left}</span>
      </span>
    </p>
  );
}
