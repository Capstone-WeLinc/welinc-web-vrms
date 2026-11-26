import { useId } from 'react';
import { SceneSvg } from './SceneSvg';

/**
 * VRMS spec 0028, AC-13 and AC-14 (one of two). A blank pass lands flat on the card reader, the contact arcs pulse, and the light blinks amber, never green. Drawn from the board `R43PermSwitch`. Decoration only.
 */
export function ReaderScene() {
  const id = useId();
  return (
    <SceneSvg name="reader" layout="band">
      <defs>
        <pattern id={`${id}haz`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="12" fill="var(--highlight)" />
          <rect x="6" width="6" height="12" fill="var(--sidebar)" />
        </pattern>
        <radialGradient id={`${id}pool`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="var(--scene-lamp-light)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--scene-lamp-light)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}warm`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="var(--scene-glow-amber)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--scene-glow-amber)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}redg`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="var(--scene-break)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--scene-break)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="260" fill="var(--scene-night)" />
      <rect x="0" y="0" width="1440" height="8" fill="var(--scene-wall)" />
      <rect x="0" y="200" width="1440" height="60" fill="var(--scene-road)" />
      <line x1="0" y1="202" x2="1440" y2="202" stroke="var(--white)" strokeWidth="2" strokeOpacity="0.18" />
      <circle cx="1180" cy="70" r="26" fill="var(--livery-body)" stroke="var(--scene-garage)" strokeWidth="4" />
      <path d="M1180 70 V54" stroke="var(--sidebar)" strokeWidth="3" strokeLinecap="round" />
      <path d="M1180 70 L1192 76" stroke="var(--scene-break)" strokeWidth="2" strokeLinecap="round" className="scene-tick" style={{ transformOrigin: '1180px 70px' }} />
      <rect x="300" y="160" width="180" height="8" rx="2" fill="var(--scene-garage)" />
      <rect x="316" y="168" width="8" height="32" fill="var(--scene-garage)" />
      <rect x="456" y="168" width="8" height="32" fill="var(--scene-garage)" />
      <rect x="620" y="40" width="160" height="160" fill="var(--scene-garage)" />
      <rect x="632" y="50" width="136" height="150" fill="var(--sidebar)" />
      <rect x="670" y="68" width="60" height="44" rx="2" fill="var(--scene-wall-light)" />
      <rect x="670" y="68" width="60" height="44" rx="2" fill="none" stroke="var(--scene-lamp-off)" strokeWidth="2" />
      <rect x="680" y="50" width="40" height="6" fill="var(--scene-slate)" />
      <rect x="646" y="140" width="108" height="7" rx="3" fill="var(--scene-post)" />
      <rect x="636" y="80" width="4" height="16" fill="var(--scene-lamp-off)" />
      <rect x="636" y="160" width="4" height="16" fill="var(--scene-lamp-off)" />
      <polygon points="690,30 710,30 760,200 640,200" fill="var(--scene-beam-warm)" fillOpacity="0.05" />
      <rect x="686" y="24" width="28" height="8" rx="3" fill="var(--scene-post)" />
      <rect x="636" y="200" width="128" height="5" fill="var(--scene-hut)" />
      <ellipse cx="700" cy="203" rx="90" ry="6" fill={`url(#${id}pool)`} />
      <circle cx="714" cy="53" r="1.6" fill="var(--highlight)" className="scene-blink" />
      <rect x="820" y="98" width="38" height="58" rx="7" fill="var(--scene-post)" />
      <rect x="826" y="104" width="26" height="28" rx="3" fill="var(--sidebar)" />
      <circle cx="839" cy="118" r="7" fill="none" stroke="var(--scene-lamp-off)" strokeWidth="2.4" />
      <circle cx="839" cy="118" r="7" fill="none" stroke="var(--highlight)" strokeWidth="2.4" strokeDasharray="11 33" strokeLinecap="round" className="scene-spin" />
      <rect x="828" y="140" width="22" height="4" rx="2" fill="var(--highlight)" className="scene-reader" />
      <path d="M839 156 V200" stroke="var(--livery-bumper)" strokeWidth="2" />
      <g className="scene-tap">
        <path d="M839 140 C846 176 880 206 930 262" stroke="var(--livery-blue)" strokeWidth="3" fill="none" />
        <rect x="823" y="100" width="32" height="42" rx="3" fill="var(--white)" stroke="var(--scene-post)" strokeWidth="1.2" />
        <rect x="823" y="100" width="32" height="8" rx="3" fill="var(--highlight)" />
        <rect x="828" y="113" width="12" height="15" rx="1.5" fill="none" stroke="var(--livery-step)" strokeWidth="1.2" strokeDasharray="2.5 2" className="scene-breathe" />
        <rect x="843" y="115" width="8" height="3" rx="1.5" fill="var(--scene-paper-line)" className="scene-breathe" style={{ animationDelay: '.25s' }} />
        <rect x="843" y="121" width="6" height="3" rx="1.5" fill="var(--scene-paper-line)" className="scene-breathe" style={{ animationDelay: '.5s' }} />
        <rect x="828" y="133" width="22" height="4" rx="2" fill="none" stroke="var(--highlight)" strokeWidth="1" strokeDasharray="2 1.5" />
      </g>
      <path d="M864 108 a14 14 0 0 1 0 22" fill="none" stroke="var(--highlight)" strokeWidth="2" strokeLinecap="round" className="scene-nfc" />
      <path d="M870 102 a22 22 0 0 1 0 34" fill="none" stroke="var(--highlight)" strokeWidth="2" strokeLinecap="round" className="scene-nfc" style={{ animationDelay: '.15s' }} />
    </SceneSvg>
  );
}
