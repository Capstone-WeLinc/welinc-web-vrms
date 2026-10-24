import type { RefObject } from 'react';
import { USERS_SEARCH_ID } from './userFilters';

// Spec 0006, AC-9: the menu item that started an action unmounts, so focus goes to the row's
// actions trigger when the row is still on the page, otherwise to the search box.

function rowFocusTarget(userId: string) {
  return (
    document.querySelector<HTMLElement>(`[data-row-actions="${CSS.escape(userId)}"]`) ??
    document.getElementById(USERS_SEARCH_ID)
  );
}

/** Focuses the target after the list has rendered the action's result. */
export function returnFocusToRow(userId: string) {
  window.requestAnimationFrame(() => rowFocusTarget(userId)?.focus());
}

/** A ref that finds the target when read, for ResponsiveDialog's finalFocusRef, which reads it on close. */
export function rowFocusRef(userId: string): RefObject<HTMLElement | null> {
  return {
    get current() {
      return rowFocusTarget(userId);
    },
  };
}
