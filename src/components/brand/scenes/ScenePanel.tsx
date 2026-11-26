import type { ReactNode } from 'react';

interface ScenePanelProps {
  /** The navy 720 by 220 scene on top. */
  scene: ReactNode;
  title: string;
  /** Optional: the ticket 403 has none. */
  line?: ReactNode;
  /** Extra content under the line, outside the alert (the crash's reference code and details). */
  children?: ReactNode;
  /** The buttons. */
  actions?: ReactNode;
  /** Puts the alert role on the title and line (default). Off for a screen you arrive on by choice. */
  alert?: boolean;
  /**
   * `h2` (default) where the page keeps its own `h1` header. `h1` where the panel is all the page
   * has, such as the portal's launcher and Admin load failures and its crash screen.
   */
  heading?: 'h1' | 'h2';
}

/**
 * VRMS spec 0028, AC-3: an error inside the app shell. A white card up to 720px wide, centred in
 * the page area, the scene on top and the words below. The title is an `h2` under the page's own
 * `h1` header, unless `heading` says otherwise. The panel is the card: a call site never wraps it in
 * another one.
 */
export function ScenePanel({ scene, title, line, children, actions, alert = true, heading: Heading = 'h2' }: ScenePanelProps) {
  return (
    <section className="mx-auto my-4 w-full max-w-180 overflow-hidden rounded-3xl bg-card shadow-card sm:my-8">
      {scene}
      <div className="flex flex-col items-center px-6 pt-7 pb-8 text-center sm:px-12">
        <div role={alert ? 'alert' : undefined} className="flex flex-col items-center">
          <Heading className="text-heading font-bold tracking-tight text-foreground">{title}</Heading>
          {line && <p className="mt-2 max-w-130 text-body text-muted-strong">{line}</p>}
        </div>
        {children}
        {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
      </div>
    </section>
  );
}
