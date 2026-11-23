import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { getApiErrorMessage } from '../../../lib/api/errors';

const NAME_MAX = 100;

interface LookupNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  /** The current name when renaming; empty for a new value. */
  initialName: string;
  /** Resolve once saved; throw to show the message under the field (a duplicate is a 409). */
  onSubmit: (name: string) => Promise<void>;
}

/** One name field, for adding a value to a lookup list or renaming one (spec 0016, AC-20). Mount it keyed so it starts fresh. */
export function LookupNameDialog({ open, onOpenChange, title, submitLabel, initialName, onSubmit }: LookupNameDialogProps) {
  const formId = useId();
  const inputId = useId();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter a name.');
    if (trimmed.length > NAME_MAX) return setError(`Keep the name to ${NAME_MAX} characters.`);
    if (trimmed === initialName) return onOpenChange(false);
    setSaving(true);
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError(getApiErrorMessage(err, 'That didn’t save. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => !saving && onOpenChange(next)}
      title={title}
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-body" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} size="touch" className="md:h-10 md:text-body" loading={saving}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={inputId}>Name</FieldLabel>
          <Input
            id={inputId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className="h-11 text-base-input md:h-10 md:text-body"
          />
          {error && <FieldError id={`${inputId}-error`} errors={[{ message: error }]} />}
        </Field>
      </form>
    </ResponsiveDialog>
  );
}
