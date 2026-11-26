import { useId } from 'react';
import { SceneSvg } from './SceneSvg';

/** The stars over the depot: x, y and opacity in the 720 wide drawing. */
const STARS = [[40, 20, 0.35], [128, 52, 0.45], [205, 14, 0.25], [300, 38, 0.35], [418, 22, 0.45], [512, 46, 0.25], [590, 16, 0.35], [668, 40, 0.45], [700, 10, 0.25]];

/**
 * VRMS spec 0028, AC-10: no access to a page (and the ticket 403). The depot gate at night, a
 * palisade chained shut with a swinging padlock, a hooded bullet camera aimed down at the gate and
 * panning slowly, an amber beacon and the guard hut's lit window; no sign on the gate. Drawn from the
 * board `R43Gate`. Decoration only.
 *
 * AC-12: `wide` draws the same gate for the "No VRMS access" band, 1440 by 260 with the gate, hut,
 * camera and beacon centred at x 720 and the fence, ground and road carried out to the full width.
 */
export function GateScene({ wide = false }: { wide?: boolean }) {
  const id = useId();
  const width = wide ? 1440 : 720;
  const shift = wide ? 360 : 0;
  return (
    <SceneSvg name={wide ? 'gate-wide' : 'gate'} layout={wide ? 'band' : 'panel'}>
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
      <rect width={width} height={wide ? 260 : 220} fill="var(--sidebar)" />
      {(wide ? [0, 720] : [0]).flatMap((dx) =>
        STARS.map(([x, y, o]) => (
          <circle key={`${dx}-${x}`} cx={x + dx} cy={y} r="1.3" fill="var(--white)" fillOpacity={o} />
        )),
      )}
      <g transform={wide ? 'translate(0 40)' : undefined}>
        <path
          d="M0 142 L72 130 L158 146 L259 120 L360 140 L453 122 L561 144 L648 126 L720 138 V160 H0z"
          transform={wide ? 'scale(2 1)' : undefined}
          fill="var(--scene-hills)"
        />
        <rect x="0" y="160" width={width} height="60" fill="var(--scene-road)" />
        <line x1="0" y1="162" x2={width} y2="162" stroke="var(--white)" strokeWidth="2" strokeOpacity="0.22" />
        <line x1="0" y1="198" x2={width} y2="198" stroke="var(--white)" strokeWidth="3" strokeDasharray="34 26" strokeOpacity="0.22" />
        <Fence from={0} to={232 + shift} />
        <Fence from={488 + shift} to={width} />
      </g>
      <g transform={wide ? 'translate(360 40)' : undefined}>
        <rect x="660" y="44" width="4" height="116" fill="var(--scene-lamp-off)" />
        <rect x="644" y="40" width="22" height="6" rx="2" fill="var(--scene-post)" />
        <polygon points="646,46 664,46 460,168 270,168" fill="var(--scene-lamp-light)" fillOpacity="0.028" />
        <ellipse cx="370" cy="172" rx="150" ry="10" fill={`url(#${id}pool)`} opacity=".45" />
        <polygon points="560,120 604,120 650,168 520,168" fill={`url(#${id}warm)`} opacity=".7" />
        <rect x="540" y="100" width="88" height="60" fill="var(--scene-night)" />
        <rect x="534" y="94" width="100" height="8" rx="1" fill="var(--scene-garage)" />
        <rect x="552" y="112" width="44" height="24" rx="1" fill="var(--scene-glow)" opacity=".85" />
        <line x1="574" y1="112" x2="574" y2="136" stroke="var(--scene-night)" strokeWidth="2" />
        <rect x="604" y="114" width="16" height="46" fill="var(--scene-wall-light)" />
        <ellipse cx="584" cy="162" rx="52" ry="3.5" fill="var(--scene-black)" fillOpacity="0.45" />
        <rect x="236" y="84" width="9" height="76" fill="var(--scene-steel-light)" />
        <rect x="475" y="84" width="9" height="76" fill="var(--scene-steel-light)" />
        <rect x="233" y="80" width="15" height="5" rx="1" fill="var(--scene-steel-mid)" />
        <rect x="472" y="80" width="15" height="5" rx="1" fill="var(--scene-steel-mid)" />
        <ellipse cx="360" cy="162" rx="130" ry="3" fill="var(--scene-black)" fillOpacity="0.45" />
        <rect x="244" y="98" width="114" height="62" fill="none" stroke="var(--scene-steel-light)" strokeWidth="3" />
        <line x1="254" y1="98" x2="254" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M251.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="264" y1="98" x2="264" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M261.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="274" y1="98" x2="274" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M271.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="284" y1="98" x2="284" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M281.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="294" y1="98" x2="294" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M291.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="304" y1="98" x2="304" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M301.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="314" y1="98" x2="314" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M311.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="324" y1="98" x2="324" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M321.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="334" y1="98" x2="334" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M331.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="344" y1="98" x2="344" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M341.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="354" y1="98" x2="354" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M351.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="244" y1="128" x2="358" y2="128" stroke="var(--scene-steel-light)" strokeWidth="2" />
        <rect x="244" y="150" width="114" height="10" fill={`url(#${id}haz)`} opacity=".55" />
        <rect x="362" y="98" width="114" height="62" fill="none" stroke="var(--scene-steel-light)" strokeWidth="3" />
        <line x1="372" y1="98" x2="372" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M369.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="382" y1="98" x2="382" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M379.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="392" y1="98" x2="392" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M389.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="402" y1="98" x2="402" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M399.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="412" y1="98" x2="412" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M409.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="422" y1="98" x2="422" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M419.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="432" y1="98" x2="432" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M429.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="442" y1="98" x2="442" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M439.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="452" y1="98" x2="452" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M449.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="462" y1="98" x2="462" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M459.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="472" y1="98" x2="472" y2="160" stroke="var(--scene-steel)" strokeWidth="2.4" />
        <path d="M469.5 98 l2.5 -6 l2.5 6z" fill="var(--scene-steel)" />
        <line x1="362" y1="128" x2="476" y2="128" stroke="var(--scene-steel-light)" strokeWidth="2" />
        <rect x="362" y="150" width="114" height="10" fill={`url(#${id}haz)`} opacity=".55" />
        <path d="M344 134 q8 7 16 0 q8 -7 16 0" fill="none" stroke="var(--livery-hub)" strokeWidth="2.6" strokeDasharray="4 2" />
        <g className="scene-swing">
          <path d="M354 142 v-5 a6 6 0 0 1 12 0 v5" fill="none" stroke="var(--livery-hub)" strokeWidth="2.6" />
          <rect x="351" y="141" width="18" height="14" rx="2.5" fill="var(--highlight)" />
          <circle cx="360" cy="147" r="1.8" fill="var(--sidebar)" />
        </g>
        <rect x="231" y="84" width="5" height="12" rx="1" fill="var(--scene-slate)" />
        <path d="M232 89 L224 87" stroke="var(--scene-steel-soft)" strokeWidth="3" strokeLinecap="round" />
        <g transform="rotate(-18 222 87)">
          <g className="scene-pan" style={{ transformBox: 'view-box', transformOrigin: '222px 87px' }}>
            <rect x="197" y="82" width="26" height="11" rx="3.5" fill="var(--livery-step)" />
            <rect x="193" y="79" width="31" height="4" rx="2" fill="var(--livery-hub)" />
            <rect x="194" y="83" width="5" height="9" rx="1.5" fill="var(--scene-tyre-wall)" />
            <circle cx="196.5" cy="87.5" r="2.4" fill="var(--scene-shadow)" />
            <circle cx="195.8" cy="86.8" r=".8" fill="var(--scene-periwinkle)" />
            <rect x="203" y="91" width="16" height="1.5" fill="var(--scene-steel-soft)" />
            <circle cx="219" cy="85.5" r="1.1" fill="var(--scene-red-lamp)" className="scene-blink" />
          </g>
        </g>
        <path d="M234 96 q2 8 4 10" stroke="var(--livery-bumper)" strokeWidth="1.2" fill="none" />
        <circle cx="479.5" cy="76" r="12" fill="var(--livery-orange)" fillOpacity="0.25" className="scene-blink" />
        <circle cx="479.5" cy="76" r="4.5" fill="var(--livery-orange)" className="scene-blink" />
      </g>
    </SceneSvg>
  );
}

/** A run of palisade fence between two x positions: a faint backing, two rails, bars every 8 and posts every 56. */
function Fence({ from, to }: { from: number; to: number }) {
  const bars: number[] = [];
  for (let x = from + 8; x < to; x += 8) bars.push(x);
  const posts: number[] = [];
  for (let x = from + 20; x + 4 <= to; x += 56) posts.push(x);
  return (
    <g>
      <rect x={from} y="112" width={to - from} height="48" fill="var(--scene-post)" fillOpacity="0.05" />
      <line x1={from} y1="114" x2={to} y2="114" stroke="var(--scene-lamp-off)" strokeWidth="2" />
      <line x1={from} y1="138" x2={to} y2="138" stroke="var(--scene-lamp-off)" strokeWidth="1.5" />
      {bars.map((x) => (
        <line key={x} x1={x} y1="114" x2={x} y2="160" stroke="var(--scene-post)" strokeWidth="1" strokeOpacity="0.16" />
      ))}
      {posts.map((x) => (
        <rect key={x} x={x} y="108" width="4" height="52" fill="var(--scene-lamp-off)" />
      ))}
    </g>
  );
}
