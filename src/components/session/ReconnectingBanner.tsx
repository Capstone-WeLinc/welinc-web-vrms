import { RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

/**
 * The quiet "Reconnecting" banner (spec 0003, AC-25): shown while a background refresh can't
 * reach the server. The page keeps working on the current token meanwhile.
 */
export function ReconnectingBanner() {
  const reconnecting = useAuthStore((state) => state.reconnecting);
  return (
    <div role="status" aria-live="polite">
      {reconnecting && (
        <p className="flex items-center justify-center gap-2 border-b border-highlight bg-highlight/15 px-4 py-2 text-sm text-foreground">
          <RefreshCw aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
          Reconnecting to the sign in service. You can keep working.
        </p>
      )}
    </div>
  );
}
