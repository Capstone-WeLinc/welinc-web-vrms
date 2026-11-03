import { useId, useState, type ReactNode, type RefObject } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { FormAlert } from '../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { getApiErrorMessage } from '../../../lib/api/errors';
import type { IssueResolution, RepairIssue } from '../../../types';
import {
  NOTE_MAX,
  noteFormSchema,
  noteLongEnough,
  requiredNotesValid,
  resolutionDefaults,
  toResolutions,
  type NoteFormValues,
} from '../lib/resolutionForm';
import { ResolutionFields } from './ResolutionFields';

interface TicketNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fieldLabel: string;
  /** The inline error for an empty note; leave it out for an optional note. */
  requiredMessage?: string;
  /**
   * A required note shorter than this (trimmed) keeps the submit disabled (Return to mechanic: 5,
   * spec 0014, AC-16). Only read with `requiredMessage`.
   */
  minLength?: number;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Warnings shown above the note field. */
  children?: ReactNode;
  /** Send for verification: one "What fixed it" block per issue (spec 0007, AC-30). */
  resolutionIssues?: RepairIssue[];
  /**
   * Sends the note. Resolve once the write is handled (the page closes the dialog itself);
   * throw to show the error inside the dialog with the typed note kept.
   */
  onSubmit: (note: string, resolutions?: IssueResolution[]) => Promise<void>;
  /** Focus goes here on close when it is mounted (a row menu trigger), instead of back to the opener. */
  finalFocusRef?: RefObject<HTMLElement | null>;
}

/** The confirm dialog behind every status move, cancel and unlock (spec 0004, AC-15 to AC-17). */
export function TicketNoteDialog({
  open,
  onOpenChange,
  title,
  description,
  fieldLabel,
  requiredMessage,
  minLength,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  children,
  resolutionIssues,
  onSubmit,
  finalFocusRef,
}: TicketNoteDialogProps) {
  const formId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema(requiredMessage, minLength)),
    defaultValues: { note: '', resolutions: resolutionDefaults(resolutionIssues) },
  });
  const rows = useWatch({ control, name: 'resolutions' });
  const note = useWatch({ control, name: 'note' });
  // The hint counts what is sent: trimmed, like the schema and the server
  const used = note.trim().length;
  // AC-30: the submit waits until every required "What fixed it" is valid, and a note with a
  // minimum until it is long enough (spec 0014, AC-16).
  const blocked =
    (!!resolutionIssues && !requiredNotesValid(rows)) || (!!requiredMessage && minLength !== undefined && !noteLongEnough(note, minLength));

  const submit = async ({ note, resolutions }: NoteFormValues) => {
    setFormError(null);
    try {
      // Sent trimmed: the count and the limit are after trimming, and some routes keep the text as sent
      await onSubmit(note.trim(), resolutionIssues ? toResolutions(resolutions) : undefined);
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
      finalFocusRef={finalFocusRef}
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
            disabled={blocked}
            loading={isSubmitting}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        {children}
        {resolutionIssues && <ResolutionFields control={control} issues={resolutionIssues} />}
        <FormField
          control={control}
          name="note"
          label={fieldLabel}
          required={!!requiredMessage}
          // Non breaking spaces keep a number with its unit when the hint wraps on a phone
          description={
            used > NOTE_MAX ? (
              <>
                {used - NOTE_MAX} too many. Keep it to {NOTE_MAX}&nbsp;characters.
              </>
            ) : minLength && requiredMessage ? (
              <>
                {minLength} to {NOTE_MAX}&nbsp;characters.{' '}
                <span className="tabular-nums">
                  {used}&nbsp;of&nbsp;{NOTE_MAX}&nbsp;used.
                </span>
              </>
            ) : (
              <>Up to {NOTE_MAX}&nbsp;characters.</>
            )
          }
          // No maxLength: it would cut a pasted comment with no word. The count above says what to trim.
          render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={3} />}
        />
        {formError && <FormAlert message={formError} />}
      </form>
    </ResponsiveDialog>
  );
}
