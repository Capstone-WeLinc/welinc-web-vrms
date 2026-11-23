import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Inbox, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { confirm } from '../../../components/shared/confirm/confirm';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage } from '../../../lib/api/errors';
import {
  dismissGroup,
  getSuggestions,
  resolveSuggestion,
  type MechanicSuggestion,
  type SuggestionGroup,
} from '../../../lib/api/knowledgeApi';
import { formatDateTime } from '../../../lib/utils/format';
import { KnowledgeHeader } from '../components/KnowledgeHeader';
import { SuggestionGroupCard } from '../components/SuggestionGroupCard';
import { useLoad } from '../hooks/useLoad';
import { FROM_SUGGESTIONS, groupOrigin, suggestionOrigin } from '../lib/editorOrigin';

const fetchSuggestions = () => getSuggestions();
const PANEL = 'rounded-2xl border border-transparent bg-card shadow-card';

function SectionHeading({ id, title, count }: { id: string; title: string; count?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={id} className="text-group font-semibold text-foreground">
        {title}
      </h2>
      {count && <p className="text-body text-muted-foreground tabular-nums">{count}</p>}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <Card key={i} className="gap-3 p-4 md:p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </Card>
      ))}
    </div>
  );
}

function MechanicSuggestionRow({
  suggestion,
  busy,
  onOpen,
  onResolve,
}: {
  suggestion: MechanicSuggestion;
  busy: boolean;
  onOpen: () => void;
  onResolve: (status: 'ACCEPTED' | 'DISMISSED') => void;
}) {
  const change = suggestion.kind === 'CHANGE';
  return (
    <li className="flex flex-col gap-3 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{change ? 'Change' : 'New entry'}</Badge>
        {change && suggestion.entry && (
          <Link
            to={`/knowledge-base/${suggestion.entry.id}`}
            className="rounded-md text-body font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {suggestion.entry.name}
          </Link>
        )}
      </div>
      <p className="text-body break-words whitespace-pre-line text-foreground">{suggestion.body}</p>
      <p className="text-caption text-muted-foreground tabular-nums">
        {suggestion.createdByEmail} · {formatDateTime(suggestion.createdAt)}
        {suggestion.source && (
          <>
            {' · from '}
            <Link to={`/repairs/${suggestion.source.ticketId}`} className="font-medium text-primary underline-offset-4 hover:underline">
              {suggestion.source.repairNumber}
            </Link>
          </>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={onOpen}>
          {change ? 'Open entry' : 'Create entry'}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onResolve('ACCEPTED')}>
          Mark done
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onResolve('DISMISSED')}>
          Dismiss
        </Button>
      </div>
    </li>
  );
}

/** Recurring problems and mechanics' suggestions (spec 0007, AC-32 to AC-36). Editors only. */
export function KnowledgeSuggestionsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const data = useLoad('suggestions', fetchSuggestions, 'Suggestions didn’t load.');
  const [busy, setBusy] = useState<string | null>(null);
  const groups = data.data?.groups ?? [];
  const suggestions = data.data?.suggestions ?? [];

  const openEditor = (origin: ReturnType<typeof groupOrigin>) =>
    navigate(`/knowledge-base/new?from=${FROM_SUGGESTIONS}`, { state: { origin } });

  const dismiss = async (group: SuggestionGroup) => {
    const ok = await confirm({
      title: `Dismiss these ${group.size} issues?`,
      description: 'They won’t be suggested again. Their tickets stay as they are.',
      confirmText: 'Dismiss',
      tone: 'destructive',
    });
    if (!ok) return;
    setBusy(group.issueIds[0]);
    try {
      await dismissGroup(group.issueIds);
      showToast('Group dismissed', 'success');
      await data.refresh();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Couldn’t dismiss the group.'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const resolve = async (suggestion: MechanicSuggestion, status: 'ACCEPTED' | 'DISMISSED') => {
    setBusy(suggestion.id);
    try {
      await resolveSuggestion(suggestion.id, status);
      showToast(status === 'ACCEPTED' ? 'Marked done' : 'Suggestion dismissed', 'success');
      await data.refresh();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Couldn’t update the suggestion.'), 'error');
      await data.refresh();
    } finally {
      setBusy(null);
    }
  };

  const error = data.state === 'error' && (
    <div className={PANEL}>
      <ErrorState title="Couldn’t load suggestions." message={data.errorMessage ?? ''} onRetry={data.retry} retryText="Retry" />
    </div>
  );

  return (
    <div>
      <KnowledgeHeader isEditor suggestionCount={data.data?.openCount} />

      <div className="grid gap-6 xl:grid-cols-5 xl:items-start">
        <section aria-labelledby="recurring-heading" className="min-w-0 xl:col-span-3">
          <SectionHeading
            id="recurring-heading"
            title="Recurring problems"
            count={data.state === 'ready' ? `${groups.length} recurring ${groups.length === 1 ? 'problem' : 'problems'}` : undefined}
          />
          {data.state === 'loading' ? (
            <SectionSkeleton />
          ) : data.state === 'error' ? (
            error
          ) : groups.length === 0 ? (
            <div className={PANEL}>
              <EmptyState icon={Layers} title="No recurring problems right now." description="Similar issues without a known fix show up here." />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {groups.map((group) => (
                <SuggestionGroupCard
                  key={group.issueIds[0]}
                  group={group}
                  busy={busy !== null}
                  onCreate={() => openEditor(groupOrigin(group))}
                  onDismiss={() => void dismiss(group)}
                />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="mechanics-heading" className="min-w-0 xl:col-span-2">
          <SectionHeading id="mechanics-heading" title="From mechanics" count={data.state === 'ready' ? `${suggestions.length} open` : undefined} />
          {data.state === 'loading' ? (
            <SectionSkeleton />
          ) : data.state === 'error' ? (
            error
          ) : suggestions.length === 0 ? (
            <div className={PANEL}>
              <EmptyState icon={Inbox} title="Nothing from mechanics yet." description="“Suggest a change” and “Suggest an entry” land here." />
            </div>
          ) : (
            <ul className={`${PANEL} flex flex-col divide-y divide-border`}>
              {suggestions.map((s) => (
                <MechanicSuggestionRow
                  key={s.id}
                  suggestion={s}
                  busy={busy !== null}
                  onOpen={() => (s.kind === 'CHANGE' && s.entry ? navigate(`/knowledge-base/${s.entry.id}`) : openEditor(suggestionOrigin(s)))}
                  onResolve={(status) => void resolve(s, status)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
