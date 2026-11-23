import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalloutProps {
  /** 'warning' for something to check, 'destructive' for a cancellation or a failure, 'info' for a neutral note. */
  tone: 'warning' | 'destructive' | 'info';
  title?: string;
  children: ReactNode;
  className?: string;
}

const TONES = {
  warning: { icon: AlertTriangle, box: 'border-highlight bg-highlight/15 text-foreground', accent: '' },
  destructive: { icon: AlertCircle, box: 'border-destructive/30 bg-destructive/10 text-foreground', accent: 'text-destructive' },
  info: { icon: Info, box: 'border-primary/20 bg-primary/5 text-foreground', accent: 'text-primary' },
} as const;

/** A short note set apart from the content around it. The icon and title carry the meaning, not only the color. */
export function Callout({ tone, title, children, className }: CalloutProps) {
  const { icon: Icon, box, accent } = TONES[tone];
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border p-3 text-body', box, className)}>
      <Icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', accent)} />
      <div className="flex min-w-0 flex-col gap-1">
        {title && <p className={cn('font-medium [overflow-wrap:anywhere]', accent)}>{title}</p>}
        <div className="break-words">{children}</div>
      </div>
    </div>
  );
}
