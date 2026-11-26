import { SceneSvg } from './SceneSvg';

/**
 * VRMS spec 0028, AC-7: a page that didn't load. The truck idling with its cargo box open and empty, the empty spots blinking in turn, exhaust puffing, the truck rocking slightly. Drawn from the board `R39LoadIdle`. Decoration only.
 */
export function LoadScene() {
  return (
    <SceneSvg name="load" layout="panel">
      <rect width="720" height="220" fill="var(--sidebar)" />
      <circle cx="251" cy="85" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="141" cy="57" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="493" cy="90" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="75" cy="87" r="1.3" fill="var(--white)" fillOpacity="0.25" />
      <circle cx="488" cy="43" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="247" cy="34" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="489" cy="79" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <path d="M0 142 L72 130 L158 146 L259 120 L360 140 L453 122 L561 144 L648 126 L720 138 V160 H0z" fill="var(--scene-hills)" />
      <rect x="0" y="160" width="720" height="60" fill="var(--scene-road)" />
      <line x1="0" y1="162" x2="720" y2="162" stroke="var(--white)" strokeWidth="2" strokeOpacity="0.22" />
      <line x1="0" y1="196" x2="720" y2="196" stroke="var(--white)" strokeWidth="3" strokeDasharray="34 26" strokeOpacity="0.25" />
      <ellipse cx="353.6" cy="180" rx="107.2" ry="3.5" fill="var(--scene-black)" fillOpacity="0.4" />
      <g className="scene-bob">
        <g transform="translate(254.4 98.4) scale(1.6)">
          <rect x="0" y="0" width="92" height="38" rx="2.5" fill="var(--livery-body)" stroke="var(--livery-edge)" strokeWidth="1" />
          <path d="M0.5 25 C28 19 60 31 91.5 15 V22 C60 34 28 24 0.5 30 Z" fill="var(--livery-orange)" />
          <path d="M0.5 30 C28 24 60 34 91.5 22 V36 a2 2 0 0 1 -2 2 H2.5 a2 2 0 0 1 -2 -2 Z" fill="var(--livery-blue)" />
          <g transform="translate(6 6) scale(0.0541)" fill="var(--highlight)">
            <polygon points="82,0 144,0 66,183 4,183" />
            <polygon points="177,0 240,0 162,183 100,183" />
            <polygon points="265,0 328,0 268,140 328,140 328,183 187,183" />
          </g>
          <text x="26" y="15" fontSize="11" fontWeight="800" fontStyle="italic" fill="var(--sidebar)">WeLinc</text>
          <path d="M95 10h16l13 13v15H95z" fill="var(--livery-cab)" stroke="var(--livery-cab-edge)" strokeWidth="1" />
          <path d="M99 14h10l8 8h-18z" fill="var(--livery-glass)" />
          <rect x="95" y="30" width="29" height="3" fill="var(--livery-cab-edge)" />
          <rect x="86" y="36" width="38" height="5" fill="var(--livery-bumper)" />
          <rect x="-4" y="27" width="4" height="13" rx="1" fill="var(--livery-step)" />
          <circle cx="16" cy="44" r="7" fill="var(--livery-tyre)" />
          <circle cx="16" cy="44" r="3" fill="var(--livery-hub)" />
          <circle cx="34" cy="44" r="7" fill="var(--livery-tyre)" />
          <circle cx="34" cy="44" r="3" fill="var(--livery-hub)" />
          <circle cx="110" cy="44" r="7" fill="var(--livery-tyre)" />
          <circle cx="110" cy="44" r="3" fill="var(--livery-hub)" />
          <rect x="3" y="3" width="86" height="32" rx="1.5" fill="var(--scene-garage-door)" />
          <rect x="8" y="19" width="18" height="13" rx="1" fill="none" stroke="var(--highlight)" strokeWidth="1.1" strokeDasharray="3 2" className="scene-seq" />
          <rect x="30" y="19" width="18" height="13" rx="1" fill="none" stroke="var(--highlight)" strokeWidth="1.1" strokeDasharray="3 2" className="scene-seq" style={{ animationDelay: '.6s' }} />
          <rect x="52" y="19" width="18" height="13" rx="1" fill="none" stroke="var(--highlight)" strokeWidth="1.1" strokeDasharray="3 2" className="scene-seq" style={{ animationDelay: '1.2s' }} />
          <rect x="8" y="5" width="18" height="12" rx="1" fill="none" stroke="var(--highlight)" strokeWidth="1.1" strokeDasharray="3 2" className="scene-seq" style={{ animationDelay: '1.8s' }} />
          <rect x="-11" y="1" width="11" height="36" fill="var(--scene-paper)" stroke="var(--livery-edge)" strokeWidth="1" />
          <rect x="0.5" y="0.5" width="3" height="37" fill="var(--livery-bumper)" />
          <rect x="124" y="24" width="4" height="6" rx="1" fill="var(--livery-orange)" />
          <rect x="-6" y="26" width="4" height="6" rx="1" fill="var(--livery-orange)" />
          <rect x="90" y="1" width="2.6" height="10" rx="1" fill="var(--livery-step)" />
        </g>
      </g>
      <circle cx="400.5" cy="98.4" r="3.2" fill="var(--scene-haze)" fillOpacity="0.6" className="scene-exhaust" />
      <circle cx="400.5" cy="98.4" r="3.2" fill="var(--scene-haze)" fillOpacity="0.6" className="scene-exhaust" style={{ animationDelay: '.6s' }} />
      <circle cx="400.5" cy="98.4" r="3.2" fill="var(--scene-haze)" fillOpacity="0.6" className="scene-exhaust" style={{ animationDelay: '1.2s' }} />
    </SceneSvg>
  );
}
