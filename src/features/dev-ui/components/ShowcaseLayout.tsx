import type { ReactNode } from 'react';

export function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-transparent bg-card p-4 shadow-card md:p-5">
      <h2 id={id} className="text-heading font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-body text-muted-foreground">{description}</p>
      <div className="mt-4 flex flex-col gap-6">{children}</div>
    </section>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-label text-muted-foreground">{label}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
