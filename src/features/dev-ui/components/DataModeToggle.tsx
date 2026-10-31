import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { DATA_MODES, readDataMode, switchDataMode } from '../worst-case/dataMode';

const HIDDEN_KEY = 'vrms.dev.dataModeHidden';
// Alt+D alone is taken by the browser (address bar)
const SHORTCUT = 'Alt+Shift+D';
const TICKET_DETAIL = /^\/repairs\/(?!new$)[^/]+$/;

function readHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

function saveHidden(hidden: boolean) {
  try {
    localStorage.setItem(HIDDEN_KEY, hidden ? '1' : '0');
  } catch {
    // Hiding still works for this page view
  }
}

/**
 * Development only (break-ui): Demo data / Worst case and the extra states, mounted once in the
 * dashboard shell. The x folds it to a dot, and Alt+Shift+D folds or opens it from the keyboard.
 * Hiding never changes the dataset: an amber dot says a fixture is still on. Plain chrome, not
 * part of the design under test.
 */
export function DataModeToggle() {
  const current = readDataMode();
  const [hidden, setHidden] = useState(readHidden);
  const { pathname } = useLocation();
  // The ticket detail page has a fixed Next action bar; lift the pill clear of it below 1024px
  const aboveActionBar = TICKET_DETAIL.test(pathname);
  const fixtureOn = current !== 'demo';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        setHidden((was) => {
          saveHidden(!was);
          return !was;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleHidden = (next: boolean) => {
    setHidden(next);
    saveHidden(next);
  };

  const position = aboveActionBar ? 'bottom-44 lg:bottom-4' : 'bottom-20 md:bottom-4';

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => toggleHidden(false)}
        aria-label={`Show dataset switch (${SHORTCUT})`}
        title={`Show dataset switch (${SHORTCUT})`}
        className={`fixed left-4 z-50 size-3 rounded-full border border-border shadow-sm ${position} ${fixtureOn ? 'bg-highlight' : 'bg-muted'}`}
      />
    );
  }

  return (
    // The outer strip keeps a 16px gutter; the pill scrolls inside it on a narrow phone.
    <div className={`pointer-events-none fixed inset-x-4 z-50 flex justify-center ${position}`}>
      <div
        className="pointer-events-auto flex max-w-full items-center gap-0.5 rounded-full border border-border bg-muted p-0.5 text-xs shadow-md"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        <div role="radiogroup" aria-label="Dataset" className="flex gap-0.5 overflow-x-auto">
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
        {fixtureOn && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-highlight" />}
        <button
          type="button"
          onClick={() => toggleHidden(true)}
          aria-label={`Hide dataset switch (${SHORTCUT})`}
          title={`Hide (${SHORTCUT})`}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
