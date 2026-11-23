import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

/** A form level error, such as a failed save, shown inline above the submit button. */
export function FormAlert({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-x-2 gap-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-body text-destructive"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 flex-1">{message}</p>
      {action}
    </div>
  );
}
