import { useId } from 'react';
import { LiveryTruck } from './LiveryTruck';
import { SceneSvg } from './SceneSvg';

/**
 * VRMS spec 0028, AC-5: a crash inside the app. The truck stopped on a darkened road, its hazards blinking amber onto the asphalt, steam rising from the engine. Drawn from the board `R39CrashGlow`. Decoration only.
 */
export function CrashScene() {
  const id = useId();
  return (
    <SceneSvg name="crash" layout="panel">
      <rect width="720" height="220" fill="var(--sidebar)" />
      <defs>
        <radialGradient id={`${id}amb`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="var(--livery-orange)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--livery-orange)" stopOpacity="0" />
        </radialGradient>
      </defs>
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
      <rect width="720" height="220" fill="var(--scene-night-deep)" fillOpacity="0.45" />
      <ellipse cx="360.2" cy="180" rx="93.8" ry="3.5" fill="var(--scene-black)" fillOpacity="0.4" />
      <g transform="translate(270.4 108.6) scale(1.4)">
        <LiveryTruck blink />
      </g>
      <ellipse cx="455" cy="186" rx="70" ry="10" fill={`url(#${id}amb)`} className="scene-glow" />
      <circle cx="447" cy="146" r="22" fill={`url(#${id}amb)`} className="scene-glow" />
      <ellipse cx="258" cy="186" rx="60" ry="9" fill={`url(#${id}amb)`} className="scene-glow" style={{ animationDelay: '.55s' }} />
      <circle cx="263" cy="149" r="20" fill={`url(#${id}amb)`} className="scene-glow" style={{ animationDelay: '.55s' }} />
      <circle cx="452.0" cy="141.2" r="9.9" fill="var(--scene-paper-edge)" opacity="0.3" className="scene-drift" />
      <circle cx="460.8" cy="121.4" r="13.2" fill="var(--scene-paper-edge)" opacity="0.24" className="scene-drift" />
      <circle cx="449.8" cy="99.4" r="16.5" fill="var(--scene-paper-edge)" opacity="0.17" className="scene-drift" />
      <circle cx="463.0" cy="77.4" r="14.3" fill="var(--scene-paper-edge)" opacity="0.1" className="scene-drift" />
      <circle cx="452" cy="150" r="6.6" fill="var(--scene-mist)" fillOpacity="0.8" className="scene-steam" />
      <circle cx="452" cy="150" r="8.8" fill="var(--scene-mist)" fillOpacity="0.8" className="scene-steam" style={{ animationDelay: '1.1s' }} />
      <circle cx="452" cy="150" r="5.5" fill="var(--scene-mist)" fillOpacity="0.8" className="scene-steam" style={{ animationDelay: '2.2s' }} />
    </SceneSvg>
  );
}
