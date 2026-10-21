import {
  BarChart2,
  BookOpen,
  ClipboardList,
  History,
  LayoutDashboard,
  PlusCircle,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '../../types';

export interface NavItem {
  to: string;
  label: string;
  /** Shorter label for the phone tab bar. */
  shortLabel?: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const adminNavSections: NavSection[] = [
  {
    title: 'General',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/profile', label: 'Profile', icon: User },
    ],
  },
  {
    title: 'Vehicle repairs',
    items: [
      { to: '/repairs', label: 'Repair tickets', icon: Wrench },
      { to: '/repairs/new', label: 'New repair', icon: PlusCircle },
      { to: '/history', label: 'Repair history', icon: History },
    ],
  },
  {
    title: 'Analytics & AI',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart2 },
      { to: '/knowledge-base', label: 'Knowledge base', icon: BookOpen },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/users', label: 'Users', icon: Users },
      { to: '/audit-logs', label: 'Audit logs', icon: ClipboardList },
    ],
  },
];

const mechanicNavSections: NavSection[] = [
  {
    title: 'General',
    items: [
      { to: '/dashboard', label: 'My dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
      { to: '/profile', label: 'Profile', icon: User },
    ],
  },
  {
    title: 'Vehicle repairs',
    items: [
      { to: '/repairs', label: 'My repairs', shortLabel: 'Repairs', icon: Wrench },
      { to: '/history', label: 'Repair history', shortLabel: 'History', icon: History },
    ],
  },
  {
    title: 'Knowledge base',
    items: [{ to: '/knowledge-base', label: 'Knowledge base', shortLabel: 'Guides', icon: BookOpen }],
  },
];

export function getNavSections(role: UserRole | undefined): NavSection[] {
  return role === 'ADMIN' ? adminNavSections : mechanicNavSections;
}

// Phone tab bar order (design.md caps it at 5): the daily screens first, profile last.
const MOBILE_TAB_ORDER = ['/dashboard', '/repairs', '/history', '/knowledge-base', '/profile'];

export function getMobileTabs(role: UserRole | undefined): NavItem[] {
  const items = getNavSections(role).flatMap((section) => section.items);
  return MOBILE_TAB_ORDER.flatMap((to) => items.filter((item) => item.to === to));
}

/** The section and item for the current path, for the header breadcrumb. */
export function getActiveNavTrail(pathname: string, sections: NavSection[]) {
  const activePath = getActiveNavPath(pathname, sections.flatMap((section) => section.items));
  for (const section of sections) {
    const item = section.items.find((candidate) => candidate.to === activePath);
    if (item) return { section, item };
  }
  return undefined;
}

/**
 * The nav item for the current path: the longest `to` that the path starts with,
 * so /repairs/new picks "New repair" and /repairs/123 picks the repair list.
 */
export function getActiveNavPath(pathname: string, items: NavItem[]): string | undefined {
  const path = pathname === '/' ? '/dashboard' : pathname;
  return items
    .map((item) => item.to)
    .filter((to) => path === to || path.startsWith(`${to}/`))
    .sort((a, b) => b.length - a.length)[0];
}
