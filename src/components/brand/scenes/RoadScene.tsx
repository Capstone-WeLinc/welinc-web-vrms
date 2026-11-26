import { LiveryTruck } from './LiveryTruck';
import { SceneSvg } from './SceneSvg';

/**
 * Suite spec 0019, AC-26 and VRMS spec 0028, AC-15 (board `R34NotFound`): the page not found road.
 * A WeLinc truck waits at a road barrier, the barrier's lamps blinking; the lane line stops short of
 * the barrier. Decoration only.
 */
export function RoadScene() {
  return (
    <SceneSvg name="road" layout="band">
      <path d="M0 150 L160 120 L330 140 L520 104 L700 132 L880 110 L1060 136 L1240 108 L1440 128 V190 H0z" fill="var(--scene-hills)" />
      <rect x="0" y="190" width="1440" height="70" fill="var(--scene-road)" />
      <line x1="0" y1="192" x2="1440" y2="192" stroke="var(--white)" strokeOpacity="0.22" strokeWidth="2" />
      <line x1="0" y1="228" x2="980" y2="228" stroke="var(--white)" strokeOpacity="0.25" strokeWidth="3" strokeDasharray="34 26" />
      <rect x="1010" y="150" width="6" height="64" fill="var(--scene-post)" />
      <rect x="1150" y="150" width="6" height="64" fill="var(--scene-post)" />
      <rect x="996" y="150" width="174" height="22" rx="3" fill="var(--highlight)" />
      {[1006, 1036, 1066, 1096, 1126, 1156].map((x) => (
        <path key={x} d={`M${x} 150 h14 l-12 22 h-14 z`} fill="var(--sidebar)" />
      ))}
      <circle className="scene-blink" cx="1013" cy="142" r="6" fill="var(--livery-orange)" />
      <circle className="scene-blink" style={{ animationDelay: '0.55s' }} cx="1153" cy="142" r="6" fill="var(--livery-orange)" />
      <g transform="translate(820 160)">
        <LiveryTruck blink />
      </g>
    </SceneSvg>
  );
}
