import type { ReactNode } from 'react';

interface SceneBandProps {
  /**
   * The app's own brand lockup. Never a router `Link` here, since the full page crash renders above
   * the router; the 404 may pass one wrapped in a link to home.
   */
  lockup: ReactNode;
  /** A 1440 by 260 band scene. */
  scene: ReactNode;
  /** A small line above the title, such as "Error 404". */
  eyebrow?: string;
  title: string;
  line?: ReactNode;
  /** Extra content under the line, outside the alert. */
  children?: ReactNode;
  actions?: ReactNode;
  /** Puts the alert role on the title and line (default). The 404 turns it off. */
  alert?: boolean;
}

/**
 * VRMS spec 0028, AC-4: a full page error, outside the shell or when the shell itself failed. The
 * navy band holds the lockup and the scene; the words sit centred below on the page background,
 * the title the page's `h1`.
 */
export function SceneBand({ lockup, scene, eyebrow, title, line, children, actions, alert = true }: SceneBandProps) {
  return (
    <main id="main" className="flex min-h-dvh flex-col bg-background">
      <div className="bg-sidebar">
        <div className="mx-auto flex h-18 max-w-300 items-center px-6 sm:px-10">{lockup}</div>
        <div className="mt-6 sm:mt-10">{scene}</div>
      </div>
      <div className="flex flex-1 flex-col items-center px-6 pt-14 pb-16 text-center">
        <div role={alert ? 'alert' : undefined} className="flex flex-col items-center">
          {eyebrow && (
            <p className="text-small font-bold tracking-wider text-muted-foreground uppercase">{eyebrow}</p>
          )}
          <h1 className="mt-2.5 text-display font-extrabold tracking-tight text-foreground">{title}</h1>
          {line && <p className="mt-3 max-w-115 text-group font-normal text-muted-strong">{line}</p>}
        </div>
        {children}
        {actions && <div className="mt-7 flex flex-wrap justify-center gap-2">{actions}</div>}
      </div>
    </main>
  );
}
