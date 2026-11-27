import { Fragment, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { breadcrumbTrail, setBreadcrumbTail, trailTitle, useBreadcrumbTail } from './breadcrumbTrail';
import { useNavSections } from './useNavSections';

/**
 * The top bar's breadcrumb (spec 0027, AC-9; the portal's Suite management trail): muted links,
 * the last crumb in foreground with `aria-current`. Below 640px only the last crumb shows.
 */
export function Breadcrumbs() {
  const { pathname, search } = useLocation();
  const crumbs = breadcrumbTrail(pathname, search, useNavSections(), useBreadcrumbTail());
  const title = trailTitle(crumbs);
  // The tab names where you are, from the same trail ("People · Admin" style, most specific first)
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
      <ol className="flex items-center gap-1.5 text-small">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={`${index}-${crumb.label}`}>
              {index > 0 && (
                <li aria-hidden="true" className="text-muted-foreground max-sm:hidden">
                  <ChevronRight className="size-4" />
                </li>
              )}
              {last ? (
                <li aria-current="page" className="min-w-0 truncate font-medium text-foreground">
                  {crumb.label}
                </li>
              ) : (
                <li className="shrink-0 text-muted-foreground max-sm:hidden">
                  <Link
                    to={crumb.to ?? '/'}
                    className="rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {crumb.label}
                  </Link>
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/** A page names its record in the trail (the ticket number) while it is mounted (spec 0027, AC-9). */
export function BreadcrumbTail({ label }: { label: string }) {
  useEffect(() => {
    setBreadcrumbTail(label);
    return () => setBreadcrumbTail(null);
  }, [label]);
  return null;
}
