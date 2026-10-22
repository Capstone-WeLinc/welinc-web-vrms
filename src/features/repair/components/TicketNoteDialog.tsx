import { useId, useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { FormAlert } from '../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { getApiErrorMessage } from '../../../lib/api/errors';

/** The server's limit on remarks, cancellation and unlock reasons. */
const NOTE_MAX = 500;

interface TicketNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fieldLabel: string;
  /** The inline error for an empty note; leave it out for an optional note. */
  requiredMessage?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Warnings shown above the note field. */
  children?: ReactNode;
  /**
   * Sends the note. Resolve once the write is handled (the page closes the dialog itself);
   * throw to show the error inside the dialog with the typed note kept.
   */
  onSubmit: (note: string) => Promise<void>;
}

/** The confirm dialog behind every status move, cancel and unlock (spec 0004, AC-15 to AC-17). */
export function TicketNoteDialog({
  open,
  onOpenChange,
  title,
  description,
  fieldLabel,
  requiredMessage,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  children,
  onSubmit,
}: TicketNoteDialogProps) {
  const formId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = z.object({
    note: z
      .string()
      .max(NOTE_MAX, `Keep it to ${NOTE_MAX} characters or fewer.`)
      .refine((note) => !requiredMessage || note.trim() !== '', requiredMessage ?? ''),
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<{ note: string }>({ resolver: zodResolver(schema), defaultValues: { note: '' } });

  const submit = async ({ note }: { note: string }) => {
    setFormError(null);
    try {
      await onSubmit(note);
      reset();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'That didn’t save. Try again.'));
    }
  };

  const changeOpen = (next: boolean) => {
    // No closing mid save, so a second request can't start from a reopened dialog.
    if (isSubmitting) return;
    if (!next) setFormError(null);
    onOpenChange(next);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={changeOpen}
      title={title}
      description={description}
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" disabled={isSubmitting} onClick={() => changeOpen(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant={destructive ? 'destructive' : 'default'}
            size="touch"
            className="md:h-10 md:text-sm"
            loading={isSubmitting}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        {children}
        <FormField
          control={control}
          name="note"
          label={fieldLabel}
          required={!!requiredMessage}
          description={`Up to ${NOTE_MAX} characters.`}
          render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={3} maxLength={NOTE_MAX} />}
        />
        {formError && <FormAlert message={formError} />}
      </form>
    </ResponsiveDialog>
  );
}
