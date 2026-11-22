import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getActiveNavTrail } from './navItems';
import { useNavSections } from './useNavSections';

interface PageHeaderProps {
  title: string;
  /** One context line under the title. */
  context?: ReactNode;
  /** Where the page sits; from the nav by default (its section, then its page when that isn't the title). */
  crumb?: string;
  /** The page's one primary action: on the right, full width at the bottom on phones. */
  action?: ReactNode;
}

/**
 * Suite spec 0016 (design.md, Layout and navigation: Page header): the breadcrumb in text-small
 * muted-foreground, the title in text-title, one context line, the primary action on the right.
 */
export function PageHeader({ title, context, crumb, action }: PageHeaderProps) {
  const { pathname } = useLocation();
  const trail = getActiveNavTrail(pathname, useNavSections());
  const page = trail && trail.item.label !== title ? trail.item : undefined;
  const section = crumb ?? trail?.section.title;

  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        {(section || page) && (
          <nav aria-label="Breadcrumb">
            <ol className="flex min-w-0 items-center gap-1 text-small text-muted-foreground">
              {section && <li className="truncate">{section}</li>}
              {section && page && (
                <li aria-hidden="true">
                  <ChevronRight className="size-3.5" />
                </li>
              )}
              {page && (
                <li className="truncate">
                  <Link to={page.to} className="rounded-sm hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    {page.label}
                  </Link>
                </li>
              )}
            </ol>
          </nav>
        )}
        <h1 className="text-title text-foreground">{title}</h1>
        {context && <p className="text-small text-muted-foreground">{context}</p>}
      </div>
      {action && <div className="shrink-0 *:w-full sm:*:w-auto">{action}</div>}
    </header>
  );
}
