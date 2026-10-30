import { useId, useState } from 'react';
import { AlertCircle, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import type { PermissionMatrix } from '../../../lib/api/permissionsApi';
import { removesAny, reviewGrants, type GrantChange } from '../lib/changes';
import { REASON_COUNTER_FROM, REASON_MAX, reasonError } from '../lib/modules';

interface PermissionReviewDialogProps {
  open: boolean;
  matrix: PermissionMatrix;
  changes: GrantChange[];
  saving: boolean;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}

/**
 * The step between the matrix and the save: each role's gains and losses, then a note. The note
 * is required when a right is taken away, as for a module switch; adding rights keeps it optional.
 */
export function PermissionReviewDialog({ open, matrix, changes, saving, onConfirm, onCancel }: PermissionReviewDialogProps) {
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  // A fresh note each time the dialog opens, reset during render (React Compiler rule)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setNote('');
      setTouched(false);
    }
  }

  const noteId = useId();
  const errorId = useId();
  const required = removesAny(changes);
  const error = required || note.trim() ? reasonError(note) : null;
  const showError = touched && error !== null;
  const roles = reviewGrants(matrix, changes);

  const submit = () => {
    setTouched(true);
    if (error === null) onConfirm(note.trim());
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onCancel();
      }}
      title={changes.length === 1 ? 'Save 1 permission change?' : `Save ${changes.length} permission changes?`}
      description="Everyone with these roles gets the new rights as soon as you save."
      footer={
        <>
          <Button type="button" variant="outline" size="touch" onClick={onCancel} disabled={saving}>
            Back to the matrix
          </Button>
          <Button type="button" size="touch" variant={required ? 'destructive' : 'default'} onClick={submit} loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {roles.map((role) => (
          <section key={role.role} aria-label={role.role}>
            <h3 className="text-sm font-medium text-foreground">{role.role}</h3>
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {role.losses.map((label) => (
                <li key={label} className="flex items-start gap-2 text-destructive">
                  <Minus aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="font-medium">Loses </span>
                    {label}
                  </span>
                </li>
              ))}
              {role.gains.map((label) => (
                <li key={label} className="flex items-start gap-2 text-foreground">
                  <Plus aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="font-medium">Gains </span>
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={noteId} className="text-sm font-medium text-foreground">
            {required ? (
              <>
                Reason <span className="text-destructive">*</span>
              </>
            ) : (
              <>
                Note <span className="font-normal text-muted-foreground">(optional)</span>
              </>
            )}
          </Label>
          <Textarea
            id={noteId}
            value={note}
            maxLength={REASON_MAX}
            rows={3}
            placeholder="Why this change? It goes into the change history."
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={showError ? true : undefined}
            aria-describedby={showError ? errorId : undefined}
            aria-required={required ? 'true' : undefined}
          />
          {showError && (
            <p id={errorId} className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
              {error}
            </p>
          )}
          {note.length >= REASON_COUNTER_FROM && (
            <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
              {note.length} of {REASON_MAX} characters
            </p>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
