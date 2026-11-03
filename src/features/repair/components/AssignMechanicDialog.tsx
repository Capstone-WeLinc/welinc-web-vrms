import { useEffect, useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { Callout } from '../../../components/shared/Callout';
import { FormAlert } from '../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getAvailableMechanics, type MechanicOption } from '../../../lib/api/vrmsConfigApi';
import type { MechanicAssignment, RepairStatus } from '../../../types';
import { guardedClose } from '../hooks/useEditSession';
import { sortMechanics } from '../lib/mechanicOrder';
import { EDIT_REASON_MAX, EDIT_REASON_MIN, mechanicsEffect } from '../lib/ticketEdits';

interface AssignMechanicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairNumber: string;
  /** The ticket's status as the dialog opened; decides what an empty list does (spec 0019, AC-10). */
  status: RepairStatus;
  /** The mechanics on the ticket as it opened; empty for the Assign action on an Open ticket. */
  current?: MechanicAssignment[];
  /** Spec 0019, AC-3: an unlocked closed ticket says why. */
  needsReason?: boolean;
  /** Resolve once handled (the page closes the dialog); throw to show the message here. */
  onSubmit: (mechanicIds: string[], reason?: string) => Promise<void>;
}

type Chosen = { id: string; name: string };

/**
 * Pick in house mechanics (spec 0016, AC-18). With `current` it edits the full list on any open
 * ticket: add, remove or swap in one save, and an empty list where the status allows (spec 0019,
 * AC-9, AC-10, AC-20). Mechanics with the fewest open tickets are listed first.
 */
export function AssignMechanicDialog({
  open,
  onOpenChange,
  repairNumber,
  status,
  current = [],
  needsReason = false,
  onSubmit,
}: AssignMechanicDialogProps) {
  const pickerId = useId();
  const reasonId = useId();
  const editing = current.length > 0 || status !== 'OPEN';
  const [mechanics, setMechanics] = useState<MechanicOption[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [chosen, setChosen] = useState<Chosen[]>(() => current.map((m) => ({ id: m.id, name: m.name })));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh counts every time the dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getAvailableMechanics()
      .then((rows) => {
        if (cancelled) return;
        setMechanics(rows);
        setLoadFailed(false);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, attempt]);

  const options = useMemo<ComboboxOption[]>(
    () =>
      sortMechanics(mechanics ?? [])
        .filter((m) => !chosen.some((c) => c.id === m.id))
        .map((m) => ({
          value: m.id,
          label: m.name,
          group: 'In house',
          description: `${m.openCount} open`,
          badge: m.busy ? <Badge variant="secondary">Occupied</Badge> : undefined,
        })),
    [mechanics, chosen],
  );

  const ids = chosen.map((m) => m.id);
  const changed = ids.length !== current.length || ids.some((id, i) => id !== current[i]?.id) || reason.trim() !== '';
  const effect = mechanicsEffect(status, current.length, ids.length);
  const reasonLength = reason.trim().length;
  const reasonOk = !needsReason || (reasonLength >= EDIT_REASON_MIN && reasonLength <= EDIT_REASON_MAX);
  // The Assign action needs someone; the edit may empty the list, but must change something
  const canSave = editing ? changed && reasonOk : ids.length > 0;

  const changeOpen = guardedClose(editing && changed, saving, (next) => {
    if (!next) {
      setChosen(current.map((m) => ({ id: m.id, name: m.name })));
      setReason('');
      setError(null);
    }
    onOpenChange(next);
  });

  const submit = async () => {
    if (saving || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(ids, needsReason ? reason.trim() : undefined);
    } catch (err) {
      setError(getApiErrorMessage(err, 'That didn’t save. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => void changeOpen(next)}
      title={editing ? `Mechanics on ${repairNumber}` : `Assign a mechanic to ${repairNumber}?`}
      description={
        editing
          ? 'Add, remove or swap mechanics. Mechanics with the fewest open tickets are listed first.'
          : 'The ticket becomes Assigned. Mechanics with the fewest open tickets are listed first.'
      }
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" disabled={saving} onClick={() => void changeOpen(false)}>
            Cancel
          </Button>
          <Button type="button" size="touch" className="md:h-10 md:text-sm" loading={saving} disabled={!canSave} onClick={() => void submit()}>
            {editing ? 'Save mechanics' : 'Assign'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <FormAlert message={error} />}
        <div className="flex flex-col gap-2">
          <label id={`${pickerId}-label`} htmlFor={pickerId} className="text-sm font-medium">
            Mechanics
          </label>
          <Combobox
            id={pickerId}
            aria-labelledby={`${pickerId}-label`}
            options={options}
            value=""
            onValueChange={(id) => {
              const picked = mechanics?.find((m) => m.id === id);
              if (picked) setChosen((list) => [...list, { id: picked.id, name: picked.name }]);
            }}
            placeholder={mechanics === null && !loadFailed ? 'Loading mechanics' : 'Add a mechanic'}
            searchPlaceholder="Search mechanics"
            emptyText="No mechanic matches."
          />
          {loadFailed && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-destructive">
              Couldn’t load mechanics.
              <Button type="button" variant="link" size="sm" className="h-auto min-h-11 px-0 md:min-h-0" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </Button>
            </p>
          )}
          {mechanics?.length === 0 && (
            <p className="text-xs text-muted-foreground">No in house mechanics are set up yet. Give someone a mechanic role on the Users page.</p>
          )}
        </div>
        {chosen.length > 0 ? (
          <ul aria-label={editing ? 'Mechanics on this ticket' : 'Mechanics to assign'} className="flex flex-wrap gap-2">
            {chosen.map((m) => (
              <li key={m.id} className="flex items-center gap-1.5 rounded-full border border-border bg-secondary py-0.5 pl-3 text-sm text-foreground">
                <span className="max-w-60 truncate">{m.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-full md:size-8"
                  aria-label={`Remove ${m.name}`}
                  onClick={() => setChosen((list) => list.filter((c) => c.id !== m.id))}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          editing && <p className="text-sm text-muted-foreground">No mechanic on this ticket.</p>
        )}
        {editing && effect && <Callout tone="warning" className="animate-in fade-in-0 duration-150">{effect}</Callout>}
        {needsReason && (
          <div className="flex flex-col gap-2">
            <label htmlFor={reasonId} className="text-sm font-medium">
              Reason for the change <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <Textarea
              id={reasonId}
              rows={2}
              value={reason}
              required
              aria-describedby={`${reasonId}-help`}
              onChange={(event) => setReason(event.target.value)}
            />
            <p id={`${reasonId}-help`} className="text-xs text-muted-foreground">
              This ticket is closed, so say why. {EDIT_REASON_MIN} to {EDIT_REASON_MAX} characters.
            </p>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
