import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SettingsSection } from '../lib/sections';

/** The section list: beside the content on desktop, the whole page on phones (spec 0012, AC-21). */
export function SettingsSectionNav({ sections }: { sections: SettingsSection[] }) {
  return (
    <nav aria-label="Settings sections">
      <ul className="flex flex-col gap-1">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <li key={section.path}>
              <NavLink
                to={`/settings/${section.path}`}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                    isActive && 'border-border bg-card font-medium text-foreground',
                  )
                }
              >
                <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-foreground">{section.label}</span>
                  <span className="block text-xs text-muted-foreground md:hidden">{section.description}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground md:hidden" />
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
