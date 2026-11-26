import { Button } from '@/components/ui/button';
import { ErrorTile } from '@/components/brand/scenes/ErrorTile';
import { LoadScene } from '@/components/brand/scenes/LoadScene';
import { ScenePanel } from '@/components/brand/scenes/ScenePanel';
import type { TileSubject } from '@/components/brand/scenes/tileSubjects';

interface ErrorStateBase {
  /** What failed, usually from getApiErrorMessage. */
  message: string;
  onRetry?: () => void;
  title?: string;
  retryText?: string;
}

/**
 * VRMS spec 0028: every call site says what its failure replaces. `page` when it empties the page's
 * main content (the scene panel, AC-7); `tile` when it fills one card, section, tab, chart or dialog
 * (a small drawing of the subject, AC-8).
 */
export type ErrorStateProps =
  | (ErrorStateBase & {
      kind: 'page';
      /** "Nothing you saved is lost." Off where unsaved drafts can exist (the ticket and the editor). */
      reassure?: boolean;
    })
  | (ErrorStateBase & { kind: 'tile'; subject: TileSubject });

export function ErrorState(props: ErrorStateProps) {
  const { message, onRetry, title = 'Something went wrong', retryText = 'Try again' } = props;
  const retry = onRetry && (
    <Button variant="outline" onClick={onRetry}>
      {retryText}
    </Button>
  );

  if (props.kind === 'tile') {
    return (
      <div className="flex flex-col items-center px-4 py-6 text-center">
        <ErrorTile subject={props.subject} />
        {/* A status, not an alert: several failing cards must not interrupt each other (AC-18) */}
        <div role="status" className="flex flex-col items-center">
          <p className="mt-3 text-body font-semibold text-foreground">{title}</p>
          <p className="mt-1 max-w-90 text-small text-muted-foreground">{message}</p>
        </div>
        {retry && <div className="mt-3">{retry}</div>}
      </div>
    );
  }

  return (
    <ScenePanel scene={<LoadScene />} title={title} line={message} actions={retry}>
      {props.reassure !== false && <p className="mt-1 text-body text-muted-foreground">Nothing you saved is lost.</p>}
    </ScenePanel>
  );
}
