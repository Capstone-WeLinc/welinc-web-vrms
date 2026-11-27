import { useState } from 'react';

/**
 * Spec 0027, AC-3 (amended 2026-11-28): every page with sub pages starts open on each load, and
 * only its chevron closes or opens it; nothing is remembered between loads. The state is the list
 * of parents you closed this visit.
 */
export function useNavOpen() {
  const [closed, setClosed] = useState<readonly string[]>([]);
  return {
    isOpen: (parent: string) => !closed.includes(parent),
    setOpen: (parent: string, next: boolean) =>
      setClosed((prev) => (next ? prev.filter((entry) => entry !== parent) : prev.includes(parent) ? prev : [...prev, parent])),
  };
}
