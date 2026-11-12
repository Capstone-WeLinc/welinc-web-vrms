import {
  BarChart2,
  BookOpen,
  ClipboardList,
  History,
  LayoutDashboard,
  PlusCircle,
  Settings,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PermissionKey } from '../../lib/permissions/keys';
import { SETTINGS_KEYS } from '../../features/settings/lib/sections';

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

type NavEntry = NavItem | false;

const present = (entries: NavEntry[]) => entries.filter((entry): entry is NavItem => entry !== false);

/**
 * The nav for what the signed in user may do (spec 0011, AC-22, AC-22a): each item shows with the
 * key its page needs.
 */
export function getNavSections(can: (key: PermissionKey) => boolean): NavSection[] {
  const seesAll = can('ticket.view_all');
  const seesTickets = seesAll || can('ticket.view');
  const analytics = can('analytics.view');

  const sections: NavSection[] = [
    {
      title: 'General',
      items: [
        { to: '/dashboard', label: seesAll ? 'Dashboard' : 'My dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
        { to: '/profile', label: 'Profile', icon: User },
      ],
    },
    {
      title: 'Vehicle repairs',
      items: present([
        seesTickets && {
          to: '/repairs',
          label: seesAll ? 'Repair tickets' : 'My repairs',
          shortLabel: 'Repairs',
          icon: Wrench,
        },
        can('ticket.create') && { to: '/repairs/new', label: 'New repair', icon: PlusCircle },
        seesTickets && { to: '/history', label: 'Repair history', shortLabel: 'History', icon: History },
      ]),
    },
    {
      title: analytics ? 'Analytics & AI' : 'Knowledge base',
      items: present([
        analytics && { to: '/analytics', label: 'Analytics', icon: BarChart2 },
        can('knowledge.view') && { to: '/knowledge-base', label: 'Knowledge base', shortLabel: 'Guides', icon: BookOpen },
      ]),
    },
    {
      title: 'Administration',
      items: present([
        can('team.manage') && { to: '/users', label: 'Users', icon: Users },
        can('audit.view') && { to: '/audit-logs', label: 'Audit logs', icon: ClipboardList },
        // Spec 0012, AC-21: with the key of any one section
        SETTINGS_KEYS.some(can) && { to: '/settings', label: 'Settings', icon: Settings },
      ]),
    },
  ];
  return sections.filter((section) => section.items.length > 0);
}

// Phone tab bar order (design.md caps it at 5): the daily screens first, profile last.
const MOBILE_TAB_ORDER = ['/dashboard', '/repairs', '/history', '/knowledge-base', '/profile'];

export function getMobileTabs(sections: NavSection[]): NavItem[] {
  const items = sections.flatMap((section) => section.items);
  return MOBILE_TAB_ORDER.flatMap((to) => items.filter((item) => item.to === to));
}

/**
 * design.md: a bottom tab bar on phones when every nav item fits in it, else the sheet menu.
 * Read from the nav, not the role, so a granted page is never left out of the phone nav.
 */
export function usesTabBar(sections: NavSection[]): boolean {
  return getMobileTabs(sections).length === sections.flatMap((section) => section.items).length;
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
