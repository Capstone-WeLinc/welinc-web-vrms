import type { ReactNode } from 'react';

/** Every `data-scene` name a scene or tile can carry (VRMS spec 0028, AC-18). */
export type SceneName =
  | 'crash'
  | 'pole'
  | 'load'
  | 'not-found-bay'
  | 'not-found-drawer'
  | 'closed'
  | 'gate'
  | 'gate-wide'
  | 'reader'
  | 'lanyard'
  | 'road'
  | `tile-${string}`;

interface SceneSvgProps {
  name: SceneName;
  /**
   * `panel`: 720 by 220, scaled down whole on narrow screens, never cropped (AC-3).
   * `band`: 1440 by 260, cropped from both sides, so every band keeps its subject between x 420
   * and x 1020 (AC-4).
   */
  layout: 'panel' | 'band';
  children: ReactNode;
}

/**
 * The root of every drawn scene. Decoration only (AC-18): hidden from screen readers and never
 * focusable, and the words drawn on it are never the only place a fact is said.
 */
export function SceneSvg({ name, layout, children }: SceneSvgProps) {
  return layout === 'panel' ? (
    <svg aria-hidden="true" focusable="false" data-scene={name} viewBox="0 0 720 220" className="block h-auto w-full">
      {children}
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      focusable="false"
      data-scene={name}
      viewBox="0 0 1440 260"
      preserveAspectRatio="xMidYMax slice"
      className="block h-40 w-full sm:h-65"
    >
      {children}
    </svg>
  );
}
