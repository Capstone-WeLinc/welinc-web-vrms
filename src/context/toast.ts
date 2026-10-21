import { toast } from 'sonner';

export type ToastType = 'success' | 'error' | 'info';

// sonner's live region is polite only. The Toaster registers a role="alert"
// region here so error toasts are also announced assertively.
type AlertAnnouncer = (message: string) => void;
let announceAlert: AlertAnnouncer | null = null;

export function registerAlertAnnouncer(announcer: AlertAnnouncer | null) {
  announceAlert = announcer;
}

function showToast(message: string, type: ToastType = 'success') {
  if (type === 'error') {
    toast.error(message);
    announceAlert?.(message);
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
