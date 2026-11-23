import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// The one pill shared by StatusBadge and PriorityBadge (docs/context/vrms/design.md):
// sentence case like the text around it, a soft tint, and a hairline ring in the pill's own text
// colour so its edge stays crisp on white.
export function BadgePill({ className, children }: { className: string; children: ReactNode }) {
  return <Badge className={cn('border-transparent ring-1 ring-current/20 ring-inset', className)}>{children}</Badge>;
}
