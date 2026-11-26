import { useState } from 'react';

/**
 * VRMS spec 0028, AC-16: a screen with two scenes picks one when it appears and keeps it until it
 * unmounts, so a failed Try again never swaps the picture; the next visit picks again. Tests pass
 * their own `random` to fix the pick. Call it above any early return that remounts the scene.
 */
export function useScenePick(count: number, random: () => number = Math.random): number {
  const [pick] = useState(() => Math.min(count - 1, Math.floor(random() * count)));
  return pick;
}
