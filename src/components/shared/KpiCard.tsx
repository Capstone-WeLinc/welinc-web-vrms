import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type KpiTone = 'default' | 'success' | 'destructive' | 'highlight';

interface KpiCardProps {
  caption: string;
  value: ReactNode;
  icon: LucideIcon;
  /** One line under the value, such as "4 more than last week". */
  context?: ReactNode;
  tone?: KpiTone;
}

const TONE_CLASSES: Record<KpiTone, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
  highlight: 'bg-highlight/10 text-highlight',
};

export function KpiCard({ caption, value, icon: Icon, context, tone = 'default' }: KpiCardProps) {
  return (
    <Card className="flex-row items-start justify-between gap-4 p-5">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">{caption}</p>
        <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
        {context && <p className="text-xs text-muted-foreground">{context}</p>}
      </div>
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', TONE_CLASSES[tone])}>
        <Icon aria-hidden="true" className="size-5" />
      </div>
    </Card>
  );
}
