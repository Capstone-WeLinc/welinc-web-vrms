import { useSyncExternalStore } from 'react';

// A touch screen as the main pointer (phones, tablets). Unlike useIsMobile it ignores the window
// width, so a narrow desktop window stays a desktop: no camera button, drag and drop still works.
const TOUCH_QUERY = '(pointer: coarse)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(TOUCH_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

export function useIsTouchDevice() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => false,
  );
}
