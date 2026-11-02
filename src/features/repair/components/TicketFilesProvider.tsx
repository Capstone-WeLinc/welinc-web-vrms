import { useCallback, type ReactNode } from 'react';
import { TicketFilesContext, type TicketFiles } from '../hooks/ticketFiles';
import { usePhotoUploadQueue } from '../hooks/usePhotoUploadQueue';
import { useTicketAttachments } from '../hooks/useTicketAttachments';

interface TicketFilesProviderProps {
  ticketId: string;
  /**
   * Spec 0018: an upload or remove can block or unblock a move, so the page reloads the ticket
   * (its `moves[].blockedBy`) each time the file list is fetched again.
   */
  onFilesChanged?: () => unknown;
  /** A function child also gets the files, so the page can read the queue (spec 0018, AC-20). */
  children: ReactNode | ((files: TicketFiles) => ReactNode);
}

/**
 * Loads a ticket's files once and keeps one upload queue for it (spec 0017, AC-23). The page keys
 * this by ticket, so moving to another ticket drops the old queue.
 */
export function TicketFilesProvider({ ticketId, onFilesChanged, children }: TicketFilesProviderProps) {
  const loaded = useTicketAttachments(ticketId);
  const loadedReload = loaded.reload;
  const reload = useCallback(async () => {
    const list = await loadedReload();
    void onFilesChanged?.();
    return list;
  }, [loadedReload, onFilesChanged]);

  const queue = usePhotoUploadQueue(ticketId, reload);
  const files: TicketFiles = { ticketId, attachments: { ...loaded, reload }, queue };
  return <TicketFilesContext.Provider value={files}>{typeof children === 'function' ? children(files) : children}</TicketFilesContext.Provider>;
}
