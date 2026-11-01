import { useEffect, useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { FormAlert } from '../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { getAvailableMechanics, type MechanicOption } from '../../../lib/api/vrmsConfigApi';
import { sortMechanics } from '../lib/mechanicOrder';

interface AssignMechanicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairNumber: string;
  /** Resolve once handled (the page closes the dialog); throw to show the message here. */
  onSubmit: (mechanicIds: string[]) => Promise<void>;
}

/** Pick one or more in house mechanics for an Open ticket (spec 0016, AC-18). */
export function AssignMechanicDialog({ open, onOpenChange, repairNumber, onSubmit }: AssignMechanicDialogProps) {
  const pickerId = useId();
  const [mechanics, setMechanics] = useState<MechanicOption[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [chosen, setChosen] = useState<MechanicOption[]>([]);
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
          badge: m.busy ? <Badge variant="secondary">Busy</Badge> : undefined,
        })),
    [mechanics, chosen],
  );

  const changeOpen = (next: boolean) => {
    if (saving) return;
    if (!next) {
      setChosen([]);
      setError(null);
    }
    onOpenChange(next);
  };

  const submit = async () => {
    if (saving || chosen.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(chosen.map((m) => m.id));
      setChosen([]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'That didn’t save. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={changeOpen}
      title={`Assign a mechanic to ${repairNumber}?`}
      description="The ticket becomes Assigned. Mechanics with the fewest open tickets are listed first."
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" disabled={saving} onClick={() => changeOpen(false)}>
            Cancel
          </Button>
          <Button type="button" size="touch" className="md:h-10 md:text-sm" loading={saving} disabled={chosen.length === 0} onClick={() => void submit()}>
            Assign
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <FormAlert message={error} />}
        <div className="flex flex-col gap-2">
          <label htmlFor={pickerId} className="text-sm font-medium">
            Mechanics
          </label>
          <Combobox
            id={pickerId}
            options={options}
            value=""
            onValueChange={(id) => {
              const picked = mechanics?.find((m) => m.id === id);
              if (picked) setChosen((list) => [...list, picked]);
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
        {chosen.length > 0 && (
          <ul aria-label="Mechanics to assign" className="flex flex-wrap gap-2">
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
        )}
      </div>
    </ResponsiveDialog>
  );
}
