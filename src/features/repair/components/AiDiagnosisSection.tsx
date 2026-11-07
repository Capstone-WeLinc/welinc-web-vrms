import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, CircleCheck, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FormAlert } from '../../../components/shared/FormAlert';
import { getAiError, getLatestDiagnosis, runDiagnosis, sendDiagnosisFeedback, type Diagnosis } from '../../../lib/api/aiApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { formatPeso, formatRelativeTime } from '../../../lib/utils/format';
import type { RepairTicket } from '../../../types';
import { isClosed } from '../lib/nextAction';
import { Callout } from '../../../components/shared/Callout';
import { FoldCard } from './FoldCard';
import { DetailItem } from '../../../components/shared/DetailSection';

const LABEL = 'text-xs font-medium tracking-wide text-muted-foreground uppercase';
const CONFIDENCE_TEXT: Record<string, string> = {
  High: 'High confidence',
  Moderate: 'Moderate confidence',
  Low: 'Low confidence, limited data',
};

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

/** What a failed run says; the server's text for every code except the hourly limit. */
function runErrorMessage(err: unknown) {
  const { code, retryAfterSeconds } = getAiError(err);
  if (code === 'AI_RATE_LIMITED') {
    const minutes = Math.max(1, Math.ceil((retryAfterSeconds ?? 60) / 60));
    return `You’ve reached the hourly limit for AI diagnoses. Try again in ${minutes === 1 ? '1 minute' : `${minutes} minutes`}.`;
  }
  return getApiErrorMessage(err, 'AI is unavailable right now. Try again in a moment.');
}

