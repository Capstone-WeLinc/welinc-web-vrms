import { useEffect, useId, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { ChoiceChip, ChoiceChipGroup } from '@/components/ui/choice-chip';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormAlert } from '../../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../../components/shared/ResponsiveDialog';
import { getApiErrorMessage } from '../../../../lib/api/errors';
import { getAutomaticDueDate, type DueDatePreview } from '../../../../lib/api/repairApi';
import { dueDateTime } from '../../../../lib/utils/due';
import type { RepairTicket } from '../../../../types';
import { guardedClose } from '../../hooks/useEditSession';
import { dueDateSchema, hoursFromText, hoursLabel, type DueDateValues } from '../../lib/dueDateEdit';
import { toLocalInput } from '../../lib/expedite';
import { EDIT_REASON_MAX, EDIT_REASON_MIN } from '../../lib/ticketEdits';

interface DueDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The ticket as the dialog opened: its date, rule and version. */
  ticket: RepairTicket;
  /** Resolve once saved (the dialog closes); throw to show the message here. */
  onSave: (values: DueDateValues) => Promise<void>;
}

const SOURCE_TEXT = {
  PRIORITY: 'Set from the priority.',
  ISSUE_TYPE: 'Set from how long its issues usually take.',
  MANUAL: 'Set by hand.',
} as const;

/**
 * Spec 0030, AC-8 and AC-9: change a ticket's due date by hand with a reason, or, when it was set
 * by hand, put it back to the automatic date. The preview shows about the date a reset sets; the
 * server works it out again on save, and its value wins.
 */
export function DueDateDialog({ open, onOpenChange, ticket, onSave }: DueDateDialogProps) {
  const formId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const manual = ticket.dueAtSource === 'MANUAL';
  // The rule's "now" is the time the dialog opened; the server checks again with its own clock
  const [openedAt] = useState(() => Date.now());
  const resolver = useMemo(() => zodResolver(dueDateSchema(openedAt)), [openedAt]);
  const {
    control,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm<DueDateValues>({
    resolver,
    mode: 'onTouched',
    defaultValues: { mode: 'manual', dueAt: toLocalInput(ticket.dueAt), reason: '' },
  });
  const mode = useWatch({ control, name: 'mode' });

  // AC-9: the preview, only when there is a hand date to reset
  const [preview, setPreview] = useState<DueDatePreview | null>(null);
  const [previewError, setPreviewError] = useState(false);
  useEffect(() => {
    if (!manual) return;
    let cancelled = false;
    getAutomaticDueDate(ticket.id).then(
      (value) => !cancelled && setPreview(value),
      () => !cancelled && setPreviewError(true),
    );
    return () => {
      cancelled = true;
    };
  }, [manual, ticket.id]);

  const changeOpen = guardedClose(isDirty, isSubmitting, onOpenChange);
  const submit = async (values: DueDateValues) => {
    setFormError(null);
    try {
      await onSave(values);
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'That didn’t save. Try again.'));
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => void changeOpen(next)}
      title="Change due date"
      description={
        ticket.dueAt
          ? `Now due ${dueDateTime(ticket.dueAt, openedAt)}. ${ticket.dueAtSource ? SOURCE_TEXT[ticket.dueAtSource] : ''}`
          : undefined
      }
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-body" disabled={isSubmitting} onClick={() => void changeOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} size="touch" className="md:h-10 md:text-body" loading={isSubmitting}>
            {mode === 'automatic' ? 'Use automatic date' : 'Save date'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
        {formError && <FormAlert message={formError} />}
        {manual && (
          <FormField
            control={control}
            name="mode"
            label="Due date"
            render={({ field, controlProps, labelId }) => (
              <ChoiceChipGroup id={controlProps.id} aria-labelledby={labelId} value={field.value} onValueChange={field.onChange} className="w-full sm:w-fit">
                <ChoiceChip value="manual" ref={field.value === 'manual' ? field.ref : undefined} onBlur={field.onBlur}>
                  Set a date
                </ChoiceChip>
                <ChoiceChip value="automatic" ref={field.value === 'automatic' ? field.ref : undefined} onBlur={field.onBlur}>
                  Use the automatic date
                </ChoiceChip>
              </ChoiceChipGroup>
            )}
          />
        )}
        {mode === 'manual' ? (
          <FormField
            control={control}
            name="dueAt"
            label="New due date"
            required
            description="Later than now and at most 90 days away. BMS is told the new date."
            render={({ field, controlProps }) => <Input {...field} {...controlProps} type="datetime-local" className="w-full sm:w-fit" />}
          />
        ) : (
          <AutomaticPreview preview={preview} failed={previewError} now={openedAt} />
        )}
        <FormField
          control={control}
          name="reason"
          label="Reason for the change"
          required
          description={`It goes in the ticket’s history and to BMS. ${EDIT_REASON_MIN} to ${EDIT_REASON_MAX} characters.`}
          render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={2} maxLength={EDIT_REASON_MAX} />}
        />
      </form>
    </ResponsiveDialog>
  );
}

function AutomaticPreview({ preview, failed, now }: { preview: DueDatePreview | null; failed: boolean; now: number }) {
  if (failed) return <p className="text-body text-muted-foreground">The automatic date couldn’t load. You can still save; it is worked out when you do.</p>;
  if (!preview) return <p className="text-body text-muted-foreground">Working out the automatic date…</p>;
  const counted = preview.issues.filter((issue) => issue.hours > 0);
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3 text-body">
      <p>
        About <span className="font-medium">{dueDateTime(preview.dueAt, now)}</span>
      </p>
      <p className="text-caption text-muted-foreground">
        {preview.escalated
          ? `Its usual time has passed, so it is due ${hoursLabel(preview.priorityHours)} from now.`
          : preview.source === 'ISSUE_TYPE'
            ? `From its issues: ${hoursLabel(preview.issueHours)} of work.`
            : `From its priority: ${hoursLabel(preview.priorityHours)}.`}
      </p>
      {!preview.escalated && preview.source === 'ISSUE_TYPE' && counted.length > 0 && (
        <ul className="flex flex-col gap-1 text-caption text-muted-foreground">
          {counted.map((issue) => (
            <li key={issue.id} className="break-words">
              {hoursLabel(issue.hours)}, {hoursFromText(issue.from)}: {issue.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
