import { LiveryTruck } from './LiveryTruck';
import { SceneSvg } from './SceneSvg';

/**
 * VRMS spec 0028, AC-9: a record not found. The ticket drawer slides out and the 0999 folder is missing; the still frame keeps the drawer out. Drawn from the board `R39NotFoundDrawer`. Decoration only.
 */
export function NotFoundDrawerScene() {
  return (
    <SceneSvg name="not-found-drawer" layout="panel">
      <rect width="720" height="220" fill="var(--sidebar)" />
      <rect x="0" y="0" width="720" height="180" fill="var(--scene-night)" />
      <rect x="0" y="0" width="720" height="6" fill="var(--scene-wall)" />
      <rect x="590" y="40" width="110" height="70" rx="3" fill="var(--scene-wall-light)" />
      <rect x="596" y="46" width="98" height="58" fill="var(--sidebar)" />
      <g transform="translate(606 74) scale(0.6)">
        <LiveryTruck />
      </g>
      <rect x="596" y="96" width="98" height="8" fill="var(--scene-road)" />
      <g className="scene-drawer">
        <rect x="230" y="100" width="160" height="38" fill="var(--scene-post)" />
        <rect x="230" y="100" width="160" height="4" fill="var(--scene-paper)" />
        <rect x="238" y="84" width="22" height="18" rx="1.5" fill="var(--livery-body)" stroke="var(--livery-step)" strokeWidth=".8" />
        <text x="249" y="96" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="var(--sidebar)">0996</text>
        <rect x="263" y="84" width="22" height="18" rx="1.5" fill="var(--scene-glow)" stroke="var(--livery-step)" strokeWidth=".8" />
        <text x="274" y="96" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="var(--sidebar)">0997</text>
        <rect x="288" y="84" width="22" height="18" rx="1.5" fill="var(--livery-body)" stroke="var(--livery-step)" strokeWidth=".8" />
        <text x="299" y="96" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="var(--sidebar)">0998</text>
        <rect x="313" y="84" width="22" height="18" rx="1.5" fill="var(--highlight)" stroke="var(--highlight)" strokeWidth="1.4" strokeDasharray="3 2" fillOpacity="0.18" className="scene-slow" />
        <text x="324" y="79" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="var(--highlight)">0999</text>
        <rect x="338" y="84" width="22" height="18" rx="1.5" fill="var(--scene-screen)" stroke="var(--livery-step)" strokeWidth=".8" />
        <text x="349" y="96" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="var(--sidebar)">1001</text>
        <rect x="363" y="84" width="22" height="18" rx="1.5" fill="var(--livery-body)" stroke="var(--livery-step)" strokeWidth=".8" />
        <text x="374" y="96" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="var(--sidebar)">1002</text>
        <rect x="222" y="104" width="10" height="30" rx="2" fill="var(--livery-hub)" />
        <rect x="219" y="114" width="4" height="10" rx="1" fill="var(--scene-slate)" />
      </g>
      <rect x="380" y="56" width="180" height="124" rx="3" fill="var(--scene-garage)" />
      <rect x="380" y="56" width="180" height="5" fill="var(--scene-wall-bright)" />
      <rect x="380" y="96" width="180" height="2" fill="var(--scene-night)" />
      <rect x="380" y="138" width="180" height="2" fill="var(--scene-night)" />
      <rect x="455" y="70" width="30" height="8" rx="1" fill="var(--livery-body)" />
      <rect x="455" y="152" width="30" height="8" rx="1" fill="var(--livery-body)" />
      <rect x="398" y="60" width="74" height="2" fill="none" />
      <rect x="130" y="40" width="70" height="90" rx="2" fill="var(--scene-wall-light)" />
      <rect x="136" y="46" width="58" height="12" fill="var(--highlight)" />
      <text x="165" y="55.5" textAnchor="middle" fontSize="8" fontWeight="800" letterSpacing="1" fill="var(--sidebar)">JOBS</text>
      <rect x="140" y="64" width="22" height="26" fill="var(--livery-body)" />
      <rect x="168" y="64" width="22" height="26" fill="var(--scene-glow)" />
      <rect x="140" y="96" width="22" height="26" fill="var(--scene-screen)" />
      <rect x="0" y="180" width="720" height="40" fill="var(--scene-road)" />
      <line x1="0" y1="182" x2="720" y2="182" stroke="var(--white)" strokeWidth="2" strokeOpacity="0.22" />
    </SceneSvg>
  );
}
