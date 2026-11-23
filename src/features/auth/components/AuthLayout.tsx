import type { ReactNode } from 'react';
import { BrandMark } from '../../../components/layout/BrandMark';

/**
 * The frame for signing in: a navy brand panel beside the card from 1024px up,
 * the brand above the card on smaller screens. Mirrors the portal's layout, flat per design.md.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="hidden w-1/2 max-w-2xl flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <BrandMark />
        <div className="flex max-w-md flex-col gap-4">
          <div aria-hidden="true" className="h-1 w-12 rounded-full bg-sidebar-primary" />
          <p className="text-title font-semibold">Every repair, from intake to sign off.</p>
          <p className="text-group font-normal text-sidebar-foreground/70">
            Log tickets, assign mechanics and close repairs for the WeLinc fleet, in one place.
          </p>
        </div>
        <p className="text-caption text-sidebar-foreground/60">Part of the WeLinc fleet suite</p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="lg:hidden">
          <BrandMark tone="card" />
        </div>
        <div className="w-full max-w-md rounded-2xl border border-transparent bg-card p-6 shadow-card sm:p-8">{children}</div>
      </main>
    </div>
  );
}