function Feedback({ diagnosisId }: { diagnosisId: string }) {
  const [rating, setRating] = useState(0);
  const [sent, setSent] = useState(false);

  const rate = (helpful: boolean, value: number) => {
    if (sent) return;
    setRating(value);
    setSent(true);
    // A lost rating is not worth interrupting anyone for.
    sendDiagnosisFeedback(diagnosisId, { helpful, rating: value }).catch(() => {});
  };

  if (sent) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm" aria-live="polite">
        <p className="inline-flex items-center gap-1.5 font-medium text-success">
          <CircleCheck aria-hidden="true" className="size-4" />
          Thanks, your rating ({rating} out of 5) is saved.
        </p>
        <Button variant="link" size="sm" className="px-0" onClick={() => setSent(false)}>
          Change rating
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <p className="text-sm font-medium text-foreground">Was this diagnosis helpful?</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => rate(true, 5)}>
          <ThumbsUp aria-hidden="true" />
          Yes, helpful
        </Button>
        <Button variant="outline" size="sm" onClick={() => rate(false, 2)}>
          <ThumbsDown aria-hidden="true" />
          Not helpful
        </Button>
        <div role="group" aria-label="Rate the diagnosis" className="flex items-center">
          {[1, 2, 3, 4, 5].map((value) => (
            <Button
              key={value}
              variant="ghost"
              size="icon"
              aria-label={`Rate ${value} out of 5`}
              onClick={() => rate(value >= 3, value)}
            >
              <Star aria-hidden="true" className={cn(rating >= value ? 'fill-highlight text-highlight' : 'text-muted-foreground')} />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Results({ data }: { data: Diagnosis }) {
  const diagnosis = data.result;
  const [showSimilar, setShowSimilar] = useState(false);
  const similar = data.similar;
  const similarityAvg = similar.length ? similar.reduce((sum, c) => sum + c.similarity, 0) / similar.length : 0;
  const historyCount = data.vehicleHistory.length;
  const critical = diagnosis.predictedPriority === 'CRITICAL';

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Ran {formatRelativeTime(data.createdAt)} with {data.model}, {(CONFIDENCE_TEXT[data.confidence] ?? `${data.confidence} confidence`).toLowerCase()}
      </p>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DetailItem label="Predicted category">{diagnosis.predictedCategory || '—'}</DetailItem>
        <DetailItem label="Predicted priority">
          <span className={cn('capitalize', critical && 'font-medium text-destructive')}>{diagnosis.predictedPriority.toLowerCase()}</span>
        </DetailItem>
        <DetailItem label="Estimated time">
          About {diagnosis.estimatedHours} hours
        </DetailItem>
      </dl>

      {diagnosis.safetyNote && (
        <Callout tone="warning" title="Safety note">
          {diagnosis.safetyNote}
        </Callout>
      )}

      <div className="flex flex-col gap-1">
        <h3 className={LABEL}>Summary</h3>
        <p className="text-sm text-foreground">{diagnosis.summary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className={LABEL}>Probable causes</h3>
          {diagnosis.probableCauses.length ? (
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-foreground">
              {diagnosis.probableCauses.map((cause, index) => (
                <li key={index}>{cause}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">None listed.</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className={LABEL}>Recommended parts</h3>
          {diagnosis.recommendedParts.length ? (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {diagnosis.recommendedParts.map((part, index) => (
                <li key={index} className="flex justify-between gap-3 py-1.5">
                  <span className="min-w-0 break-words">{part.partName}</span>
                  {part.estCostPhp != null && <span className="shrink-0 tabular-nums">{formatPeso(part.estCostPhp)}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No specific parts recommended.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className={LABEL}>Based on</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailItem label="Vehicle history">
            {historyCount > 0 ? `${historyCount} past repairs` : 'No earlier repairs'}
          </DetailItem>
          <DetailItem label="Similar fleet cases">
            {similar.length > 0
              ? `${similar.length} matches, ${percent(similarityAvg)} similar on average`
              : 'None at 60% or more'}
          </DetailItem>
        </dl>
      </div>

      {similar.length > 0 && (
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            className="justify-between px-0 hover:bg-transparent"
            aria-expanded={showSimilar}
            onClick={() => setShowSimilar((open) => !open)}
          >
            Similar past repairs ({similar.length})
            <ChevronDown aria-hidden="true" className={cn('transition-transform motion-reduce:transition-none', showSimilar && 'rotate-180')} />
          </Button>
          {showSimilar && (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {similar.map((repair) => (
                <li key={repair.issueId} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <p className="min-w-0 break-words text-foreground">{repair.description}</p>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-muted-foreground tabular-nums">{percent(repair.similarity)} similar</span>
                    <Link to={`/repairs/${repair.ticketId}`} className="font-medium text-primary underline-offset-4 hover:underline">
                      View {repair.repairNumber}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Feedback diagnosisId={data.id} />
    </div>
  );
}

/** "HIGH" as "High". */
function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

type Latest = { ticketId: string; attempt: number } & ({ status: 'ready'; diagnosis: Diagnosis | null } | { status: 'error' });

/**
 * Spec 0024, AC-14: the ticket's latest AI diagnosis as a folded card. Closed it is one line; open
 * it is the full result with Run again while the ticket is open (spec 0013, AC-9). The card loads
 * the latest diagnosis whether folded or not, and the rest of the page works if AI is down.
 */
export function AiDiagnosisSection({ ticket }: { ticket: RepairTicket }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [latest, setLatest] = useState<Latest | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const closed = isClosed(ticket);
  const hasIssues = (ticket.issues ?? []).length > 0;
  // A result for another ticket or an older attempt means this one is still loading
  const loaded = latest?.ticketId === ticket.id && latest.attempt === attempt ? latest : null;
  const diagnosis = loaded?.status === 'ready' ? loaded.diagnosis : null;

  useEffect(() => {
    let cancelled = false;
    getLatestDiagnosis(ticket.id)
      .then((found) => { if (!cancelled) setLatest({ ticketId: ticket.id, attempt, status: 'ready', diagnosis: found }); })
      .catch(() => { if (!cancelled) setLatest({ ticketId: ticket.id, attempt, status: 'error' }); });
    return () => { cancelled = true; };
  }, [ticket.id, attempt]);

  const run = () => {
    setRunning(true);
    setError('');
    runDiagnosis(ticket.id)
      .then((created) => {
        setLatest({ ticketId: ticket.id, attempt, status: 'ready', diagnosis: created });
        setOpen(true);
      })
      .catch((err) => {
        setError(runErrorMessage(err));
        setOpen(true);
      })
      .finally(() => setRunning(false));
  };

  let summary;
  if (running) {
    summary = <span className="text-muted-foreground">Running on {ticket.vehiclePlate}…</span>;
  } else if (!loaded) {
    summary = <Skeleton className="h-4 w-40" />;
  } else if (loaded.status === 'error') {
    summary = <span className="text-muted-foreground">Couldn’t load the last diagnosis</span>;
  } else if (diagnosis) {
    const { predictedCategory, predictedPriority } = diagnosis.result;
    summary = (
      <span className="text-muted-foreground">
        AI suggests {predictedCategory || 'no category'}, {sentenceCase(predictedPriority)} priority
      </span>
    );
  } else {
    summary = <span className="text-muted-foreground">{closed ? 'No AI diagnosis was run' : 'No AI diagnosis yet'}</span>;
  }
  // The one line keeps its own action: Retry a failed load, or Run when there is none yet
  const lineAction =
    loaded?.status === 'error' ? (
      <Button variant="ghost" size="sm" className="h-11 px-2 text-muted-strong md:h-8" onClick={() => setAttempt((n) => n + 1)}>
        Retry
      </Button>
    ) : loaded && !diagnosis && !closed && !open && !running ? (
      <Button variant="ghost" size="sm" className="h-11 px-2 text-muted-strong md:h-8" disabled={!hasIssues} onClick={run}>
        Run
      </Button>
    ) : diagnosis && open && !closed && !running ? (
      <Button variant="ghost" size="sm" className="h-11 px-2 text-muted-strong md:h-8" onClick={run}>
        Run again
      </Button>
    ) : null;

  return (
    <FoldCard title="AI diagnosis" summary={summary} open={open} onOpenChange={setOpen} lineAction={lineAction}>
      <div aria-live="polite">
        {running ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : diagnosis ? (
            <div className="flex flex-col gap-4">
              {error && <FormAlert message={error} />}
              <Results key={diagnosis.id} data={diagnosis} />
            </div>
          ) : loaded?.status === 'ready' && !closed ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                {hasIssues
                  ? 'Suggests likely causes and parts from this ticket’s issues and similar past repairs.'
                  : 'Log an issue on this ticket to run a diagnosis.'}
              </p>
              {error && <FormAlert message={error} />}
              <Button variant="outline" disabled={!hasIssues} onClick={run}>
                {error ? 'Try again' : 'Run AI diagnosis'}
              </Button>
            </div>
          ) : loaded?.status === 'ready' ? (
            <p className="text-sm text-muted-foreground">No AI diagnosis was run while this ticket was open.</p>
          ) : null}
      </div>
    </FoldCard>
  );
}
