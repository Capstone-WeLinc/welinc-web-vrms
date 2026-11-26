import { SceneSvg } from './SceneSvg';

/**
 * VRMS spec 0028, AC-11: a module turned off. The shutter is down and the Closed for now sign sways in front. Drawn from the board `R38OffA`. Decoration only.
 */
export function ClosedScene() {
  return (
    <SceneSvg name="closed" layout="panel">
      <rect width="720" height="220" fill="var(--sidebar)" />
      <circle cx="279" cy="36" r="1.3" fill="var(--white)" fillOpacity="0.35" />
      <circle cx="87" cy="39" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="161" cy="19" r="1.3" fill="var(--white)" fillOpacity="0.35" />
      <circle cx="51" cy="49" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="55" cy="16" r="1.3" fill="var(--white)" fillOpacity="0.35" />
      <circle cx="557" cy="25" r="1.3" fill="var(--white)" fillOpacity="0.35" />
      <rect x="144.0" y="26" width="432.0" height="154" fill="var(--scene-night)" />
      <rect x="144.0" y="26" width="432.0" height="6" fill="var(--scene-wall)" />
      <rect x="178.0" y="46" width="364.0" height="134" fill="var(--scene-garage)" />
      <rect x="184.0" y="52" width="352.0" height="128" fill="var(--scene-shutter)" />
      <rect x="184.0" y="59" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="184.0" y="68" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="184.0" y="77" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="184.0" y="86" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="184.0" y="95" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="184.0" y="104" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="184.0" y="113" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="184.0" y="122" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="184.0" y="131" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="184.0" y="140" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="184.0" y="149" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="184.0" y="158" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="184.0" y="167" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="184.0" y="176" width="352.0" height="2" fill="var(--scene-shutter-slat)" />
      <rect x="346.0" y="170" width="28" height="6" rx="2" fill="var(--livery-bumper)" />
      <rect x="194.0" y="34" width="20" height="6" rx="3" fill="var(--scene-lamp-off)" />
      <rect x="506.0" y="34" width="20" height="6" rx="3" fill="var(--scene-lamp-off)" />
      <g className="scene-sway">
        <line x1="312.0" y1="46" x2="312.0" y2="74" stroke="var(--livery-hub)" strokeWidth="1.5" />
        <line x1="408.0" y1="46" x2="408.0" y2="74" stroke="var(--livery-hub)" strokeWidth="1.5" />
        <rect x="294.0" y="74" width="132" height="42" rx="5" fill="var(--white)" />
        <text x="360.0" y="93" textAnchor="middle" fontSize="13" fontWeight="800" letterSpacing="1.5" fill="var(--sidebar)">CLOSED</text>
        <text x="360.0" y="107" textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="1" fill="var(--scene-slate-mid)">FOR NOW</text>
      </g>
      <rect x="0" y="180" width="720" height="40" fill="var(--scene-road)" />
      <line x1="0" y1="182" x2="720" y2="182" stroke="var(--white)" strokeWidth="2" strokeOpacity="0.22" />
    </SceneSvg>
  );
}
