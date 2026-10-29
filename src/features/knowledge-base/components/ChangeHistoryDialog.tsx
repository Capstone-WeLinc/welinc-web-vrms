import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { PRIORITY_MAP } from '../../../components/shared/priorityStyles';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { statusLabel } from '../../../components/shared/statusLabels';
import { getEntryChanges, type EntryChange } from '../../../lib/api/knowledgeApi';
import { formatDateTime } from '../../../lib/utils/format';
import { useLoad } from '../hooks/useLoad';

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  category: 'Category',
  suggestedPriority: 'Suggested priority',
  estimatedHours: 'Estimated hours',
  symptoms: 'Symptoms',
  descriptionTemplate: 'Description template',
  safetyNotes: 'Safety notes',
  steps: 'Fix steps',
  parts: 'Typical parts',
  status: 'Status',
};

function shown(field: string | null, value: string | null) {
  if (value == null || value === '') return 'Empty';
  if (field === 'status') return statusLabel(value);
  if (field === 'suggestedPriority') return PRIORITY_MAP[value]?.label ?? value;
  return value;
}

const fieldLabel = (field: string) => FIELD_LABELS[field] ?? field;

/** One save: its title, who and when, then the before and after of every field it changed. */
function ChangeRow({ change }: { change: EntryChange }) {
  const created = change.action === 'ENTRY_CREATED';
  const status = change.changes.find((c) => c.field === 'status');
  const title = created
    ? `Created as ${shown('status', status?.after ?? null).toLowerCase()}`
    : change.changes.length === 1
      ? `${fieldLabel(change.changes[0].field)} changed`
      : `${change.changes.length} fields changed`;
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {change.actorName ?? change.actorEmail ?? 'System'} · {formatDateTime(change.createdAt)}
        </p>
      </div>
      {!created &&
        change.changes.map((c) => (
          <div key={c.field} className="flex flex-col gap-1">
            {change.changes.length > 1 && <p className="text-xs font-medium text-muted-strong">{fieldLabel(c.field)}</p>}
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="min-w-0 rounded-lg bg-muted p-2">
                <dt className="text-xs font-medium text-muted-strong">Before</dt>
                <dd className="break-words whitespace-pre-line text-foreground">{shown(c.field, c.before)}</dd>
              </div>
              <div className="min-w-0 rounded-lg bg-muted p-2">
                <dt className="text-xs font-medium text-muted-strong">After</dt>
                <dd className="break-words whitespace-pre-line text-foreground">{shown(c.field, c.after)}</dd>
              </div>
            </dl>
          </div>
        ))}
    </li>
  );
}

// The key is `id|version`, so the history refetches after the entry changes.
const fetchChanges = (key: string) => getEntryChanges(key.split('|')[0]);

interface ChangeHistoryDialogProps {
  entryId: string;
  /** The entry's updatedAt. */
  version: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Who changed what on this entry, newest first (AC-16). Loads when opened. */
export function ChangeHistoryDialog({ entryId, version, open, onOpenChange }: ChangeHistoryDialogProps) {
  const changes = useLoad(open ? `${entryId}|${version}` : null, fetchChanges, 'The change history didn’t load.');

  let body;
  if (changes.state === 'error') {
    body = <ErrorState title="Couldn’t load the change history." message={changes.errorMessage ?? ''} onRetry={changes.retry} retryText="Retry" />;
  } else if (changes.state === 'loading' || !changes.data) {
    body = (
      <div aria-hidden="true" className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  } else if (changes.data.length === 0) {
    body = <EmptyState icon={History} title="No changes yet." />;
  } else {
    body = (
      <ol className="flex flex-col divide-y divide-border">
        {changes.data.map((change) => (
          <ChangeRow key={change.id} change={change} />
        ))}
      </ol>
    );
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change history"
      description="Every change to this entry, newest first."
      footer={
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      {body}
    </ResponsiveDialog>
  );
}
