import { useEffect, useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useAuthStore } from '../../../store/authStore';
import { getCurrentUser } from '../../../lib/api/authApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import type { ManagedUser } from '../../../types';
import { AccountSummary } from '../components/AccountSummary';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { PersonalDetailsForm } from '../components/PersonalDetailsForm';
import { ProfileSkeleton } from '../components/ProfileSkeleton';
import { SignedInDevicesCard } from '../components/SignedInDevicesCard';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; user: ManagedUser };

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
                email: state.user.email ?? '',
                contact: state.user.contact ?? '',
              }}
            />
            <ChangePasswordForm />
          </div>
          <SignedInDevicesCard />
        </div>
      )}
    </div>
  );
}
