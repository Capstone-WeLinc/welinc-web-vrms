import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { RepairStatus } from '../../../types';
import { initialOpen, issueHashIndex, type IssueState } from '../lib/issueRow';
import { parseView, pruneView, type TicketView, touchIndex, VIEW_INDEX_KEY, viewKey } from '../lib/ticketView';

function readStored(ticketId: string): TicketView | null {
  try {
    return parseView(window.sessionStorage.getItem(viewKey(ticketId)));
  } catch {
    return null;
  }
}

/** Saves the view and keeps only the newest tickets; a storage failure keeps the view in memory only. */
function writeStored(ticketId: string, view: TicketView) {
  try {
    const storage = window.sessionStorage;
    storage.setItem(viewKey(ticketId), JSON.stringify(view));
    const { index, evicted } = touchIndex(storage.getItem(VIEW_INDEX_KEY), ticketId);
    storage.setItem(VIEW_INDEX_KEY, JSON.stringify(index));
    for (const id of evicted) storage.removeItem(viewKey(id));
  } catch {
    // Private mode or full storage: AC-5 says the page keeps working from memory
  }
}

const withHash = (view: TicketView, hash: string, ids: string[]): TicketView => {
  const index = issueHashIndex(hash, ids.length);
  return index == null || view.open.includes(ids[index]) ? view : { ...view, open: [...view.open, ids[index]] };
};

/**
 * Spec 0024, AC-4 and AC-5: the open rows and the one Hide done steps switch for one ticket. The
 * stored view wins over the default rule, `#issue-N` opens its row on top, and the 3 second
 * refresh never opens or closes a row (the value is state, never derived from the ticket).
 */
export function useTicketView(ticketId: string, status: RepairStatus, rows: { id: string; state: IssueState }[]) {
  const { hash } = useLocation();
  const ids = rows.map((row) => row.id);
  const [view, setView] = useState<TicketView>(() => {
    const stored = readStored(ticketId);
    return withHash(stored ? pruneView(stored, ids) : { open: initialOpen(status, rows), hideDone: false }, hash, ids);
  });
  const [seenHash, setSeenHash] = useState(hash);
  if (hash !== seenHash) {
    setSeenHash(hash);
    setView((v) => withHash(v, hash, ids));
  }

  // Once per hash value: bring the linked row into view (rows carry scroll-margin-top for the header)
  useEffect(() => {
    if (!/^#issue-\d+$/.test(hash)) return;
    const row = document.getElementById(hash.slice(1));
    if (!row) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [hash]);

  // A removed issue drops out; an issue that appears later starts closed (it is in neither list)
  const shown = pruneView(view, ids);

  const save = (next: TicketView) => {
    setView(next);
    writeStored(ticketId, next);
  };

  return {
    open: shown.open,
    hideDone: shown.hideDone,
    setOpen: (open: string[]) => save({ ...shown, open }),
    setHideDone: (hideDone: boolean) => save({ ...shown, hideDone }),
  };
}
