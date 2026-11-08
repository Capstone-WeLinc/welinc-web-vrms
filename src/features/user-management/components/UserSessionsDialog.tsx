import { useState, type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '../../../components/shared/ErrorState';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { confirm } from '../../../components/shared/confirm/confirm';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { endAllUserSessions, listUserSessions } from '../../../lib/api/sessionsApi';
import type { ManagedUser } from '../../../types';
import { SessionRows, SessionRowsSkeleton } from '../../auth/components/SessionRows';
import { useSessionList } from '../../auth/hooks/useSessionList';

interface UserSessionsDialogProps {
  user: ManagedUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * A user's signed in devices for an admin, with End all sessions (spec 0003, AC-35): after a lost
 * phone, or when someone leaves. Each device is signed out of every WeLinc system.
 */
export function UserSessionsDialog({ user, open, onOpenChange, finalFocusRef }: UserSessionsDialogProps) {
  const { showToast } = useToast();
  const userId = user?.id ?? '';
  const { state, reload, remove } = useSessionList(() => listUserSessions(userId), userId, open && userId !== '');
  const [ending, setEnding] = useState(false);

  const endAll = async () => {
    if (!user || state.status !== 'ready') return;
    const count = state.sessions.length;
    const ok = await confirm({
      title: `Sign ${user.name} out everywhere?`,
      description: `${count === 1 ? 'Their 1 device' : `All ${count} devices`} will be signed out of every WeLinc system. They can sign in again with their password. If the password may be known to someone else, send a reset code too.`,
      confirmText: 'End all sessions',
      tone: 'destructive',
    });
    if (!ok) return;
    setEnding(true);
    try {
      const ended = await endAllUserSessions(user.id);
      remove(state.sessions.map((s) => s.sid));
      showToast(ended === 1 ? `${user.name} signed out of 1 device.` : `${user.name} signed out of ${ended} devices.`);
    } catch (err) {
      showToast(`Couldn’t end ${user.name}’s sessions: ${getApiErrorMessage(err, 'check your connection and try again').replace(/\.$/, '')}.`, 'error');
    } finally {
      setEnding(false);
    }
  };

  const count = state.status === 'ready' ? state.sessions.length : 0;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      finalFocusRef={finalFocusRef}
      title={user ? `${user.name}’s sessions` : 'Sessions'}
      description="Devices where this account is signed in right now, on any WeLinc system."
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="touch"
            className="md:h-10 md:text-sm"
            loading={ending}
            disabled={count === 0}
            onClick={() => void endAll()}
          >
            End all sessions
          </Button>
        </>
      }
    >
      {state.status === 'loading' && <SessionRowsSkeleton />}
      {state.status === 'error' && <ErrorState title="We couldn’t load the sessions" message={state.message} onRetry={reload} />}
      {state.status === 'ready' &&
        (count === 0 ? (
          <p className="text-sm text-muted-foreground">Not signed in anywhere right now.</p>
        ) : (
          <SessionRows sessions={state.sessions} />
        ))}
    </ResponsiveDialog>
  );
}
