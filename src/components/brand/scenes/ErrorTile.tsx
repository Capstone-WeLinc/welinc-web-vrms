import type { ReactNode } from 'react';
import type { TileSubject } from './tileSubjects';

/**
 * The drawings, light navy line art on a pale tile, 120 by 88. `devices`, `history`, `tickets`,
 * `trucks` and `parts` are drawn from the board `R39SmallMatched`, the other seven from `R44Tiles`
 * (activity A, charts B, settings B, people A, knowledge B, roles C, list A). Dashed grey is what
 * didn't load; one slow pulse marks the missing part.
 */
const DRAWINGS: Record<TileSubject, ReactNode> = {
  activity: (
    <>
      <path d="M36 22 V62" stroke="var(--scene-post)" strokeWidth="2.2" />
      <circle cx="36" cy="22" r="5" fill="var(--scene-ink)" />
      <circle cx="36" cy="40" r="5" fill="var(--scene-ink)" />
      <circle cx="36" cy="62" r="6" fill="var(--white)" stroke="var(--highlight)" strokeWidth="2.2" strokeDasharray="3 2.4" className="scene-slow" />
      <rect x="48" y="15" width="48" height="14" rx="3" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <path d="M54 22 h26" stroke="var(--livery-hub)" strokeWidth="2" strokeLinecap="round" />
      <rect x="48" y="33" width="48" height="14" rx="3" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <path d="M54 40 h20" stroke="var(--livery-hub)" strokeWidth="2" strokeLinecap="round" />
      <path d="M50 62 h40" stroke="var(--scene-post)" strokeWidth="2.4" strokeDasharray="3 3" strokeLinecap="round" />
    </>
  ),
  charts: (
    <>
      <rect x="20" y="16" width="80" height="56" rx="4" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <path d="M28 32 h64 M28 48 h64" stroke="var(--scene-grid)" strokeWidth="1.6" />
      <path d="M28 62 L40 50 L50 54 L60 40" stroke="var(--scene-ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="40" r="3.2" fill="var(--highlight)" stroke="var(--scene-ink)" strokeWidth="1.6" />
      <path d="M70 36 L80 42 L92 28" stroke="var(--scene-post)" strokeWidth="2.4" fill="none" strokeDasharray="3 3" strokeLinecap="round" />
      <path d="M62 30 l5 10" stroke="var(--scene-break)" strokeWidth="2.4" strokeLinecap="round" className="scene-slow" />
    </>
  ),
  devices: (
    <>
      <rect x="20" y="22" width="56" height="38" rx="3" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <path d="M14 64 h68 l-4 6 h-60z" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="82" y="30" width="22" height="40" rx="4" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <rect x="90" y="64" width="6" height="2" rx="1" fill="var(--scene-ink)" />
      <path d="M30 40 h14 M30 47 h22" stroke="var(--scene-post)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M62 41 l8 0 M80 41 l-4 0" stroke="var(--highlight)" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M71 36 l4 10" stroke="var(--scene-break)" strokeWidth="2.4" strokeLinecap="round" className="scene-slow" />
    </>
  ),
  history: (
    <>
      <path d="M60 22 C50 18 34 18 22 22 V70 C34 66 50 66 60 70 Z" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M60 22 C70 18 86 18 98 22 V70 C86 66 70 66 60 70 Z" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M30 32 h22 M30 40 h18 M30 48 h22" stroke="var(--livery-hub)" strokeWidth="2" strokeLinecap="round" />
      <path d="M68 32 h22 M68 40 h22 M68 48 h16" stroke="var(--scene-post)" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
      <circle cx="92" cy="62" r="11" fill="var(--scene-clock-face)" stroke="var(--livery-orange)" strokeWidth="2.2" />
      <path d="M92 56 v6 l4 3" stroke="var(--scene-clock-hand)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  ),
  knowledge: (
    <>
      <rect x="24" y="14" width="50" height="62" rx="3" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <path d="M32 26 h30 M32 34 h22" stroke="var(--livery-hub)" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 46 h20 M32 54 h16 M32 62 h24" stroke="var(--scene-post)" strokeWidth="2.4" strokeDasharray="3 3" strokeLinecap="round" />
      <path d="M83 61 l11 11" stroke="var(--scene-ink)" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="74" cy="52" r="13" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.4" />
      <circle cx="74" cy="52" r="9" fill="none" stroke="var(--highlight)" strokeWidth="1.6" opacity=".7" />
      <path d="M68 52 h12" stroke="var(--scene-post)" strokeWidth="2.4" strokeDasharray="3 3" strokeLinecap="round" className="scene-slow" />
    </>
  ),
  list: (
    <>
      <rect x="20" y="16" width="80" height="56" rx="4" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <path d="M20 20 a4 4 0 0 1 4 -4 h72 a4 4 0 0 1 4 4 v8 h-80z" fill="var(--scene-ink)" />
      <path d="M22 41 h76 M22 56 h76" stroke="var(--scene-grid)" strokeWidth="1.6" />
      <path d="M28 35 h18 M54 35 h30" stroke="var(--livery-hub)" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 49 h18 M54 49 h24" stroke="var(--scene-post)" strokeWidth="2.4" strokeDasharray="3 3" strokeLinecap="round" />
      <path d="M28 64 h18 M54 64 h30" stroke="var(--scene-post)" strokeWidth="2.4" strokeDasharray="3 3" strokeLinecap="round" className="scene-slow" />
    </>
  ),
  parts: (
    <>
      <rect x="30" y="34" width="34" height="34" rx="3" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <path d="M30 44 h34" stroke="var(--livery-orange)" strokeWidth="3" />
      <circle cx="82" cy="50" r="16" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <circle cx="82" cy="50" r="6" fill="var(--scene-tile)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <path d="M70 22 h24" stroke="var(--scene-post)" strokeWidth="2.4" strokeDasharray="3 3" strokeLinecap="round" />
    </>
  ),
  people: (
    <>
      <rect x="24" y="18" width="32" height="50" rx="4" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <rect x="24" y="18" width="32" height="8" rx="4" fill="var(--highlight)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <circle cx="40" cy="38" r="6" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <path d="M30 55 c2 -8 18 -8 20 0" stroke="var(--scene-ink)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M33 61 h14" stroke="var(--livery-hub)" strokeWidth="2" strokeLinecap="round" />
      <rect x="64" y="18" width="32" height="50" rx="4" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <rect x="64" y="18" width="32" height="8" rx="4" fill="var(--highlight)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <g className="scene-slow">
        <circle cx="80" cy="38" r="6" fill="none" stroke="var(--scene-post)" strokeWidth="2.2" strokeDasharray="3 2.6" />
        <path d="M70 55 c2 -8 18 -8 20 0" stroke="var(--scene-post)" strokeWidth="2.2" fill="none" strokeDasharray="3 3" strokeLinecap="round" />
      </g>
      <path d="M73 61 h14" stroke="var(--scene-post)" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
    </>
  ),
  roles: (
    <>
      <rect x="18" y="14" width="84" height="60" rx="4" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <circle cx="36" cy="24" r="2.2" fill="var(--scene-ink)" />
      <circle cx="60" cy="24" r="2.2" fill="var(--scene-ink)" />
      <circle cx="84" cy="24" r="2.2" fill="var(--scene-ink)" />
      <path d="M36 24 V31 M60 24 V31" stroke="var(--scene-ink)" strokeWidth="1.8" />
      <rect x="28" y="31" width="16" height="24" rx="3" fill="var(--highlight)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <path d="M32 46 h8" stroke="var(--scene-ink)" strokeWidth="2" strokeLinecap="round" />
      <rect x="52" y="31" width="16" height="24" rx="3" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <path d="M56 46 h8" stroke="var(--livery-hub)" strokeWidth="2" strokeLinecap="round" />
      <rect x="76" y="31" width="16" height="24" rx="3" fill="none" stroke="var(--scene-post)" strokeWidth="2.2" strokeDasharray="3 3" className="scene-slow" />
      <path d="M28 65 h64" stroke="var(--scene-grid)" strokeWidth="1.6" />
    </>
  ),
  settings: (
    <>
      <rect x="22" y="18" width="76" height="52" rx="5" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <path d="M32 31 h56 M32 44 h56 M32 57 h56" stroke="var(--scene-post)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M32 31 h16 M32 44 h36" stroke="var(--scene-ink)" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="45" y="26" width="8" height="10" rx="2" fill="var(--scene-ink)" />
      <rect x="65" y="39" width="8" height="10" rx="2" fill="var(--scene-ink)" />
      <circle cx="58" cy="57" r="5" fill="var(--white)" stroke="var(--highlight)" strokeWidth="2.2" strokeDasharray="3 2.4" className="scene-slow" />
    </>
  ),
  tickets: (
    <>
      <rect x="34" y="14" width="52" height="62" rx="4" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <rect x="34" y="14" width="52" height="12" rx="4" fill="var(--highlight)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <path d="M42 36 h30 M42 45 h36 M42 54 h24" stroke="var(--scene-post)" strokeWidth="2.4" strokeDasharray="3 3" strokeLinecap="round" />
      <circle cx="82" cy="66" r="10" fill="var(--white)" stroke="var(--highlight)" strokeWidth="2.2" strokeDasharray="3 2.4" className="scene-slow" />
    </>
  ),
  trucks: (
    <>
      <rect x="36" y="16" width="48" height="50" rx="7" fill="var(--white)" stroke="var(--scene-ink)" strokeWidth="2.2" />
      <rect x="42" y="22" width="36" height="16" rx="3" fill="var(--livery-glass)" />
      <rect x="36" y="46" width="48" height="4" fill="var(--livery-orange)" />
      <rect x="36" y="50" width="48" height="4" fill="var(--livery-blue)" />
      <circle cx="44" cy="59" r="3" fill="var(--livery-orange)" className="scene-blink" />
      <circle cx="76" cy="59" r="3" fill="var(--livery-orange)" className="scene-blink" style={{ animationDelay: '.55s' }} />
      <rect x="40" y="66" width="8" height="8" rx="2" fill="var(--scene-ink)" />
      <rect x="72" y="66" width="8" height="8" rx="2" fill="var(--scene-ink)" />
    </>
  ),
};

/**
 * AC-8: the picture above a small error in a card, section, tab, chart or dialog. Decoration only
 * (AC-18); the words beside it say what failed.
 */
export function ErrorTile({ subject }: { subject: TileSubject }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-scene={`tile-${subject}`}
      viewBox="0 0 120 88"
      width="120"
      height="88"
      className="block shrink-0"
    >
      <rect width="120" height="88" rx="14" fill="var(--scene-tile)" />
      {DRAWINGS[subject]}
    </svg>
  );
}
