import {
  BarChart2,
  BookOpen,
  ClipboardList,
  HardHat,
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

const MECHANICS_ITEM: NavItem = { to: '/mechanics', label: 'Mechanics', icon: HardHat };

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
        // Spec 0022, AC-5: Admin keeps the Users page for this, so the item shows only without users.manage
        can('mechanics.view') && !can('users.manage') && MECHANICS_ITEM,
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
        can('users.manage') && { to: '/users', label: 'Users', icon: Users },
        can('audit.view') && { to: '/audit-logs', label: 'Audit logs', icon: ClipboardList },
        // Spec 0012, AC-21: with the key of any one section
        SETTINGS_KEYS.some(can) && { to: '/settings', label: 'Settings', icon: Settings },
      ]),
    },
  ];
  return sections.filter((section) => section.items.length > 0);
}

// Phone tab bar order: the daily screens first, profile last.
const MOBILE_TAB_ORDER = ['/dashboard', '/repairs', '/history', '/mechanics', '/knowledge-base', '/profile'];

/** design.md caps the tab bar at 5. */
const MAX_TABS = 5;

/** Spec 0022, AC-11: the first tab to leave a full bar; the user menu carries it instead. */
const MENU_FALLBACK = '/knowledge-base';

function navItemsOf(sections: NavSection[]) {
  return sections.flatMap((section) => section.items);
}

/** The phone tabs, in MOBILE_TAB_ORDER. Over 5, Knowledge base leaves first (spec 0022, AC-11). */
export function getMobileTabs(sections: NavSection[]): NavItem[] {
  const items = navItemsOf(sections);
  const tabs = MOBILE_TAB_ORDER.flatMap((to) => items.filter((item) => item.to === to));
  if (tabs.length <= MAX_TABS) return tabs;
  return tabs.filter((item) => item.to !== MENU_FALLBACK).slice(0, MAX_TABS);
}

/** Nav items the tab bar left out that the user menu can carry (only Knowledge base). */
function menuCarried(sections: NavSection[]): NavItem[] {
  const tabs = getMobileTabs(sections);
  return navItemsOf(sections).filter((item) => item.to === MENU_FALLBACK && !tabs.includes(item));
}

/**
 * design.md: a bottom tab bar on phones when every nav item fits in it or in the user menu, else
 * the sheet menu. Read from the nav, not the role, so a granted page is never left out of the
 * phone nav.
 */
export function usesTabBar(sections: NavSection[]): boolean {
  return getMobileTabs(sections).length + menuCarried(sections).length === navItemsOf(sections).length;
}

/** What the user menu adds on phones: nav items with no tab, while the tab bar is in use (spec 0022, AC-11). */
export function getPhoneMenuItems(sections: NavSection[]): NavItem[] {
  return usesTabBar(sections) ? menuCarried(sections) : [];
}

/**
 * Pages a person can open by URL whose nav item is hidden for them, so the breadcrumb still
 * names them (spec 0022, AC-5: Admin on /mechanics).
 */
const HIDDEN_TRAILS: { section: string; item: NavItem }[] = [{ section: 'Vehicle repairs', item: MECHANICS_ITEM }];

/** The section and item for the current path, for the header breadcrumb. */
export function getActiveNavTrail(pathname: string, sections: NavSection[]) {
  const activePath = getActiveNavPath(pathname, navItemsOf(sections));
  for (const section of sections) {
    const item = section.items.find((candidate) => candidate.to === activePath);
    if (item) return { section, item };
  }
  const hidden = HIDDEN_TRAILS.find((trail) => getActiveNavPath(pathname, [trail.item]));
  return hidden ? { section: { title: hidden.section, items: [] }, item: hidden.item } : undefined;
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
