import { useState } from 'react';
import { confirm } from '../../../components/shared/confirm/confirm';
import type { RepairTicket } from '../../../types';

/** Which edit dialog is open on the detail page (spec 0019, AC-20). */
export type EditKind = 'details' | 'mechanics' | 'addIssue' | 'editIssue' | 'removeIssue' | 'checklist';

type Session = {
  kind: EditKind;
  /** The ticket as the dialog opened, so a background refetch never changes its form (AC-22). */
  ticket: RepairTicket;
  /** A new number per opening, used as the dialog's key so each opening starts fresh. */
  n: number;
  open: boolean;
  /** The issue an issue dialog is about. */
  issueId?: string;
  /** Extra text the dialog shows, such as what a removal takes with it. */
  detail?: string;
};

/**
 * One edit dialog at a time. The dialog keeps the ticket it opened with, and so its
 * `lastUpdatedAt`: a change by someone else then shows up as the 409 (AC-18, AC-22).
 */
export function useEditSession() {
  const [session, setSession] = useState<Session | null>(null);
  return {
    session,
    open: (kind: EditKind, ticket: RepairTicket, extra: { issueId?: string; detail?: string } = {}) =>
      setSession((s) => ({ kind, ticket, ...extra, n: (s?.n ?? 0) + 1, open: true })),
    /** Keeps the snapshot while the dialog animates out. */
    close: () => setSession((s) => (s ? { ...s, open: false } : s)),
  };
}

/**
 * The close handler every edit dialog shares (AC-20): nothing closes mid save, and unsaved
 * changes ask before they are thrown away.
 */
export function guardedClose(isDirty: boolean, isSubmitting: boolean, onOpenChange: (open: boolean) => void) {
  return async (next: boolean) => {
    if (next || isSubmitting) return;
    if (isDirty) {
      const discard = await confirm({
        title: 'Discard changes?',
        description: 'What you changed will be lost.',
        confirmText: 'Discard',
        cancelText: 'Keep editing',
        tone: 'destructive',
      });
      if (!discard) return;
    }
    onOpenChange(false);
  };
}
