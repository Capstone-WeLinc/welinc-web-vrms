import { useState } from 'react';

const STORAGE_KEY = 'welinc_sidebar_collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Desktop sidebar collapsed state, remembered per browser. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Storage blocked (private mode): the choice just isn't remembered.
    }
  };

  return { collapsed, toggle };
}
