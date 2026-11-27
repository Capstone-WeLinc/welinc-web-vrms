import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { navOpenKey, readNavOpen, toggled, writeNavOpen } from './navOpen';

/**
 * Spec 0027, AC-3: a group opens by itself when the route moves into one of its sub pages, and
 * otherwise stays as you left it. `group` is the parent whose sub page is current, if any.
 * Paths that are no longer visible are simply never asked about, so they are ignored.
 */
export function useNavOpen(group: string | null) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const key = userId ? navOpenKey(userId) : null;
  const [state, setState] = useState<{ key: string | null; group: string | null; open: string[] }>(() => ({ key, group: null, open: readNavOpen(key) }));

  // Another person signed in on this tab: read their choice. Adjusted during render, not in an effect.
  let current = state;
  if (state.key !== key) {
    current = { key, group: null, open: readNavOpen(key) };
  }
  // The route moved into a group: open it.
  if (current.group !== group) {
    current = { ...current, group, open: group && !current.open.includes(group) ? [...current.open, group] : current.open };
  }
  if (current !== state) setState(current);

  const openList = current.open;
  useEffect(() => writeNavOpen(key, openList), [key, openList]);

  return {
    isOpen: (parent: string) => openList.includes(parent),
    setOpen: (parent: string, next: boolean) => setState((prev) => ({ ...prev, open: toggled(prev.open, parent, next) })),
  };
}
