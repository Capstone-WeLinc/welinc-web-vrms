import { DATA_MODES, readDataMode, switchDataMode } from '../worst-case/dataMode';

/**
 * Development only (break-ui): Demo data / Worst case and the extra states, fixed at the bottom
 * center. Plain chrome, not part of the design under test.
 */
export function DataModeToggle() {
  const current = readDataMode();
  return (
    // The outer strip keeps a 16px gutter; the pill scrolls inside it on a narrow phone
    <div className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex justify-center md:bottom-4">
      <div
        role="radiogroup"
        aria-label="Dataset"
        className="pointer-events-auto flex max-w-full gap-0.5 overflow-x-auto rounded-full border border-border bg-muted p-0.5 text-xs shadow-md"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {DATA_MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={mode.value === current}
            onClick={() => mode.value !== current && switchDataMode(mode.value)}
            className={
              mode.value === current
                ? 'rounded-full bg-card px-3 py-1.5 font-medium whitespace-nowrap text-foreground shadow-sm'
                : 'rounded-full px-3 py-1.5 whitespace-nowrap text-muted-foreground'
            }
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
