import { createContext, useContext } from 'react';
import type { usePhotoUploadQueue } from './usePhotoUploadQueue';
import type { useTicketAttachments } from './useTicketAttachments';

/** One ticket's files and its one upload queue, shared by the photo strips and the Documents card (spec 0017). */
export interface TicketFiles {
  ticketId: string;
  attachments: ReturnType<typeof useTicketAttachments>;
  queue: ReturnType<typeof usePhotoUploadQueue>;
}

export const TicketFilesContext = createContext<TicketFiles | null>(null);

export function useTicketFiles(): TicketFiles {
  const files = useContext(TicketFilesContext);
  if (!files) throw new Error('useTicketFiles must be used inside TicketFilesProvider');
  return files;
}
