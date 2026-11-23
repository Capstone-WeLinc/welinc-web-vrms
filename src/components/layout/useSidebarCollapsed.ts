import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

/** Suite spec 0016 (design.md, Layout and navigation: Collapse): saved per user. */
export function sidebarKey(userId: string) {
  return `welinc:sidebar:${userId}`;
}

function readCollapsed(key: string | null) {
  if (!key) return false;
  try {
    return localStorage.getItem(key) === 'collapsed';
  } catch {
    return false;
  }
}

/** Desktop sidebar collapsed state, remembered per user in this browser. */
export function useSidebarCollapsed() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const key = userId ? sidebarKey(userId) : null;
  const [state, setState] = useState(() => ({ key, collapsed: readCollapsed(key) }));
  // Another person signed in on this tab: read their choice.
  if (state.key !== key) setState({ key, collapsed: readCollapsed(key) });

  const setCollapsed = (collapsed: boolean) => {
    setState({ key, collapsed });
    if (!key) return;
    try {
      localStorage.setItem(key, collapsed ? 'collapsed' : 'expanded');
    } catch {
      // Storage blocked (private mode): the choice just isn't remembered.
    }
  };

  return { collapsed: state.collapsed, toggle: () => setCollapsed(!state.collapsed), setCollapsed };
}
