import { Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CrashScene } from '@/components/brand/scenes/CrashScene';
import { PoleScene } from '@/components/brand/scenes/PoleScene';
import { SceneBand } from '@/components/brand/scenes/SceneBand';
import { ScenePanel } from '@/components/brand/scenes/ScenePanel';
import { BrandMark } from '@/components/layout/BrandMark';
import { COPIED_MS, COPY_LABEL, copyText, type CopyState } from '@/lib/monitoring/copyText';
import { crashDetails, type CaughtCrash } from '@/lib/monitoring/crashDetails';
import { APP_NAME, crashViewerIsAdmin, RELEASE } from '@/lib/monitoring/standing';

const TITLE = 'Something went wrong on this page';

interface CrashScreenProps {
  /** What the boundary stored when the page crashed. */
  crash: CaughtCrash;
  /** The first 8 characters of the Sentry event id; none when monitoring is off. */
  code?: string;
  /** `page` sits inside the shell; `full` fills the window (the shell itself crashed). */
  variant: 'page' | 'full';
}

/**
 * VRMS spec 0025, AC-7 and AC-7a: what a person sees instead of a blank page when a screen crashes.
 * Staff get a short line (with the reference code when there is one); an admin gets the details
 * and Copy details. The standing is read once, on the first draw, and never upgrades later.
 */
export function CrashScreen({ crash, code, variant }: CrashScreenProps) {
  const [isAdmin] = useState(crashViewerIsAdmin);
  const [copy, setCopy] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Built on every draw, so the Code line joins when the code arrives and the time stays put
  const details = isAdmin
    ? crashDetails(crash.error, { path: crash.path, at: crash.at, app: APP_NAME, release: RELEASE, code })
    : '';

  const onCopy = () => {
    clearTimeout(timer.current);
    void copyText(details).then((result) => {
      setCopy(result);
      if (result === 'copied') timer.current = setTimeout(() => setCopy('idle'), COPIED_MS);
    });
  };

  const line = isAdmin
    ? 'Try reloading. Copy the details below into your bug report.'
    : code
      ? 'Try reloading. If it keeps happening, send this code to your admin.'
      : 'Try reloading. If it keeps happening, tell your admin what you were doing.';

  const backHome =
    variant === 'page' ? (
      <Button variant="outline" asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    ) : (
      // Outside the router's outlet a full load is the safe way home
      <Button variant="outline" asChild>
        <a href="/dashboard">Back to dashboard</a>
      </Button>
    );

  const actions = (
    <>
      <Button onClick={() => window.location.reload()}>Reload</Button>
      {backHome}
      {isAdmin && (
        <Button variant="outline" onClick={onCopy}>
          <Copy aria-hidden="true" />
          {COPY_LABEL[copy]}
        </Button>
      )}
    </>
  );

  // Spec 0028, AC-5: only the title and the line sit in the alert; the code and details stay on screen
  const extra = (
    <>
      {!isAdmin && code && (
        <p className="mt-2 text-body text-muted-foreground">
          Reference <span className="font-mono font-semibold text-foreground select-all">{code}</span>
        </p>
      )}
      {isAdmin && (
        <pre
          aria-label="Crash details"
          className="mt-5 w-full overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 text-left font-mono text-caption text-wrap whitespace-pre-wrap break-words text-foreground select-all"
        >
          {details}
        </pre>
      )}
      {isAdmin && (
        <span role="status" className="sr-only">
          {copy === 'idle' ? '' : COPY_LABEL[copy]}
        </span>
      )}
    </>
  );

  // Spec 0028: a crash in a page keeps the shell and shows the hazard glow panel (AC-5); a crash of
  // the shell itself fills the window with the blackout band (AC-6), which renders above the router
  return variant === 'page' ? (
    <ScenePanel scene={<CrashScene />} title={TITLE} line={line} actions={actions}>
      {extra}
    </ScenePanel>
  ) : (
    <SceneBand lockup={<BrandMark tone="sidebar" />} scene={<PoleScene />} title={TITLE} line={line} actions={actions}>
      {extra}
    </SceneBand>
  );
}
