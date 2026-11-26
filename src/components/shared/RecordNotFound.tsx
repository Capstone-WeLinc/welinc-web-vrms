import type { ReactNode } from 'react';
import { NotFoundBayScene } from '@/components/brand/scenes/NotFoundBayScene';
import { NotFoundDrawerScene } from '@/components/brand/scenes/NotFoundDrawerScene';
import { ScenePanel } from '@/components/brand/scenes/ScenePanel';
import { useScenePick } from '@/components/brand/scenes/useScenePick';

interface RecordNotFoundProps {
  title: string;
  line?: string;
  /** The way back, usually one Button. */
  action: ReactNode;
  /** `pair`: the empty bay or the ticket drawer, picked on each visit; `drawer`: the drawer only. */
  scenes: 'pair' | 'drawer';
}

/**
 * VRMS spec 0028, AC-9: a record that isn't there. The repair ticket gets one of two scenes, picked
 * when the panel appears and kept until it goes (AC-16); a knowledge entry gets the drawer. The drawn
 * number is always RT-0999, never the one you asked for.
 */
export function RecordNotFound({ title, line, action, scenes }: RecordNotFoundProps) {
  const pick = useScenePick(scenes === 'pair' ? 2 : 1);
  const scene = scenes === 'pair' && pick === 0 ? <NotFoundBayScene /> : <NotFoundDrawerScene />;
  return <ScenePanel scene={scene} title={title} line={line} actions={action} />;
}
