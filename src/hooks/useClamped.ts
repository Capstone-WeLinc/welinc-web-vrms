import { useEffect, useState } from 'react';

/**
 * Spec 0024, AC-8 and AC-16: whether a `line-clamp` element is actually cut off, so "More" shows
 * only then. Measured by a ResizeObserver, so a wider screen or a font load updates it.
 */
export function useClamped<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [clamped, setClamped] = useState(false);
  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setClamped(node.scrollHeight > node.clientHeight + 1));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return { ref: setNode, clamped };
}
