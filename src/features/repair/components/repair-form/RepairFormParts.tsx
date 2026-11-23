import { AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/** Stands in for a picker while its list loads the first time (AC-14). */
export function FieldSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body font-medium">{label}</p>
      <Skeleton className="h-11 w-full md:h-10" />
      <span className="sr-only">Loading {label.toLowerCase()}</span>
    </div>
  );
}

/** A list that failed to load, with a retry for that list only (AC-15). */
export function ListError({ message, retrying, onRetry }: { message: string; retrying: boolean; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-destructive">
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
