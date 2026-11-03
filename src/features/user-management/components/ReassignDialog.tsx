import { useEffect, useId, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { FormAlert } from '../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getAvailableMechanics, type MechanicOpenTicket, type MechanicOption } from '../../../lib/api/vrmsConfigApi';
import { mechanicDescription } from '../../repair/lib/mechanicOrder';
import { reassignCandidates } from '../lib/workload';

interface ReassignDialogProps {
  /** The ticket to move, or null while the dialog is closed. */
  ticket: MechanicOpenTicket | null;
  /** The mechanic it moves away from. */
  fromName: string;
  onOpenChange: (open: boolean) => void;
  /** Resolves once saved (the caller closes the dialog); throw to show the message here. */
  onSubmit: (ticket: MechanicOpenTicket, toMechanic: MechanicOption) => Promise<void>;
}

/**
 * Feature 57: pick who a ticket moves to. A searchable list (about 70 mechanics, so a radio list
 * would run off the screen) with the fewest open tickets first, the same order as the Assign
 * dialog. The footer stays in view, as a sheet on phones.
 */
export function ReassignDialog({ ticket, fromName, onOpenChange, onSubmit }: ReassignDialogProps) {
  const pickerId = useId();
  const open = ticket !== null;
  const [mechanics, setMechanics] = useState<MechanicOption[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pickedId, setPickedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh counts every time the dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getAvailableMechanics().then(
      (rows) => {
        if (cancelled) return;
        setMechanics(rows);
        setLoadFailed(false);
      },
      () => {
        if (!cancelled) setLoadFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, attempt]);

  const candidates = useMemo(
    () => (ticket && mechanics ? reassignCandidates(mechanics, ticket.mechanics.map((m) => m.id)) : []),
    [mechanics, ticket],
  );
  const options = useMemo<ComboboxOption[]>(
    () =>
      candidates.map((m) => ({
        value: m.id,
        label: m.name,
        group: 'In house',
        description: mechanicDescription(m),
        badge: m.busy ? <Badge variant="secondary">Occupied</Badge> : undefined,
      })),
    [candidates],
  );
  const picked = candidates.find((m) => m.id === pickedId) ?? null;

  const close = (next: boolean) => {
    if (saving) return;
    if (!next) {
      setPickedId('');
      setError(null);
    }
    onOpenChange(next);
  };

  const submit = async () => {
    if (!ticket || !picked || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(ticket, picked);
      setPickedId('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'That didn’t save. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={close}
      title={ticket ? `Reassign ${ticket.repairNumber}` : 'Reassign'}
      description={`Move it from ${fromName} to another mechanic. Mechanics with the fewest open tickets are listed first.`}
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" disabled={saving} onClick={() => close(false)}>
            Cancel
          </Button>
          <Button type="button" size="touch" className="md:h-10 md:text-sm" loading={saving} disabled={!picked} onClick={() => void submit()}>
            Reassign
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {error && <FormAlert message={error} />}
        <label id={`${pickerId}-label`} htmlFor={pickerId} className="text-sm font-medium">
          New mechanic
        </label>
        <Combobox
          id={pickerId}
          aria-labelledby={`${pickerId}-label`}
          options={options}
          value={pickedId}
          onValueChange={setPickedId}
          disabled={mechanics !== null && candidates.length === 0}
          placeholder={mechanics === null && !loadFailed ? 'Loading mechanics' : 'Choose a mechanic'}
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
        {mechanics && candidates.length === 0 && (
          <p className="text-xs text-muted-foreground">No other mechanic is available for this ticket.</p>
        )}
      </div>
    </ResponsiveDialog>
  );
}
