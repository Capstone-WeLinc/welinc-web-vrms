import { toast } from 'sonner';
import { DENIED_MESSAGE, DENIED_TOAST_MS } from '../lib/permissions/keys';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

// sonner's live region is polite only. The Toaster registers a role="alert"
// region here so error toasts are also announced assertively.
type AlertAnnouncer = (message: string) => void;
let announceAlert: AlertAnnouncer | null = null;

export function registerAlertAnnouncer(announcer: AlertAnnouncer | null) {
  announceAlert = announcer;
}

let lastDeniedToast = 0;

/** For code outside React, such as the axios interceptor; components use useToast(). */
export function showToast(message: string, type: ToastType = 'success') {
  // The denied text shows at most once per window, however many callers raise it (spec 0011, AC-24)
  if (message === DENIED_MESSAGE) {
    const now = Date.now();
    if (now - lastDeniedToast < DENIED_TOAST_MS) return;
    lastDeniedToast = now;
  }
  if (type === 'error') {
    toast.error(message);
    announceAlert?.(message);
  } else if (type === 'warning') {
    toast.warning(message);
  } else if (type === 'info') {
    toast.info(message);
  } else {
    toast.success(message);
  }
}

// One stable object, so callers can list showToast in effect dependencies.
const toastApi = { showToast };

export function useToast() {
  return toastApi;
}
