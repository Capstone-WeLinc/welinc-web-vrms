import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import type { Setting } from '../../../lib/api/settingsApi';
import { REASON_MAX, reasonError } from '../lib/modules';

interface ModuleConfirmDialogProps {
  /** The module being switched, or null when the dialog is closed. */
  module: Setting | null;
  /** Modules that turn off with it (AC-9). Empty when turning on. */
  dependents: Setting[];
  saving: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * Spec 0012, AC-22: what the switch hides, what turns off with it, and a required reason.
 * Confirm saves at once; Cancel leaves the switch as it was.
 */
export function ModuleConfirmDialog({ module, dependents, saving, onConfirm, onCancel }: ModuleConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  // A fresh form for each module the dialog opens on, reset during render (React Compiler rule)
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if ((module?.key ?? null) !== openedFor) {
    setOpenedFor(module?.key ?? null);
    setReason('');
    setTouched(false);
  }

  const reasonId = useId();
  const errorId = useId();
  const turningOff = module?.value === true;
  const error = reasonError(reason);
  const showError = touched && error !== null;

  const submit = () => {
    setTouched(true);
    if (error === null) onConfirm(reason.trim());
  };

  return (
    <ResponsiveDialog
      open={module !== null}
      onOpenChange={(open) => {
        if (!open && !saving) onCancel();
      }}
      title={module ? `Turn ${module.label} ${turningOff ? 'off' : 'on'}?` : ''}
      description={
        turningOff
          ? 'It disappears for everyone, its server calls are refused and its background work stops. Its data is kept.'
          : 'It comes back for everyone with its data. Nothing missed while it was off is filled in.'
      }
      footer={
        <>
          <Button type="button" variant="outline" size="touch" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" size="touch" variant={turningOff ? 'destructive' : 'default'} onClick={submit} loading={saving}>
            {turningOff ? 'Turn off' : 'Turn on'}
          </Button>
        </>
      }
    >
      {module && (
        <div className="flex flex-col gap-4">
          {turningOff && (
            <div>
              <h3 className="text-sm font-medium text-foreground">This turns off</h3>
              <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                {module.hides.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {dependents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground">These modules turn off with it</h3>
              <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                {dependents.map((dependent) => (
                  <li key={dependent.key}>{dependent.label}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={reasonId} className="text-sm font-medium text-foreground">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={reasonId}
              value={reason}
              maxLength={REASON_MAX}
              rows={3}
              placeholder="Why are you changing this? It goes into the change history."
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={showError ? true : undefined}
              aria-describedby={showError ? errorId : undefined}
              aria-required="true"
            />
            {showError && (
              <p id={errorId} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
