import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { BookOpen, RotateCw, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/PageHeader';
import { BackLink } from '../../../components/shared/BackLink';
import { Callout } from '../../../components/shared/Callout';
import { confirm } from '../../../components/shared/confirm/confirm';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { FormAlert } from '../../../components/shared/FormAlert';
import { useToast } from '../../../context/toast';
import { useHasTabBar } from '../../../components/layout/useNavSections';
import { useLeaveGuard } from '../../../hooks/useLeaveGuard';
import { getApiErrorMessage, getConflictCode } from '../../../lib/api/errors';
import { createEntry, updateEntry, type IssueCategory, type KnowledgeEntryDetail } from '../../../lib/api/knowledgeApi';
import { EditorActions } from '../components/EditorActions';
import { EntryDetailSkeleton } from '../components/EntryDetailSkeleton';
import { LinkIssuesSection } from '../components/LinkIssuesSection';
import { BasicsSection, LooksLikeSection, PartsSection, SafetySection, StepsSection } from '../components/EntryFormSections';
import { useCategories, useEntry } from '../hooks/useKnowledgeData';
import { FROM_SUGGESTIONS, originDefaults, readOrigin, type EditorOrigin } from '../lib/editorOrigin';
import {
  entryFormSchema,
  entryToForm,
  toEntryFields,
  type EntryFormInput,
  type EntryFormValues,
} from '../lib/entryFormSchema';

type Intent = 'DRAFT' | 'ACTIVE' | 'EDIT';

const resolver = zodResolver(entryFormSchema);
const SAVE_FAILED = 'Couldn’t save the entry. Check your connection and try again.';

interface EntryEditorProps {
  /** Null for a new entry. */
  entry: KnowledgeEntryDetail | null;
  categories: IssueCategory[];
  /** Refetches the entry; the editor remounts on the fresh copy (AC-20). */
  onReload: () => void;
  /** A new entry started from a suggestion group or a mechanic's suggestion (AC-33, AC-35). */
  origin: EditorOrigin | null;
  /** Opened from Suggestions, but the group is gone (a reload). */
  originLost: boolean;
}

function EntryEditor({ entry, categories, onReload, origin, originLost }: EntryEditorProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isNew = entry === null;
  const hasTabBar = useHasTabBar();

  const {
    control,
    handleSubmit,
    setError,
    formState: { isDirty },
  } = useForm<EntryFormInput, unknown, EntryFormValues>({
    resolver,
    defaultValues: entry ? entryToForm(entry) : originDefaults(origin, categories),
    mode: 'onTouched',
  });

  const [saving, setSaving] = useState<Intent | null>(null);
  const group = origin?.kind === 'group' ? origin : null;
  const [linkIds, setLinkIds] = useState(() => new Set(group?.issueIds ?? []));
  const [stale, setStale] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const savingRef = useRef(false);
  const submittedRef = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  useLeaveGuard({
    isDirty,
    submittedRef,
    savingRef,
    title: 'Discard your changes?',
    description: 'What you entered on this entry will be lost.',
  });

  useEffect(() => {
    if (stale || failure) alertRef.current?.focus();
  }, [stale, failure]);

  const leaveTo = entry ? `/knowledge-base/${entry.id}` : '/knowledge-base';

  const save = (intent: Intent) =>
    void handleSubmit(async (values) => {
      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(intent);
      setFailure(null);
      setStale(false);
      try {
        const fields = toEntryFields(values);
        let saved;
        let message = intent === 'ACTIVE' ? 'Entry published' : 'Entry saved';
        if (entry) {
          saved = await updateEntry(entry.id, fields, entry.updatedAt);
        } else {
          const result = await createEntry({
            ...fields,
            status: intent === 'ACTIVE' ? 'ACTIVE' : 'DRAFT',
            ...(group ? { linkIssueIds: [...linkIds] } : {}),
            ...(origin?.kind === 'suggestion' ? { suggestionId: origin.suggestionId } : {}),
          });
          saved = result.entry;
          // AC-33: "Linked 11 of 12 issues. 1 was skipped."
          if (group && linkIds.size > 0) {
            const total = result.linked + result.skipped;
            message = `${message}. Linked ${result.linked} of ${total} ${total === 1 ? 'issue' : 'issues'}.`;
            if (result.skipped > 0) message += ` ${result.skipped} ${result.skipped === 1 ? 'was' : 'were'} skipped.`;
          }
        }
        submittedRef.current = true;
        showToast(message, 'success');
        navigate(`/knowledge-base/${saved.id}`, { replace: true });
      } catch (err) {
        savingRef.current = false;
        setSaving(null);
        const code = getConflictCode(err);
        if (code === 'DUPLICATE_NAME') {
          setError('name', { type: 'server', message: getApiErrorMessage(err, 'An entry with this name already exists.') }, { shouldFocus: true });
        } else if (code === 'STALE') {
          setStale(true);
        } else {
          const message = getApiErrorMessage(err, SAVE_FAILED);
          setFailure(message);
          showToast(message, 'error');
        }
      }
    })();

  const reload = async () => {
    const ok = await confirm({
      title: 'Reload this entry?',
      description: 'You’ll see their changes, and what you typed here will be lost.',
      confirmText: 'Reload',
      cancelText: 'Keep my changes',
      tone: 'destructive',
    });
    if (ok) {
      submittedRef.current = true;
      onReload();
    }
  };

  return (
    <div className="pb-action-bar lg:pb-0">
      <BackLink to={leaveTo} label={entry ? entry.name : 'Knowledge base'} />
      <PageHeader
        title={isNew ? 'New entry' : 'Edit entry'}
        subtitle={isNew ? 'Add a known fix to the library.' : 'Changes reach new tickets only. Tickets already linked keep their checklist.'}
        icon={BookOpen}
      />

      {originLost && (
        <Callout tone="info" className="mb-4">
          The suggestion group was lost. Open it again from Suggestions to link its issues.
        </Callout>
      )}

      <form
        noValidate
        aria-label={isNew ? 'New knowledge entry' : 'Edit knowledge entry'}
        onSubmit={(e) => {
          e.preventDefault();
          save(isNew ? 'DRAFT' : 'EDIT');
        }}
        className="flex flex-col gap-4 xl:grid xl:grid-cols-3 xl:items-start [&_:is(button,input,textarea)]:scroll-mt-24 [&_:is(button,input,textarea)]:scroll-mb-action-bar"
      >
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <BasicsSection control={control} categories={categories} />
          <LooksLikeSection control={control} />
          <StepsSection control={control} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {group && (
            <LinkIssuesSection
              issues={group.issues}
              checked={linkIds}
              onToggle={(issueId, on) =>
                setLinkIds((ids) => {
                  const next = new Set(ids);
                  if (on) next.add(issueId);
                  else next.delete(issueId);
                  return next;
                })
              }
            />
          )}
          <SafetySection control={control} />
          <PartsSection control={control} />
        </div>

        {(stale || failure) && (
          <div ref={alertRef} tabIndex={-1} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring xl:col-span-3">
            {stale ? (
              <FormAlert
                message="Someone else changed this entry. Reload to see their changes."
                action={
                  <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
                    <RotateCw aria-hidden="true" />
                    Reload
                  </Button>
                }
              />
            ) : (
              <FormAlert message={failure ?? SAVE_FAILED} />
            )}
          </div>
        )}

        <div className="xl:col-span-3">
          <EditorActions isNew={isNew} saving={saving} aboveTabBar={hasTabBar} onCancel={() => navigate(leaveTo)} onSave={save} />
        </div>
      </form>
    </div>
  );
}

/** The categories the picker offers: active ones, plus the entry's own when it is inactive. */
function pickerCategories(active: IssueCategory[], entry: KnowledgeEntryDetail | null): IssueCategory[] {
  if (!entry || active.some((c) => c.id === entry.category.id)) return active;
  return [
    ...active,
    { id: entry.category.id, name: entry.category.name, isActive: false, description: null, sortOrder: 0, entryCount: 0, updatedAt: '' },
  ];
}

/** /knowledge-base/new and /knowledge-base/:entryId/edit (spec 0007, AC-17 to AC-21). */
export function KnowledgeEditorPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categories = useCategories();
  const entry = useEntry(entryId ?? null);
  const isNew = !entryId;

  // Kept in memory and stripped from history, so a reload can't link a stale group (AC-33).
  const [origin] = useState(() => (isNew ? readOrigin(location.state) : null));
  const hasState = location.state != null;
  useEffect(() => {
    if (origin && hasState) navigate({ search: `?from=${FROM_SUGGESTIONS}` }, { replace: true, state: null });
  }, [origin, hasState, navigate]);
  const originLost = isNew && !origin && searchParams.get('from') === FROM_SUGGESTIONS;

  const failed = categories.state === 'error' || (!isNew && entry.state === 'error');
  if (failed) {
    const notFound = !isNew && (entry.errorCode === 404 || entry.errorCode === 400);
    return (
      <div>
        <BackLink to="/knowledge-base" label="Knowledge base" />
        <PageHeader title={isNew ? 'New entry' : 'Edit entry'} icon={BookOpen} />
        <div className="rounded-xl border border-border bg-card shadow-xs">
          {notFound ? (
            <EmptyState
              icon={SearchX}
              title="This entry isn’t available."
              action={
                <Button asChild variant="outline">
                  <Link to="/knowledge-base">Back to the knowledge base</Link>
                </Button>
              }
            />
          ) : (
            <ErrorState
              title="Couldn’t open the editor."
              message={(categories.state === 'error' ? categories.errorMessage : entry.errorMessage) ?? SAVE_FAILED}
              onRetry={() => {
                categories.retry();
                entry.retry();
              }}
              retryText="Retry"
            />
          )}
        </div>
      </div>
    );
  }

  if (categories.state !== 'ready' || (!isNew && entry.state !== 'ready')) return <EntryDetailSkeleton />;

  const loaded = isNew ? null : entry.data;
  return (
    <EntryEditor
      key={loaded ? `${loaded.id}:${loaded.updatedAt}` : 'new'}
      entry={loaded}
      categories={pickerCategories(categories.data ?? [], loaded)}
      onReload={entry.retry}
      origin={origin}
      originLost={originLost}
    />
  );
}
