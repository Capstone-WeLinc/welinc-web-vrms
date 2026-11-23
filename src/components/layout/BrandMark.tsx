import logo from '../../assets/brand-logo.jpg';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  /** Logo only, for the collapsed sidebar. */
  compact?: boolean;
  /** `sidebar` sits on deep navy, `card` on the white header. */
  tone?: 'sidebar' | 'card';
}

export function BrandMark({ compact = false, tone = 'sidebar' }: BrandMarkProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img src={logo} alt={compact ? 'WeLinc VRMS' : ''} className="size-9 shrink-0 rounded-full object-cover" />
      {!compact && (
        <div className="min-w-0">
          <p
            className={cn(
              'truncate text-group font-semibold',
              tone === 'sidebar' ? 'text-sidebar-foreground' : 'text-foreground',
            )}
          >
            WeLinc VRMS
          </p>
          <p
            className={cn(
              'truncate text-caption',
              tone === 'sidebar' ? 'text-sidebar-idle' : 'text-muted-foreground',
            )}
          >
            Vehicle repair system
          </p>
        </div>
      )}
    </div>
  );
}
