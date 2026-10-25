import { useEffect, useRef, type RefObject } from 'react';
import { useBlocker, type Location } from 'react-router-dom';
import { confirm } from '../components/shared/confirm/confirm';

interface LeaveGuardOptions {
  /** formState.isDirty, read in the page's render. */
  isDirty: boolean;
  /** Set right before the success navigate, so it is never blocked. */
  submittedRef: RefObject<boolean>;
  /** While a create runs, every in app navigation is held without asking (AC-21). */
  savingRef: RefObject<boolean>;
  /** Runs before the discard prompt, so two modals never stack (the summary dialog). */
  onBeforePrompt?: () => void;
  /** The discard prompt's text; the repair form's by default. */
  title?: string;
  description?: string;
}

/**
 * Asks before leaving a changed form (spec 0005, AC-23; spec 0007, AC-21): useBlocker for in app navigation,
 * beforeunload for a tab close or reload.
 */
export function useLeaveGuard({
  isDirty,
  submittedRef,
  savingRef,
  onBeforePrompt,
  title = 'Discard this ticket?',
  description = 'What you entered on this form will be lost.',
}: LeaveGuardOptions) {
  const dirtyRef = useRef(isDirty);
  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (submittedRef.current) return false;
    if (savingRef.current) return true;
    return dirtyRef.current && currentLocation.pathname !== nextLocation.pathname;
  });

  // One prompt per blocked navigation, even when StrictMode runs the effect twice.
  const handledRef = useRef<Location | null>(null);
  const beforePromptRef = useRef(onBeforePrompt);
  useEffect(() => {
    beforePromptRef.current = onBeforePrompt;
  }, [onBeforePrompt]);

  useEffect(() => {
    if (blocker.state !== 'blocked' || handledRef.current === blocker.location) return;
    handledRef.current = blocker.location;
    if (savingRef.current) {
      blocker.reset();
      return;
    }
    beforePromptRef.current?.();
    void confirm({
      title,
      description,
      confirmText: 'Discard',
      cancelText: 'Keep editing',
      tone: 'destructive',
    }).then((ok) => (ok ? blocker.proceed() : blocker.reset()));
  }, [blocker, savingRef, title, description]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (submittedRef.current) return;
      event.preventDefault();
      // Older browsers still need returnValue set to show the prompt.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty, submittedRef]);
}
