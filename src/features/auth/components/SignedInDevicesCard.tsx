import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '../../../components/shared/ErrorState';
import { confirm } from '../../../components/shared/confirm/confirm';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { endMySession, listMySessions, type SessionView } from '../../../lib/api/sessionsApi';
import { useSessionList } from '../hooks/useSessionList';
import { SessionRows, SessionRowsSkeleton } from './SessionRows';

/**
 * Signed in devices on the profile page (spec 0003, AC-34): every live session of yours across
 * WeLinc, with End on each one but this device. Ending one signs that device out of every system.
 */
export function SignedInDevicesCard() {
  const { showToast } = useToast();
  const { state, reload, remove } = useSessionList(listMySessions, 'me');
  const [endingSid, setEndingSid] = useState<string | null>(null);

  const end = async (session: SessionView) => {
    const ok = await confirm({
      title: `Sign out ${session.device}?`,
      description: 'That device will be signed out of every WeLinc system. Anything unsaved there is lost.',
      confirmText: 'End session',
      tone: 'destructive',
    });
    if (!ok) return;
    setEndingSid(session.sid);
    try {
      await endMySession(session.sid);
      remove([session.sid]);
      showToast(`${session.device} signed out.`);
    } catch (err) {
      showToast(`Couldn’t end that session: ${getApiErrorMessage(err, 'check your connection and try again').replace(/\.$/, '')}.`, 'error');
    } finally {
      setEndingSid(null);
    }
  };

  const others = state.status === 'ready' ? state.sessions.filter((s) => !s.current).length : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-group">Signed in devices</CardTitle>
        <CardDescription>Where your WeLinc account is signed in right now. End any device you don’t recognize, then change your password.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.status === 'loading' && <SessionRowsSkeleton />}
        {state.status === 'error' && <ErrorState title="We couldn’t load your devices" message={state.message} onRetry={reload} />}
        {state.status === 'ready' && (
          <div className="flex flex-col gap-3">
            <SessionRows sessions={state.sessions} onEnd={(s) => void end(s)} endingSid={endingSid} />
            {others === 0 && <p className="text-body text-muted-foreground">No other devices are signed in.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
