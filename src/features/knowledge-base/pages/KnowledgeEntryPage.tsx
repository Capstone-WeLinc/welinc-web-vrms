import { Link, useLocation, useParams } from 'react-router-dom';
import { BookOpen, SearchX, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/PageHeader';
import { BackLink } from '../../../components/shared/BackLink';
import { DetailSection } from '../../../components/shared/DetailSection';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { PriorityBadge } from '../../../components/shared/PriorityBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import type { KnowledgeEntryDetail } from '../../../lib/api/knowledgeApi';
import { isKnowledgeEditor } from '../../../lib/roles';
import { useAuthStore } from '../../../store/authStore';
import { EntryActions } from '../components/EntryActions';
import { EntryDetailSkeleton } from '../components/EntryDetailSkeleton';
import { FromYourRepairsCard, RecentTicketsCard, RepeatVehiclesCard } from '../components/EntryHistoryCards';
import { useEntry } from '../hooks/useKnowledgeData';

/** The library passes its own URL as `state.from`, so Back returns to the same search (AC-12). */
function backTo(from: unknown) {
  return typeof from === 'string' && from.startsWith('/knowledge-base') ? from : '/knowledge-base';
}

function EntryBody({ entry, isEditor }: { entry: KnowledgeEntryDetail; isEditor: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
      {/* First in the DOM, so on a phone (and for a screen reader) the fix comes before the history. */}
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2 lg:col-start-1 lg:row-start-1">
        {entry.safetyNotes && (
          <section aria-label="Safety" className="flex items-start gap-3 rounded-xl border border-highlight bg-highlight/15 p-4 md:p-5">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="text-base font-semibold text-foreground">Safety</h2>
              <p className="text-sm break-words whitespace-pre-line text-foreground">{entry.safetyNotes}</p>
            </div>
          </section>
        )}

        <DetailSection title="Fix steps">
          <ol className="flex flex-col gap-3">
            {entry.steps.map((step) => (
              <li key={step.position} className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary tabular-nums">
                  {step.position}
                </span>
                <p className="min-w-0 pt-0.5 text-sm break-words text-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </DetailSection>

        {entry.parts.length > 0 && (
          <DetailSection title="Typical parts">
            <ul className="flex flex-wrap gap-2">
              {entry.parts.map((part) => (
                <li key={part.position}>
                  <Badge variant="outline" className="h-7 px-3 text-sm font-normal">
                    {part.name}
                  </Badge>
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        <DetailSection title="Symptoms">
          <p className="text-sm break-words whitespace-pre-line text-foreground">{entry.symptoms}</p>
        </DetailSection>

        {isEditor && (
          <DetailSection title="Description template">
            {entry.descriptionTemplate ? (
              <p className="text-sm break-words whitespace-pre-line text-foreground">{entry.descriptionTemplate}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No template. Picking this entry in the repair form leaves the description empty.</p>
            )}
          </DetailSection>
        )}
      </div>

      <aside aria-label="Repair history" className="flex flex-col gap-4 lg:sticky lg:top-20 lg:col-start-3 lg:row-start-1">
        <FromYourRepairsCard stats={entry.stats} />
        <RepeatVehiclesCard vehicles={entry.repeatVehicles} />
        {entry.recentTickets && <RecentTicketsCard tickets={entry.recentTickets} />}
      </aside>
    </div>
  );
}

/** One knowledge entry (spec 0007, AC-12 to AC-16). */
export function KnowledgeEntryPage() {
  const { entryId = '' } = useParams<{ entryId: string }>();
  const location = useLocation();
  const isEditor = useAuthStore((state) => isKnowledgeEditor(state.user?.role));
  const entry = useEntry(entryId);
  const back = backTo((location.state as { from?: unknown } | null)?.from);

  if (entry.state === 'loading') return <EntryDetailSkeleton />;

  if (entry.state === 'error' || !entry.data) {
    // A mechanic opening a draft or inactive entry gets 404 too.
    const body =
      entry.errorCode === 404 || entry.errorCode === 400 ? (
        <EmptyState
          icon={SearchX}
          title="This entry isn’t available."
          description="It may have been deactivated, or the link is wrong."
          action={
            <Button asChild variant="outline">
              <Link to={back}>Back to the knowledge base</Link>
            </Button>
          }
        />
      ) : (
        <ErrorState title="Couldn’t load this entry." message={entry.errorMessage ?? 'Check your connection, then try again.'} onRetry={entry.retry} retryText="Retry" />
      );
    return (
      <div>
        <BackLink to={back} label="Knowledge base" />
        <PageHeader title="Knowledge base" icon={BookOpen} />
        <div className="rounded-xl border border-border bg-card shadow-xs">{body}</div>
      </div>
    );
  }

  const data = entry.data;
  return (
    <div key={data.id}>
      <BackLink to={back} label="Knowledge base" />
      <PageHeader
        title={data.name}
        icon={BookOpen}
        action={isEditor ? <EntryActions entry={data} onChanged={entry.replace} onStale={entry.retry} /> : undefined}
      />
      <div className="-mt-2 mb-6 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{data.category.name}</Badge>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          Suggested priority <PriorityBadge priority={data.suggestedPriority} />
        </span>
        {data.status !== 'ACTIVE' && <StatusBadge status={data.status} />}
      </div>
      <EntryBody entry={data} isEditor={isEditor} />
    </div>
  );
}
