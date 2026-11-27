import {
  BarChart2,
  BookOpen,
  History,
  LayoutDashboard,
  ScrollText,
  Settings,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PermissionKey } from '../../lib/permissions/keys';
import { SETTINGS_KEYS } from '../../features/settings/lib/sections';

/** The sidebar's counts (spec 0027, AC-5): only the ones the viewer can see are present. */
export interface NavCounts {
  open?: number;
  signoff?: number;
  mine?: number;
  active?: number;
  sentBack?: number;
  suggestions?: number;
}

export interface NavItem {
  /** A path, or a path with a `view` preset (`/repairs?view=signoff`) for a sub page. */
  to: string;
  label: string;
  /** Shorter label for the phone tab bar. */
  shortLabel?: string;
  icon: LucideIcon;
  /** Sub pages (spec 0027, AC-2); a page with them opens and closes. */
  children?: NavItem[];
  /** Which of `/vrms/nav/counts` this sub page shows (AC-5). */
  countKey?: keyof NavCounts;
  /** The count, filled in from the counts; 0 or none shows nothing. */
  count?: number;
  /** The count waits on the viewer (AC-6, the VRMS hot list): gold. */
  hot?: boolean;
}

export interface NavSection {
  /** Empty for the unlabelled first section. */
  title: string;
  items: NavItem[];
}

/** What the nav needs beyond the keys (spec 0027): `inRoster` from `/vrms/permissions/me`. */
export interface NavContext {
  inRoster: boolean;
}

type NavEntry = NavItem | false;

const present = (entries: NavEntry[]) => entries.filter((entry): entry is NavItem => entry !== false);

/**
 * The nav for what the signed in user may do (spec 0027, AC-1 and AC-2; spec 0011, AC-22): each
 * page and sub page shows with the key its page needs, never by role (suite spec 0018). Profile
 * and New repair are not nav items: they live in the account menu and above the nav (AC-8, AC-10).
 */
