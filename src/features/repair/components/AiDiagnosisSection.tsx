import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, CircleCheck, Sparkles, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FormAlert } from '../../../components/shared/FormAlert';
import { diagnoseRepair, sendAiFeedback, type DiagnosticResponse } from '../../../lib/api/aiApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { formatPeso } from '../../../lib/utils/format';
import type { RepairTicket } from '../../../types';
import { isClosed } from '../lib/nextAction';
import { Callout } from '../../../components/shared/Callout';
import { DetailItem, DetailSection } from '../../../components/shared/DetailSection';

const LABEL = 'text-xs font-medium tracking-wide text-muted-foreground uppercase';
const CONFIDENCE_TEXT: Record<string, string> = {
  High: 'High confidence',
  Moderate: 'Moderate confidence',
  Low: 'Low confidence, limited data',
};

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function Feedback({ ticketId }: { ticketId: string }) {
  const [rating, setRating] = useState(0);
  const [sent, setSent] = useState(false);

  const rate = (helpful: boolean, value: number) => {
    if (sent) return;
    setRating(value);
    setSent(true);
    // A lost rating is not worth interrupting anyone for.
    sendAiFeedback({ ticket_id: ticketId, helpful, rating: value }).catch(() => {});
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

function Results({ data, ticketId }: { data: DiagnosticResponse; ticketId: string }) {
  const diagnosis = data.ai_diagnosis;
  const lineage = data.context_lineage;
  const [showSimilar, setShowSimilar] = useState(false);
  const similar = data.similar_past_repairs ?? [];
  const critical = diagnosis.predicted_priority?.toLowerCase() === 'critical';

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        {diagnosis.model_used}
        {lineage && ` · ${CONFIDENCE_TEXT[lineage.confidence] ?? lineage.confidence}`}
      </p>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DetailItem label="Predicted category">{diagnosis.predicted_category || '—'}</DetailItem>
        <DetailItem label="Predicted priority">
          <span className={cn(critical && 'font-medium text-destructive')}>{diagnosis.predicted_priority || '—'}</span>
        </DetailItem>
        <DetailItem label="Estimated time">
          {diagnosis.estimated_sla_hours != null ? `About ${diagnosis.estimated_sla_hours} hours` : '—'}
        </DetailItem>
      </dl>

      {diagnosis.safety_note && (
        <Callout tone="warning" title="Safety note">
          {diagnosis.safety_note}
        </Callout>
      )}

      <div className="flex flex-col gap-1">
        <h3 className={LABEL}>Summary</h3>
        <p className="text-sm text-foreground">{diagnosis.summary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className={LABEL}>Probable causes</h3>
          {diagnosis.probable_causes?.length ? (
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-foreground">
              {diagnosis.probable_causes.map((cause, index) => (
                <li key={index}>{cause}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">None listed.</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className={LABEL}>Recommended parts</h3>
          {diagnosis.recommended_parts?.length ? (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {diagnosis.recommended_parts.map((part, index) => (
                <li key={index} className="flex justify-between gap-3 py-1.5">
                  <span className="min-w-0 break-words">{part.part_name}</span>
                  {part.est_cost_php != null && <span className="shrink-0 tabular-nums">{formatPeso(part.est_cost_php)}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No specific parts recommended.</p>
          )}
        </div>
      </div>

      {lineage && (
        <div className="flex flex-col gap-2">
          <h3 className={LABEL}>Based on</h3>
          <dl className="grid gap-3 sm:grid-cols-3">
            <DetailItem label="Vehicle history">
              {lineage.vehicle_history_count > 0 ? `${lineage.vehicle_history_count} past repairs` : 'No earlier repairs'}
            </DetailItem>
            <DetailItem label="Similar fleet cases">
              {lineage.vector_matches_count > 0
                ? `${lineage.vector_matches_count} matches, ${percent(lineage.similarity_avg)} similar on average`
                : 'None at 60% or more'}
            </DetailItem>
            <DetailItem label="Model">{lineage.model_used || diagnosis.model_used}</DetailItem>
          </dl>
        </div>
      )}

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
                <li key={repair.issue_id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <p className="min-w-0 break-words text-foreground">{repair.description}</p>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-muted-foreground tabular-nums">{percent(repair.similarity_score)} similar</span>
                    <Link to={`/repairs/${repair.ticket_id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                      View ticket
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Feedback ticketId={ticketId} />
    </div>
  );
}

/** Runs the AI diagnosis on the ticket's issues (spec 0004, AC-22). The rest of the page works if the service is down. */
export function AiDiagnosisSection({ ticket }: { ticket: RepairTicket }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const [data, setData] = useState<DiagnosticResponse | null>(null);
  const [error, setError] = useState('');
  const issues = (ticket.issues ?? []).map((issue) => issue.description);
  const runLabel = isClosed(ticket) ? 'Run AI review' : 'Run AI diagnosis';

  const run = () => {
    setState('loading');
    diagnoseRepair({
      symptom: issues.join('. '),
      ticket_id: ticket.id,
      vehicle_plate: ticket.vehiclePlate,
      vehicle_model: ticket.vehicleModel ?? '',
      issues,
    })
      .then((response) => {
        setData(response);
        setState('ready');
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, 'The AI diagnosis didn’t run. Try again.'));
        setState('error');
      });
  };

  return (
    <DetailSection
      title="AI diagnosis"
      action={
        state === 'ready' ? (
          <Button variant="outline" size="sm" onClick={run}>
            Run again
          </Button>
        ) : null
      }
    >
      {state === 'ready' && data ? (
        <Results key={data.symptom + data.ai_diagnosis.summary} data={data} ticketId={ticket.id} />
      ) : state === 'loading' ? (
        <div aria-live="polite" className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Running the diagnosis on {ticket.vehiclePlate}…</p>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            {issues.length === 0
              ? 'Log an issue on this ticket to run a diagnosis.'
              : 'Suggests likely causes and parts from this ticket’s issues and similar past repairs.'}
          </p>
          {state === 'error' && <FormAlert message={error} />}
          <Button variant="outline" disabled={issues.length === 0} onClick={run}>
            <Sparkles aria-hidden="true" />
            {state === 'error' ? 'Try again' : runLabel}
          </Button>
        </div>
      )}
    </DetailSection>
  );
}
