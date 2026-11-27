import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LogoMark } from '../brand/LogoMark';

/**
 * Spec 0027, AC-10b (board `Shell20` footer option 5, as the portal built it): a darker strip with
 * the mark and "WeLinc Logistics", and the collapse button (`children`) at its right. Collapsed it
 * holds only the button; the phone sheet has no button.
 */
export function SidebarFooter({ collapsed = false, children }: { collapsed?: boolean; children?: ReactNode }) {
  return (
    <div
      className={cn(
        'flex min-h-14 shrink-0 items-center gap-2.5 border-t border-sidebar-line bg-black/15 px-3 py-2.5',
        collapsed ? 'justify-center px-2' : 'justify-between',
      )}
    >
      {!collapsed && (
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <span aria-hidden="true" className="flex size-6.5 shrink-0 items-center justify-center rounded-md bg-sidebar-count">
            <LogoMark className="h-2.5 text-highlight" />
          </span>
          <span className="truncate text-small font-semibold text-sidebar-idle">WeLinc Logistics</span>
        </span>
      )}
      {children}
    </div>
  );
}
