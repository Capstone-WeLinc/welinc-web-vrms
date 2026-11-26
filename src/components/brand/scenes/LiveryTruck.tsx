/**
 * Suite spec 0019, AC-1: a WeLinc truck in the real livery (white closed van, orange and blue
 * swoosh, navy wordmark), drawn facing right with its origin at the box's top left. This is the
 * 10 ft closed van from `R34NotFound`; it is about 130 by 51 units with the wheels. Decoration
 * only: it never carries a plate or any data. Place it inside an `aria-hidden` SVG.
 */
export function LiveryTruck({ blink = false }: { blink?: boolean }) {
  const lamp = blink ? 'scene-blink' : undefined;
  return (
    <g>
      <rect x="0" y="0" width="92" height="38" rx="2.5" fill="var(--livery-body)" stroke="var(--livery-edge)" strokeWidth="1" />
      <path d="M0.5 25 C28 19 60 31 91.5 15 V22 C60 34 28 24 0.5 30 Z" fill="var(--livery-orange)" />
      <path d="M0.5 30 C28 24 60 34 91.5 22 V36 a2 2 0 0 1 -2 2 H2.5 a2 2 0 0 1 -2 -2 Z" fill="var(--livery-blue)" />
      <g transform="translate(6 6) scale(0.0541)">
        <LogoMarkShapes />
      </g>
      <text x="26" y="15" fontSize="11" fontWeight="800" fontStyle="italic" fill="var(--sidebar)">
        WeLinc
      </text>
      <path d="M95 10h16l13 13v15H95z" fill="var(--livery-cab)" stroke="var(--livery-cab-edge)" strokeWidth="1" />
      <path d="M99 14h10l8 8h-18z" fill="var(--livery-glass)" />
      <rect x="95" y="30" width="29" height="3" fill="var(--livery-cab-edge)" />
      <rect x="86" y="36" width="38" height="5" fill="var(--livery-bumper)" />
      <rect x="-4" y="27" width="4" height="13" rx="1" fill="var(--livery-step)" />
      {[16, 34, 110].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="44" r="7" fill="var(--livery-tyre)" />
          <circle cx={cx} cy="44" r="3" fill="var(--livery-hub)" />
        </g>
      ))}
      <rect className={lamp} x="124" y="24" width="4" height="6" rx="1" fill="var(--livery-orange)" />
      <rect className={lamp} x="-6" y="26" width="4" height="6" rx="1" fill="var(--livery-orange)" />
    </g>
  );
}

/** The ///L polygons in the mark's own 330 by 185 units, gold, for use inside a drawing. */
function LogoMarkShapes() {
  return (
    <g fill="var(--highlight)">
      <polygon points="82,0 144,0 66,183 4,183" />
      <polygon points="177,0 240,0 162,183 100,183" />
      <polygon points="265,0 328,0 268,140 328,140 328,183 187,183" />
    </g>
  );
}

/** Two wheels, tyre and hub, at the given centres on the line y = 44. */
function Wheels({ at }: { at: number[] }) {
  return at.map((cx) => (
    <g key={cx}>
      <circle cx={cx} cy="44" r="7" fill="var(--livery-tyre)" />
      <circle cx={cx} cy="44" r="3" fill="var(--livery-hub)" />
    </g>
  ));
}

/**
 * Suite spec 0019, AC-1 (board `R37LineArt`): the 10 ft closed van in the livery, facing right,
 * about 102 by 51 units with the wheels. Decoration only, inside an `aria-hidden` SVG.
 */
export function LiveryVan() {
  return (
    <g>
      <rect x="0" y="0" width="70" height="38" rx="2.5" fill="var(--livery-body)" stroke="var(--livery-edge)" strokeWidth="1" />
      <path d="M0.5 25 C21 19 46 31 69.5 15 V22 C46 34 21 24 0.5 30 Z" fill="var(--livery-orange)" />
      <path d="M0.5 30 C21 24 46 34 69.5 22 V36 a2 2 0 0 1 -2 2 H2.5 a2 2 0 0 1 -2 -2 Z" fill="var(--livery-blue)" />
      <g transform="translate(6 6) scale(0.0541)">
        <LogoMarkShapes />
      </g>
      <text x="26" y="15" fontSize="11" fontWeight="800" fontStyle="italic" fill="var(--sidebar)">
        WeLinc
      </text>
      <path d="M73 10h16l13 13v15H73z" fill="var(--livery-cab)" stroke="var(--livery-cab-edge)" strokeWidth="1" />
      <path d="M77 14h10l8 8h-18z" fill="var(--livery-glass)" />
      <rect x="73" y="30" width="29" height="3" fill="var(--livery-cab-edge)" />
      <rect x="64" y="36" width="38" height="5" fill="var(--livery-bumper)" />
      <Wheels at={[16, 88]} />
    </g>
  );
}

/** The L300 van in the livery (board `R37LineArt`), facing right, about 80 by 51 units. */
export function LiveryL300() {
  return (
    <g>
      <path d="M0 12 Q0 8 5 8 H60 L76 22 V38 H0 Z" fill="var(--livery-body)" stroke="var(--livery-edge)" strokeWidth="1" />
      <path d="M60 11 L72 22 H60 Z" fill="var(--livery-glass)" />
      <rect x="34" y="12" width="20" height="9" rx="1.5" fill="var(--livery-glass)" />
      <rect x="8" y="12" width="22" height="9" rx="1.5" fill="var(--livery-glass)" />
      <g transform="translate(8 26) scale(0.0378)">
        <LogoMarkShapes />
      </g>
      <text x="23" y="32.5" fontSize="8" fontWeight="800" fontStyle="italic" fill="var(--sidebar)">
        WeLinc
      </text>
      <rect x="-2" y="35" width="80" height="4" fill="var(--livery-bumper)" />
      <Wheels at={[14, 62]} />
    </g>
  );
}
