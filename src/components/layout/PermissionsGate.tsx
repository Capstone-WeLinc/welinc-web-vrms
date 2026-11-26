import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GateScene } from '@/components/brand/scenes/GateScene';
import { LanyardScene } from '@/components/brand/scenes/LanyardScene';
import { ReaderScene } from '@/components/brand/scenes/ReaderScene';
import { SceneBand } from '@/components/brand/scenes/SceneBand';
import { useScenePick } from '@/components/brand/scenes/useScenePick';
import { BrandMark } from './BrandMark';
import { usePermissions } from '../../lib/permissions/usePermissions';
import { signOutFlow } from '../../lib/session/signOutFlow';

/**
 * Spec 0011, AC-23: no guarded item shows before the first permissions answer. Loading shows
 * the shell's shape, a failed first fetch offers Try again, and no keys at all means no VRMS access.
 * Spec 0028: a failed fetch shows the card reader or the lanyard rack (AC-13), no keys the gate
 * drawn wide (AC-12). The pick is made here, above the early returns, so a Try again that fails
 * again keeps the same picture (AC-16).
 */
export function PermissionsGate({ children }: { children: ReactNode }) {
  const { status, keys, error, retry } = usePermissions();
  const pick = useScenePick(2);
  const signOut = (
    <Button variant="outline" onClick={() => void signOutFlow({ ask: false })}>
      Sign out
    </Button>
  );

  if (status === 'loading') return <ShellSkeleton />;

  if (status === 'error') {
    return (
      <DoorBand
        pick={pick}
        title="Could not load your permissions"
        line={error ?? 'Check your connection, then try again.'}
        actions={
          <>
            <Button onClick={retry}>Try again</Button>
            {signOut}
          </>
        }
      />
    );
  }

  if (keys.length === 0) {
    return (
      <SceneBand
        lockup={<BrandMark tone="sidebar" />}
        scene={<GateScene wide />}
        title="No VRMS access"
        line="Your account has no permissions in VRMS. Ask an admin to give you a VRMS role."
        actions={signOut}
      />
    );
  }

  return children;
}

/**
 * Spec 0028, AC-13 and AC-14: the staff door when VRMS can't confirm who you are yet (permissions or
 * the sign in service didn't answer). `pick` comes from the caller's `useScenePick(2)`.
 */
export function DoorBand({ pick, title, line, actions }: { pick: number; title: string; line: string; actions: ReactNode }) {
  return (
    <SceneBand
      lockup={<BrandMark tone="sidebar" />}
      scene={pick === 0 ? <ReaderScene /> : <LanyardScene />}
      title={title}
      line={line}
      actions={actions}
    />
  );
}

/** The shell's outline while the keys load: sidebar, header and a few content blocks. */
export function ShellSkeleton() {
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
