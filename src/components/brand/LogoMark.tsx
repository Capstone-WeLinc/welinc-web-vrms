import { cn } from '@/lib/utils';

/**
 * The WeLinc mark alone (two slanted bars and the slanted L), copied from the portal's
 * `LogoMark` for the sidebar footer strip (spec 0027, AC-10b). Filled with `currentColor`.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 330 185" className={cn('h-6 w-auto', className)} fill="currentColor" aria-hidden="true">
      <polygon points="82,0 144,0 66,183 4,183" />
      <polygon points="177,0 240,0 162,183 100,183" />
      <polygon points="265,0 328,0 268,140 328,140 328,183 187,183" />
    </svg>
  );
}
