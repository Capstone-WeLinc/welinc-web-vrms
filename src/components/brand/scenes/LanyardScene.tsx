import { SceneSvg } from './SceneSvg';

/**
 * VRMS spec 0028, AC-13 and AC-14 (one of two). The lanyard rack by the door, every pass printed except yours, which swings blank on its hook. Drawn from the board `R43PermSwitch`. Decoration only.
 */
export function LanyardScene() {
  return (
    <SceneSvg name="lanyard" layout="band">
      <rect width="1440" height="260" fill="var(--scene-night)" />
      <rect x="0" y="0" width="1440" height="8" fill="var(--scene-wall)" />
      <rect x="0" y="200" width="1440" height="60" fill="var(--scene-road)" />
      <line x1="0" y1="202" x2="1440" y2="202" stroke="var(--white)" strokeWidth="2" strokeOpacity="0.18" />
      <circle cx="1180" cy="70" r="26" fill="var(--livery-body)" stroke="var(--scene-garage)" strokeWidth="4" />
      <path d="M1180 70 V54" stroke="var(--sidebar)" strokeWidth="3" strokeLinecap="round" />
      <path d="M1180 70 L1192 76" stroke="var(--scene-break)" strokeWidth="2" strokeLinecap="round" className="scene-tick" style={{ transformOrigin: '1180px 70px' }} />
      <polygon points="680,8 700,8 760,200 620,200" fill="var(--scene-beam-warm)" fillOpacity="0.07" />
      <rect x="676" y="6" width="28" height="6" rx="3" fill="var(--scene-post)" />
      <rect x="480" y="50" width="480" height="14" rx="3" fill="var(--scene-garage)" />
      <path d="M530 62 v6 a4 4 0 0 0 8 0" stroke="var(--livery-hub)" strokeWidth="2.4" fill="none" transform="translate(-4 0)" />
      <path d="M610 62 v6 a4 4 0 0 0 8 0" stroke="var(--livery-hub)" strokeWidth="2.4" fill="none" transform="translate(-4 0)" />
      <path d="M690 62 v6 a4 4 0 0 0 8 0" stroke="var(--livery-hub)" strokeWidth="2.4" fill="none" transform="translate(-4 0)" />
      <path d="M770 62 v6 a4 4 0 0 0 8 0" stroke="var(--livery-hub)" strokeWidth="2.4" fill="none" transform="translate(-4 0)" />
      <path d="M850 62 v6 a4 4 0 0 0 8 0" stroke="var(--livery-hub)" strokeWidth="2.4" fill="none" transform="translate(-4 0)" />
      <path d="M930 62 v6 a4 4 0 0 0 8 0" stroke="var(--livery-hub)" strokeWidth="2.4" fill="none" transform="translate(-4 0)" />
      <g>
        <path d="M530 66 L520 112 M530 66 L540 112" stroke="var(--livery-blue)" strokeWidth="2.2" fill="none" />
        <rect x="512" y="110" width="36" height="50" rx="3" fill="var(--white)" stroke="var(--scene-post)" />
        <rect x="512" y="110" width="36" height="7" rx="3" fill="var(--highlight)" />
        <rect x="520" y="122" width="20" height="16" rx="2" fill="var(--livery-step)" />
        <path d="M518 145 h24 M518 152 h16" stroke="var(--livery-hub)" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <g>
        <path d="M610 66 L600 112 M610 66 L620 112" stroke="var(--livery-blue)" strokeWidth="2.2" fill="none" />
        <rect x="592" y="110" width="36" height="50" rx="3" fill="var(--white)" stroke="var(--scene-post)" />
        <rect x="592" y="110" width="36" height="7" rx="3" fill="var(--highlight)" />
        <rect x="600" y="122" width="20" height="16" rx="2" fill="var(--livery-step)" />
        <path d="M598 145 h24 M598 152 h16" stroke="var(--livery-hub)" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <g className="scene-swing-key">
        <path d="M690 66 L680 112 M690 66 L700 112" stroke="var(--livery-blue)" strokeWidth="2.2" fill="none" />
        <rect x="672" y="110" width="36" height="50" rx="3" fill="var(--white)" stroke="var(--highlight)" strokeWidth="1.6" strokeDasharray="3 2" />
        <rect x="672" y="110" width="36" height="7" rx="3" fill="var(--highlight)" />
        <rect x="680" y="122" width="20" height="16" rx="2" fill="none" stroke="var(--livery-step)" strokeWidth="1.4" strokeDasharray="3 2" className="scene-breathe" />
        <path d="M678 145 h24" stroke="var(--scene-paper-line)" strokeWidth="2.4" strokeLinecap="round" className="scene-breathe" style={{ animationDelay: '.25s' }} />
        <path d="M678 152 h16" stroke="var(--scene-paper-line)" strokeWidth="2.4" strokeLinecap="round" className="scene-breathe" style={{ animationDelay: '.5s' }} />
      </g>
      <g>
        <path d="M770 66 L760 112 M770 66 L780 112" stroke="var(--livery-blue)" strokeWidth="2.2" fill="none" />
        <rect x="752" y="110" width="36" height="50" rx="3" fill="var(--white)" stroke="var(--scene-post)" />
        <rect x="752" y="110" width="36" height="7" rx="3" fill="var(--highlight)" />
        <rect x="760" y="122" width="20" height="16" rx="2" fill="var(--livery-step)" />
        <path d="M758 145 h24 M758 152 h16" stroke="var(--livery-hub)" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <g>
        <path d="M930 66 L920 112 M930 66 L940 112" stroke="var(--livery-blue)" strokeWidth="2.2" fill="none" />
        <rect x="912" y="110" width="36" height="50" rx="3" fill="var(--white)" stroke="var(--scene-post)" />
        <rect x="912" y="110" width="36" height="7" rx="3" fill="var(--highlight)" />
        <rect x="920" y="122" width="20" height="16" rx="2" fill="var(--livery-step)" />
        <path d="M918 145 h24 M918 152 h16" stroke="var(--livery-hub)" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <rect x="520" y="160" width="440" height="8" rx="2" fill="var(--scene-garage)" />
      <rect x="536" y="168" width="8" height="32" fill="var(--scene-garage)" />
      <rect x="936" y="168" width="8" height="32" fill="var(--scene-garage)" />
    </SceneSvg>
  );
}
