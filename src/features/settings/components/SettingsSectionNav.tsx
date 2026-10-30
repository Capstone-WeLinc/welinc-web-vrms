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
                    'group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive && 'bg-primary/8 hover:bg-primary/8',
                  )
                }
              >
                <Icon aria-hidden="true" className="size-4 shrink-0 self-start mt-0.5 text-muted-foreground group-aria-[current=page]:text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-foreground group-aria-[current=page]:font-semibold group-aria-[current=page]:text-primary">{section.label}</span>
                  <span className="block text-xs text-pretty text-muted-foreground">{section.description}</span>
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
