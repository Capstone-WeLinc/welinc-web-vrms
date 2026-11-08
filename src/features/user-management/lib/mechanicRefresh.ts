import { refreshMechanic } from '../../../lib/api/vrmsConfigApi';
import type { ToastType } from '../../../context/toast';

export const REFRESH_FAILED_AFTER_SAVE =
  "Saved, but VRMS couldn't update its mechanic list. It will catch up within a minute.";

/**
 * After a Users page save: brings that one person's mechanic row in step at once (spec 0005,
 * AC-20). Never blocks or rolls back the save; a failure only warns, and the 30 s directory
 * poll catches up anyway.
 */
export function refreshAfterSave(
  authUserId: string,
  showToast: (message: string, type?: ToastType) => void,
) {
  void refreshMechanic(authUserId, { quiet: true }).catch(() =>
    showToast(REFRESH_FAILED_AFTER_SAVE, 'warning'),
  );
}