export function getNavSections(can: (key: PermissionKey) => boolean, ctx: NavContext = { inRoster: false }): NavSection[] {
  const seesAll = can('ticket.view_all');
  const seesTickets = seesAll || can('ticket.view');
  const editsKnowledge = can('knowledge.edit');

  // AC-2: presets of the repair list; "On hold" joins with feature 31.
  const ticketPages: NavItem[] = seesAll
    ? present([
        { to: '/repairs?view=open', label: 'All open', icon: Wrench, countKey: 'open' },
        {
          to: '/repairs?view=signoff',
          label: 'Waiting for sign off',
          icon: Wrench,
          countKey: 'signoff',
          hot: can('ticket.verify'),
        },
        ctx.inRoster && { to: '/repairs?view=mine', label: 'Assigned to me', icon: Wrench, countKey: 'mine' },
      ])
    : [
        { to: '/repairs?view=active', label: 'In progress', icon: Wrench, countKey: 'active' },
        { to: '/repairs?view=sentBack', label: 'Sent back to me', icon: Wrench, countKey: 'sentBack', hot: true },
        { to: '/repairs?view=done', label: 'Done', icon: Wrench },
      ];

  // A single "Guides" page would be a group of one, so without knowledge.edit it is a plain link.
  const knowledgePages: NavItem[] | undefined = editsKnowledge
    ? [
        { to: '/knowledge-base', label: 'Guides', icon: BookOpen },
        { to: '/knowledge-base/suggestions', label: 'Suggestions', icon: BookOpen, countKey: 'suggestions', hot: true },
      ]
    : undefined;

  const sections: NavSection[] = [
    {
      title: '',
      items: [{ to: '/dashboard', label: seesAll ? 'Dashboard' : 'My dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Work',
      items: present([
        seesTickets && {
          to: '/repairs',
          label: seesAll ? 'Repair tickets' : 'My repairs',
          shortLabel: 'Repairs',
          icon: Wrench,
          children: ticketPages,
        },
        seesTickets && { to: '/history', label: 'Repair history', shortLabel: 'History', icon: History },
      ]),
    },
    {
      title: 'Insights',
      items: present([
        can('analytics.view') && { to: '/analytics', label: 'Analytics', icon: BarChart2 },
        can('knowledge.view') && {
          to: '/knowledge-base',
          label: 'Knowledge base',
          shortLabel: 'Guides',
          icon: BookOpen,
          children: knowledgePages,
        },
      ]),
    },
    {
      title: 'Admin',
      items: present([
        can('team.manage') && { to: '/users', label: 'Users', icon: Users },
        can('audit.view') && { to: '/audit-logs', label: 'Audit logs', icon: ScrollText },
        // Spec 0012, AC-21: with the key of any one section; one page, no dropdown (spec 0027, AC-1)
        SETTINGS_KEYS.some(can) && { to: '/settings', label: 'Settings', icon: Settings },
      ]),
    },
  ];
  return sections.filter((section) => section.items.length > 0);
}

/** The top level pages, sub pages left out. */
export function topLevelItems(sections: NavSection[]): NavItem[] {
  return sections.flatMap((section) => section.items);
}

/** The phone tab bar's last tab: it opens Profile (spec 0027, AC-11). */
export const ACCOUNT_TAB: NavItem = { to: '/profile', label: 'Account', icon: User };

/** design.md caps the tab bar at 5. */
export const TAB_BAR_MAX = 5;

/**
 * Spec 0027, AC-11 (suite spec 0016): the visible top level pages plus one Account tab; at most
 * 5 gives the tab bar, more gives the sheet. Read from the nav, not the role.
 */
export function usesTabBar(sections: NavSection[]): boolean {
  return topLevelItems(sections).length + 1 <= TAB_BAR_MAX;
}

export function getMobileTabs(sections: NavSection[]): NavItem[] {
  return [...topLevelItems(sections), ACCOUNT_TAB];
}

/** The path part of a nav `to`, and its `view` preset if it has one. */
function splitTo(to: string) {
  const [path, query = ''] = to.split('?');
  return { path, view: new URLSearchParams(query).get('view') };
}

function under(path: string, base: string) {
  return path === base || path.startsWith(`${base}/`);
}

export interface NavMatch {
  /** The top level page the route is in. */
  item: NavItem;
  /** The current sub page, when the route is one; the parent then shows as idle (AC-3). */
  child?: NavItem;
}

/**
 * The page for the current route (spec 0027, AC-3): the longest top level `to` the path is in,
 * then the sub page whose path (and `view`, when it has one) matches. On a ticket (`/repairs/:id`)
 * or the plain list no repair sub page matches, so Repair tickets itself is current.
 */
export function getNavMatch(pathname: string, search: string, sections: NavSection[]): NavMatch | undefined {
  const path = pathname === '/' ? '/dashboard' : pathname;
  const item = topLevelItems(sections)
    .filter((candidate) => under(path, candidate.to))
    .sort((a, b) => b.to.length - a.to.length)[0];
  if (!item) return undefined;

  const view = new URLSearchParams(search).get('view');
  const child = (item.children ?? [])
    .map((candidate) => ({ candidate, ...splitTo(candidate.to) }))
    .filter((entry) => (entry.view ? path === entry.path && view === entry.view : under(path, entry.path)))
    .sort((a, b) => b.path.length - a.path.length)[0]?.candidate;
  return { item, child };
}

/** The section and item for the current path, for the header breadcrumb. */
export function getActiveNavTrail(pathname: string, sections: NavSection[]) {
  const match = getNavMatch(pathname, '', sections);
  if (!match) return undefined;
  const section = sections.find((candidate) => candidate.items.includes(match.item));
  return section ? { section, item: match.item } : undefined;
}

/** The top level path for the current route (the phone tab bar). */
export function getActiveNavPath(pathname: string, items: NavItem[]): string | undefined {
  return getNavMatch(pathname, '', [{ title: '', items }])?.item.to;
}

/** AC-5: the bubble's text; above 99 reads "99+". */
export function countText(count: number) {
  return count > 99 ? '99+' : String(count);
}

/** What each count says to a screen reader (AC-14): "3 waiting for sign off". */
const COUNT_PHRASES: Record<keyof NavCounts, string> = {
  open: 'open',
  signoff: 'waiting for sign off',
  mine: 'assigned to you',
  active: 'in progress',
  sentBack: 'sent back to you',
  suggestions: 'suggestions to review',
};

export function countName(key: keyof NavCounts, count: number) {
  return `${count} ${COUNT_PHRASES[key]}`;
}

/** Fills each sub page's count from the counts answer (AC-5). */
export function withCounts(sections: NavSection[], counts: NavCounts): NavSection[] {
  const fill = (item: NavItem): NavItem => ({
    ...item,
    count: item.countKey ? counts[item.countKey] : item.count,
    children: item.children?.map(fill),
  });
  return sections.map((section) => ({ ...section, items: section.items.map(fill) }));
}

/** A closed parent's bubble: the sum of its hot counts, else nothing (AC-5). */
export function hotTotal(item: NavItem) {
  return (item.children ?? []).reduce((sum, child) => sum + (child.hot && child.count ? child.count : 0), 0);
}

/** Any count under this parent, hot or not, for the collapsed dot (AC-6). */
export function anyCount(item: NavItem) {
  return (item.children ?? []).some((child) => (child.count ?? 0) > 0);
}
