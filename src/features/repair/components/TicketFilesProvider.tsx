import type { ReactNode } from 'react';
import { TicketFilesContext } from '../hooks/ticketFiles';
import { usePhotoUploadQueue } from '../hooks/usePhotoUploadQueue';
import { useTicketAttachments } from '../hooks/useTicketAttachments';

/**
 * Loads a ticket's files once and keeps one upload queue for it (spec 0017, AC-23). The page keys
 * this by ticket, so moving to another ticket drops the old queue.
 */
export function TicketFilesProvider({ ticketId, children }: { ticketId: string; children: ReactNode }) {
  const attachments = useTicketAttachments(ticketId);
  const queue = usePhotoUploadQueue(ticketId, attachments.reload);
  return <TicketFilesContext.Provider value={{ ticketId, attachments, queue }}>{children}</TicketFilesContext.Provider>;
}
