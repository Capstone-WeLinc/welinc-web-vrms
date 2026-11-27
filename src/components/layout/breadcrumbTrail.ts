import { useSyncExternalStore } from 'react';
import { getNavMatch, type NavSection } from './navItems';

export interface Crumb {
  label: string;
  /** Every crumb but the last links (spec 0027, AC-9). */
  to?: string;
}

/** Records named by their route alone, so no page has to set them. */
const ROUTE_TAILS: Record<string, string> = { '/repairs/new': 'New repair' };

/** Pages outside the nav that still get a crumb. */
const OTHER_PAGES: Record<string, string> = { '/profile': 'Profile' };

/**
 * The top bar's trail (spec 0027, AC-9): "VRMS", the current top level page by its nav label,
 * then the current record (a page's `BreadcrumbTail`, or a route's own name) or sub page. A page
 * crumb links to the page's own path, so Repair tickets and My repairs go to `/repairs` with no
 * `view`. The last crumb never links.
 */
export function breadcrumbTrail(pathname: string, search: string, sections: NavSection[], tail: string | null = null): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'VRMS', to: '/' }];
  const match = getNavMatch(pathname, search, sections);
  if (match) {
    crumbs.push({ label: match.item.label, to: match.item.to });
    const last = tail ?? ROUTE_TAILS[pathname] ?? match.child?.label;
    if (last && last !== match.item.label) crumbs.push({ label: last });
  } else if (OTHER_PAGES[pathname]) {
    crumbs.push({ label: OTHER_PAGES[pathname] });
  }
  return crumbs.map((crumb, index) => (index === crumbs.length - 1 ? { label: crumb.label } : crumb));
}

/** The tab title for a trail, the most specific part first: "Waiting for sign off · Repair tickets · VRMS". */
export function trailTitle(crumbs: readonly Crumb[]): string {
  return [...crumbs].reverse().map((crumb) => crumb.label).join(' · ');
}

// The record a page names in the trail (the ticket number), set while that page is mounted.
let tail: string | null = null;
const listeners = new Set<() => void>();

export function setBreadcrumbTail(next: string | null): void {
  if (tail === next) return;
  tail = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useBreadcrumbTail(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => tail,
    () => tail,
  );
}
