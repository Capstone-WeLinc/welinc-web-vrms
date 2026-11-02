import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { FormAlert } from '../../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../../components/shared/ResponsiveDialog';
import { PRIORITY_DOT } from '../../../../components/shared/priorityStyles';
import type { EditDetailsPayload } from '../../../../lib/api/repairApi';
import { getApiErrorMessage } from '../../../../lib/api/errors';
import { PRIORITY_OPTIONS } from '../../../../lib/repairOptions';
import type { RepairTicket } from '../../../../types';
import { guardedClose } from '../../hooks/useEditSession';
import { detailsDefaults, detailsPayload, detailsSchema, editNeedsReason, type DetailsFormValues } from '../../lib/ticketEdits';
import { EditReasonField } from './EditReasonField';

interface EditDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The ticket as the dialog opened (spec 0019, AC-22). */
  ticket: RepairTicket;
  /** Resolve once handled (the page closes the dialog); throw to show the message here. */
  onSave: (payload: EditDetailsPayload) => Promise<void>;
}

/** Spec 0019, AC-6 and AC-20: fix the Vehicle and driver block of a ticket. */
export function EditDetailsDialog({ open, onOpenChange, ticket, onSave }: EditDetailsDialogProps) {
  const formId = useId();
  const needsReason = editNeedsReason(ticket);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema(needsReason)),
    defaultValues: detailsDefaults(ticket),
  });

  const changeOpen = guardedClose(isDirty, isSubmitting, onOpenChange);

  const submit = async (values: DetailsFormValues) => {
    setFormError(null);
    const payload = detailsPayload(values, ticket, ticket.updatedAt);
    // Nothing changed: no request, the dialog just closes
    if (!payload) return onOpenChange(false);
    try {
      await onSave(payload);
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'That didn’t save. Try again.'));
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => void changeOpen(next)}
      title={`Edit ${ticket.repairNumber}`}
      description="Fix what was entered wrong. Every change is recorded in the ticket’s activity."
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" disabled={isSubmitting} onClick={() => void changeOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} size="touch" className="md:h-10 md:text-sm" loading={isSubmitting}>
            Save changes
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
        <FormField
          control={control}
          name="priority"
          label="Priority"
          required
          render={({ field, controlProps, labelId }) => (
            <ToggleGroup
              type="single"
              variant="outline"
              size="touch"
              id={controlProps.id}
              aria-labelledby={labelId}
              value={field.value}
              // Radix sends '' when the selected item is pressed again; priority is never empty
              onValueChange={(value) => value && field.onChange(value)}
              className="grid w-full grid-cols-2 sm:flex sm:w-fit"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  ref={option.value === field.value ? field.ref : undefined}
                  onBlur={field.onBlur}
                >
                  <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', PRIORITY_DOT[option.value])} />
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
        {needsReason && <EditReasonField control={control} />}
        {formError && <FormAlert message={formError} />}
      </form>
    </ResponsiveDialog>
  );
}
