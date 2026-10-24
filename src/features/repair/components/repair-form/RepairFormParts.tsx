import { useId, type ReactNode } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** One titled card of the repair form. */
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

/** Two short fields per row from 768px, one column on a phone (AC-2). */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 md:grid-cols-2 md:items-start">{children}</div>;
}

/** Stands in for a picker while its list loads the first time (AC-14). */
export function FieldSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{label}</p>
      <Skeleton className="h-11 w-full md:h-10" />
      <span className="sr-only">Loading {label.toLowerCase()}</span>
    </div>
  );
}

/** A list that failed to load, with a retry for that list only (AC-15). */
export function ListError({ message, retrying, onRetry }: { message: string; retrying: boolean; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-destructive">
      <span className="flex items-center gap-1.5">
        <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
        {message}
      </span>
      <Button type="button" variant="link" size="sm" className="h-auto min-h-11 px-0 md:min-h-0" loading={retrying} onClick={onRetry}>
        {!retrying && <RotateCw aria-hidden="true" />}
        Try again
      </Button>
    </div>
  );
}
