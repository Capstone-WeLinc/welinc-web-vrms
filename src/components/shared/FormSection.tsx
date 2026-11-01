import { useId, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** One titled card of a full page form (the repair form, the knowledge entry editor). */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <Card role="group" aria-labelledby={headingId} className="gap-5">
      <CardHeader>
        <CardTitle>
          <h2 id={headingId} className="text-base font-semibold">
            {title}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">{children}</CardContent>
    </Card>
  );
}

/** Two short fields per row from 768px, one column on a phone (spec 0005, AC-2). */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-start">{children}</div>;
}
