import type { ReactNode } from 'react';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '../shared/EmptyState';
import { ErrorState } from '../shared/ErrorState';
import { usePermissions } from '../../lib/permissions/usePermissions';
import { useAuthStore } from '../../store/authStore';

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'http://localhost:8000';

/**
 * Spec 0011, AC-23: no guarded item shows before the first permissions answer. Loading shows
 * the shell's shape, a failed first fetch offers Retry, and no keys at all means no VRMS access.
 */
export function PermissionsGate({ children }: { children: ReactNode }) {
  const { status, keys, error, retry } = usePermissions();
  const logout = useAuthStore((state) => state.logout);

  if (status === 'loading') return <ShellSkeleton />;

  if (status === 'error') {
    return (
      <CenteredPage>
        <ErrorState
          title="Could not load your permissions"
          message={error ?? 'Check your connection, then try again.'}
          onRetry={retry}
        />
      </CenteredPage>
    );
  }

  if (keys.length === 0) {
    return (
      <CenteredPage>
        <EmptyState
          icon={ShieldOff}
          title="No VRMS access"
          description="Your account has no permissions in VRMS. Ask an admin to give you a VRMS role."
          action={
            <Button
              variant="outline"
              onClick={() => {
                logout();
                window.location.href = `${PORTAL_URL}/login?logout=true`;
              }}
            >
              Sign out
            </Button>
          }
        />
      </CenteredPage>
    );
  }

  return children;
}

function CenteredPage({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-background px-4">
      {children}
    </main>
  );
}

/** The shell's outline while the keys load: sidebar, header and a few content blocks. */
function ShellSkeleton() {
  return (
    <div className="min-h-dvh bg-background" aria-busy="true" aria-label="Loading">
      <div className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-3 border-r border-border bg-card p-4 md:flex">
        <Skeleton className="mb-4 h-8 w-32" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
      <div className="flex flex-col md:pl-64">
        <div className="flex h-16 items-center border-b border-border px-4 md:px-8">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex flex-col gap-4 px-4 py-6 md:px-8 xl:px-12">
          <Skeleton className="h-8 w-56" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
