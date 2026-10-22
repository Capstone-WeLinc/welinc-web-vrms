import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalloutProps {
  /** 'warning' for something to check, 'destructive' for a cancellation or a failure. */
  tone: 'warning' | 'destructive';
  title?: string;
  children: ReactNode;
  className?: string;
}

/** A short note set apart from the content around it. The icon and title carry the meaning, not only the color. */
export function Callout({ tone, title, children, className }: CalloutProps) {
  const Icon = tone === 'warning' ? AlertTriangle : AlertCircle;
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border p-3 text-sm',
        tone === 'warning' ? 'border-highlight bg-highlight/15 text-foreground' : 'border-destructive/30 bg-destructive/10 text-foreground',
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', tone === 'destructive' && 'text-destructive')} />
      <div className="flex min-w-0 flex-col gap-1">
        {title && <p className={cn('font-medium', tone === 'destructive' && 'text-destructive')}>{title}</p>}
        <div className="break-words">{children}</div>
      </div>
    </div>
  );
}
