import { useEffect, useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useAuthStore } from '../../../store/authStore';
import { getCurrentUser, type CurrentUser } from '../../../lib/api/authApi';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage } from '../../../lib/api/errors';
import type { ManagedUser } from '../../../types';
import { AccountSummary } from '../components/AccountSummary';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { PersonalDetailsForm } from '../components/PersonalDetailsForm';
import { ProfileSkeleton } from '../components/ProfileSkeleton';
import { SignedInDevicesCard } from '../components/SignedInDevicesCard';
import { RecentActivityCard } from '../components/RecentActivityCard';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; user: CurrentUser };

export function ProfilePage() {
  const storeUser = useAuthStore((state) => state.user);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (!cancelled) setState({ status: 'ready', user });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: getApiErrorMessage(err, 'Your profile didn’t load.') });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const { showToast } = useToast();

  const setPending = (pendingEmail: string | null) =>
    setState((current) => (current.status === 'ready' ? { ...current, user: { ...current.user, pendingEmail } } : current));

  // Suite spec 0009, AC-27: the new email is live; read /auth/me again so the profile and the
  // shell show it (the store is memory only)
  const emailChanged = (changed: ManagedUser) => {
    showToast(`Your email is now ${changed.email}.`, 'success');
    const storeUser = useAuthStore.getState().user;
    if (storeUser) useAuthStore.setState({ user: { ...storeUser, email: changed.email } });
    getCurrentUser()
      .then((user) => setState({ status: 'ready', user }))
      .catch(() => setState((current) => (current.status === 'ready' ? { ...current, user: { ...current.user, ...changed, pendingEmail: null } } : current)));
  };

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  return (
    <div>
      <PageHeader title="My profile" subtitle="Your account details, password and signed in devices." icon={UserIcon} />

      {state.status === 'loading' && <ProfileSkeleton />}

      {state.status === 'error' && (
        <ErrorState title="We couldn’t load your profile" message={state.message} onRetry={retry} />
      )}

      {state.status === 'ready' && (
        <div className="flex flex-col gap-6">
          <AccountSummary
            name={storeUser?.name || state.user.name}
            email={storeUser?.email || state.user.email}
            roles={storeUser?.roles ?? state.user.roles}
          />
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <PersonalDetailsForm
              initialValues={{
                name: state.user.name ?? '',
                contact: state.user.contact ?? '',
              }}
              email={{ address: state.user.email, verified: state.user.emailVerified, pending: state.user.pendingEmail }}
              onPendingEmailChange={setPending}
              onEmailChanged={emailChanged}
            />
            <ChangePasswordForm />
          </div>
          <SignedInDevicesCard />
          <RecentActivityCard />
        </div>
      )}
    </div>
  );
}
