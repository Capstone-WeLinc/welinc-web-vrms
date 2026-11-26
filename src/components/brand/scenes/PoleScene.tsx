import { LiveryTruck } from './LiveryTruck';
import { SceneSvg } from './SceneSvg';

/**
 * VRMS spec 0028, AC-6: the full page crash. The depot in a blackout, the snapped line on the pole sparking; of the four lamps one flickers, two are nearly out and one is dark. Drawn from the board `R43FullPole`. Decoration only.
 */
export function PoleScene() {
  return (
    <SceneSvg name="pole" layout="band">
      <circle cx="345" cy="63" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="864" cy="91" r="1.3" fill="var(--white)" fillOpacity="0.35" />
      <circle cx="989" cy="117" r="1.3" fill="var(--white)" fillOpacity="0.25" />
      <circle cx="980" cy="113" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="383" cy="74" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="491" cy="110" r="1.3" fill="var(--white)" fillOpacity="0.25" />
      <circle cx="36" cy="57" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="884" cy="18" r="1.3" fill="var(--white)" fillOpacity="0.25" />
      <circle cx="483" cy="39" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="94" cy="65" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="841" cy="88" r="1.3" fill="var(--white)" fillOpacity="0.35" />
      <circle cx="77" cy="52" r="1.3" fill="var(--white)" fillOpacity="0.45" />
      <circle cx="1026" cy="98" r="1.3" fill="var(--white)" fillOpacity="0.25" />
      <circle cx="1336" cy="57" r="1.3" fill="var(--white)" fillOpacity="0.25" />
      <path d="M0 182 L144 170 L316 186 L518 160 L720 180 L906 162 L1122 184 L1296 166 L1440 178 V200 H0z" fill="var(--scene-hills)" />
      <rect x="0" y="200" width="1440" height="60" fill="var(--scene-road)" />
      <line x1="0" y1="202" x2="1440" y2="202" stroke="var(--white)" strokeWidth="2" strokeOpacity="0.22" />
      <rect x="300" y="70" width="840" height="130" fill="var(--scene-night)" />
      <rect x="300" y="70" width="840" height="8" fill="var(--scene-wall)" />
      <rect x="600" y="34" width="240" height="30" rx="4" fill="var(--scene-hut)" />
      <g transform="translate(618 41) scale(0.088)" fill="var(--scene-lamp-off)" className="scene-sign">
        <polygon points="82,0 144,0 66,183 4,183" />
        <polygon points="177,0 240,0 162,183 100,183" />
        <polygon points="265,0 328,0 268,140 328,140 328,183 187,183" />
      </g>
      <text x="662" y="55" fontSize="16" fontWeight="800" fontStyle="italic" fill="var(--scene-lamp-off)" className="scene-sign">WeLinc Logistics</text>
      <rect x="640" y="64" width="4" height="8" fill="var(--scene-lamp-off)" />
      <rect x="796" y="64" width="4" height="8" fill="var(--scene-lamp-off)" />
      <rect x="340" y="104" width="160" height="96" fill="var(--scene-shadow)" />
      <polygon points="400,96 440,96 490,200 350,200" fill="var(--scene-pane-lit)" fillOpacity="0.08" className="scene-flicker" />
      <rect x="400" y="90" width="40" height="6" rx="3" fill="var(--scene-pane-lit)" className="scene-flicker" />
      <rect x="540" y="104" width="160" height="96" fill="var(--scene-shadow)" />
      <polygon points="600,96 640,96 690,200 550,200" fill="var(--scene-pane-lit)" fillOpacity="0.08" className="scene-low" />
      <rect x="600" y="90" width="40" height="6" rx="3" fill="var(--scene-pane-lit)" className="scene-low" />
      <rect x="740" y="104" width="160" height="96" fill="var(--scene-shadow)" />
      <rect x="800" y="90" width="40" height="6" rx="3" fill="var(--scene-pane-off)" />
      <rect x="940" y="104" width="160" height="96" fill="var(--scene-shadow)" />
      <polygon points="1000,96 1040,96 1090,200 950,200" fill="var(--scene-pane-lit)" fillOpacity="0.08" className="scene-low-2" />
      <rect x="1000" y="90" width="40" height="6" rx="3" fill="var(--scene-pane-lit)" className="scene-low-2" />
      <g transform="translate(356 149) scale(1)">
        <LiveryTruck blink />
      </g>
      <g transform="translate(956 149) scale(1)">
        <LiveryTruck blink />
      </g>
      <rect x="200" y="110" width="5" height="90" fill="var(--scene-pane-off)" />
      <rect x="186" y="106" width="22" height="6" rx="3" fill="var(--scene-pane-off)" />
      <rect x="1240" y="110" width="5" height="90" fill="var(--scene-pane-off)" />
      <rect x="1226" y="106" width="22" height="6" rx="3" fill="var(--scene-pane-off)" />
      <rect x="150" y="40" width="7" height="160" fill="var(--scene-lamp-off)" />
      <rect x="126" y="52" width="56" height="5" fill="var(--scene-lamp-off)" />
      <rect x="160" y="70" width="22" height="30" rx="4" fill="var(--scene-pane-off)" stroke="var(--scene-lamp-off)" strokeWidth="1.5" />
      <path d="M130 52 C220 70 260 66 300 78" stroke="var(--scene-pane-off)" strokeWidth="2" fill="none" />
      <path d="M178 52 C190 80 196 100 188 120" stroke="var(--scene-pane-off)" strokeWidth="2" fill="none" />
      <path d="M186 120 l6 -6 l-1 5 l6 -1 l-7 7 l1 -4z" fill="var(--scene-glow-amber)" className="scene-spark" />
      <circle cx="190" cy="124" r="2.4" fill="var(--scene-lamp-light)" className="scene-spark" style={{ animationDelay: '.4s' }} />
      <path d="M172 72 l5 -7 l0 5 l6 -2 l-7 8 l1 -4z" fill="var(--scene-glow)" className="scene-spark" style={{ animationDelay: '1s' }} />
    </SceneSvg>
  );
}
