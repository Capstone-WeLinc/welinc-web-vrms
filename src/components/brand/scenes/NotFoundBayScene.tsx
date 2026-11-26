import { SceneSvg } from './SceneSvg';

/**
 * VRMS spec 0028, AC-9: a record not found (one of two). The empty bay, its lamps flickering hard and the bay dimming, tyre tracks, an oil stain and the empty RT-0999 hook. Drawn from the board `R40NotFoundBay`. Decoration only.
 */
export function NotFoundBayScene() {
  return (
    <SceneSvg name="not-found-bay" layout="panel">
      <rect width="720" height="220" fill="var(--sidebar)" />
      <rect x="129.6" y="22" width="460.8" height="158" fill="var(--scene-night)" />
      <rect x="129.6" y="22" width="460.8" height="6" fill="var(--scene-wall)" />
      <rect x="153.6" y="48" width="412.8" height="132" fill="var(--scene-wall-light)" />
      <rect x="261.5" y="56" width="68" height="5" rx="2.5" fill="var(--scene-pane-lit)" className="scene-flicker" />
      <rect x="390.5" y="56" width="68" height="5" rx="2.5" fill="var(--scene-pane-lit)" className="scene-flicker-hard" />
      <text x="550.4" y="42" textAnchor="end" fontSize="10" fontWeight="800" letterSpacing="1.5" fill="var(--white)" fillOpacity="0.55">BAY 3</text>
      <polygon points="270,61 321,61 350,180 241,180" fill="var(--scene-pane-lit)" fillOpacity="0.11" className="scene-flicker" />
      <polygon points="399,61 450,61 480,180 369,180" fill="var(--scene-pane-lit)" fillOpacity="0.11" className="scene-flicker-hard" />
      <rect x="262.8" y="76" width="10" height="104" fill="var(--livery-edge)" />
      <rect x="264.8" y="78" width="6" height="100" fill="var(--livery-step)" />
      <rect x="447.2" y="76" width="10" height="104" fill="var(--livery-edge)" />
      <rect x="449.2" y="78" width="6" height="100" fill="var(--livery-step)" />
      <rect x="272.8" y="104" width="78.2" height="5" fill="var(--highlight)" />
      <rect x="369" y="104" width="78.2" height="5" fill="var(--highlight)" />
      <rect x="338" y="100" width="12" height="4" rx="1" fill="var(--scene-glow)" className="scene-slow" />
      <rect x="370" y="100" width="12" height="4" rx="1" fill="var(--scene-glow)" className="scene-slow" />
      <rect x="169.6" y="72" width="62" height="44" rx="3" fill="var(--livery-body)" />
      <rect x="169.6" y="72" width="62" height="7" rx="3" fill="var(--highlight)" />
      <circle cx="178.6" cy="83" r="1.6" fill="var(--livery-step)" />
      <rect x="173.6" y="86" width="10" height="14" rx="1.5" fill="var(--scene-post)" />
      <circle cx="192.6" cy="83" r="1.6" fill="var(--livery-step)" />
      <rect x="187.6" y="86" width="10" height="14" rx="1.5" fill="var(--scene-glow-amber)" />
      <circle cx="206.6" cy="83" r="1.6" fill="var(--livery-step)" />
      <rect x="201.6" y="86" width="10" height="14" rx="1.5" fill="var(--highlight)" stroke="var(--highlight)" strokeWidth="1.3" strokeDasharray="2.5 2" fillOpacity="0.15" className="scene-slow" />
      <circle cx="220.6" cy="83" r="1.6" fill="var(--livery-step)" />
      <rect x="215.6" y="86" width="10" height="14" rx="1.5" fill="var(--scene-post)" />
      <text x="206.6" y="111" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="var(--scene-clock-hand)">RT-0999</text>
      <rect x="129.6" y="22" width="460.8" height="158" fill="var(--scene-deep)" className="scene-dim" />
      <rect x="0" y="180" width="720" height="40" fill="var(--scene-road)" />
      <line x1="0" y1="182" x2="720" y2="182" stroke="var(--white)" strokeWidth="2" strokeOpacity="0.22" />
      <path d="M236 188 h18 M236 188 v8 M484 188 h-18 M484 188 v8 M226 214 h20 M226 214 v-8 M494 214 h-20 M494 214 v-8" stroke="var(--highlight)" strokeWidth="2" opacity=".6" fill="none" />
      <ellipse cx="362" cy="199" rx="44" ry="5" fill="var(--scene-black)" fillOpacity="0.5" />
      <ellipse cx="350" cy="198" rx="14" ry="1.4" fill="var(--scene-beam)" fillOpacity="0.25" />
      <path d="M300 206 H720 M300 214 H720" stroke="var(--white)" strokeWidth="4" strokeDasharray="6 4" strokeOpacity="0.08" />
      <path d="M300 176 l12 -10 v10z" fill="var(--highlight)" />
      <path d="M420 176 l-12 -10 v10z" fill="var(--highlight)" />
      <rect x="516.4" y="168" width="34" height="10" rx="5" fill="var(--livery-tyre)" />
      <rect x="527.4" y="171" width="12" height="4" rx="2" fill="var(--livery-bumper)" />
      <rect x="516.4" y="157" width="34" height="10" rx="5" fill="var(--livery-tyre)" />
      <rect x="527.4" y="160" width="12" height="4" rx="2" fill="var(--livery-bumper)" />
      <rect x="516.4" y="146" width="34" height="10" rx="5" fill="var(--livery-tyre)" />
      <rect x="527.4" y="149" width="12" height="4" rx="2" fill="var(--livery-bumper)" />
      <rect x="167.6" y="150" width="40" height="30" rx="2" fill="var(--scene-break)" />
      <rect x="167.6" y="159" width="40" height="2" fill="var(--scene-rust)" />
      <rect x="167.6" y="169" width="40" height="2" fill="var(--scene-rust)" />
    </SceneSvg>
  );
}
