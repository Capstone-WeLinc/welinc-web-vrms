import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// The one pill shared by StatusBadge, PriorityBadge and RoleBadge. The label is
// passed in sentence case; CSS uppercases it.
export function BadgePill({ className, children }: { className: string; children: ReactNode }) {
  return <Badge className={cn('border-transparent tracking-wide uppercase', className)}>{children}</Badge>;
}
