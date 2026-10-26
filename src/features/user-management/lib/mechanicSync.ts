import { syncMechanics } from '../../../lib/api/vrmsConfigApi';
import type { ToastType } from '../../../context/toast';

export const SYNC_FAILED_AFTER_SAVE =
  "Saved, but VRMS couldn't update its mechanic list. It will catch up next time this page opens.";

/**
 * After a Users page save: brings VRMS's mechanics in step (spec 0009, AC-12). Never blocks or
 * rolls back the save; a failure only warns.
 */
export function syncAfterSave(showToast: (message: string, type?: ToastType) => void) {
  void syncMechanics({ quiet: true }).catch(() => showToast(SYNC_FAILED_AFTER_SAVE, 'warning'));
}
