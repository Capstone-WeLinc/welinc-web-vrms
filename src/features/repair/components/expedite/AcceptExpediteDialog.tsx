import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { ChoiceChip, ChoiceChipGroup } from '@/components/ui/choice-chip';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FormAlert } from '../../../../components/shared/FormAlert';
import { PRIORITY_DOT } from '../../../../components/shared/priorityStyles';
import { ResponsiveDialog } from '../../../../components/shared/ResponsiveDialog';
import { getApiErrorMessage } from '../../../../lib/api/errors';
import { PRIORITY_OPTIONS } from '../../../../lib/repairOptions';
import type { ExpediteRequest, PriorityLevel } from '../../../../types';
import { guardedClose } from '../../hooks/useEditSession';
import {
  acceptExpediteSchema,
  stepUpPriority,
  toLocalInput,
  type AcceptExpediteValues,
} from '../../lib/expedite';

interface AcceptExpediteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ExpediteRequest;
  /** The ticket as the banner showed it: its priority, due date and version. */
  ticket: { priority: PriorityLevel; dueAt?: string | null };
  /** Resolve once saved (the dialog closes); throw to show the message here. */
  onSave: (values: AcceptExpediteValues) => Promise<void>;
}

/**
 * Spec 0029 (child 0003), AC-19: accept a BMS expedite request. Priority starts one step up
 * (Critical stays Critical); a new expected return date is optional and BMS hears it.
 */
export function AcceptExpediteDialog({ open, onOpenChange, request, ticket, onSave }: AcceptExpediteDialogProps) {
  const formId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm<AcceptExpediteValues>({
    resolver: zodResolver(acceptExpediteSchema),
    defaultValues: { priority: stepUpPriority(ticket.priority), dueAt: toLocalInput(ticket.dueAt) },
  });

  const changeOpen = guardedClose(isDirty, isSubmitting, onOpenChange);
  const submit = async (values: AcceptExpediteValues) => {
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
      title={`Expedite for ${request.jobOrderNumber}`}
      description="BMS is told the new priority, and the new date when you set one."
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-body" disabled={isSubmitting} onClick={() => void changeOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} size="touch" className="md:h-10 md:text-body" loading={isSubmitting}>
            Accept request
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
        {formError && <FormAlert message={formError} />}
        <blockquote className="border-l-2 border-border pl-3 text-body text-muted-strong break-words">{request.reason}</blockquote>
        <FormField
          control={control}
          name="priority"
          label="Priority"
          required
          render={({ field, controlProps, labelId }) => (
            <ChoiceChipGroup
              id={controlProps.id}
              aria-labelledby={labelId}
              value={field.value}
              onValueChange={field.onChange}
              className="grid w-full grid-cols-2 sm:flex sm:w-fit"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <ChoiceChip key={option.value} value={option.value} ref={option.value === field.value ? field.ref : undefined} onBlur={field.onBlur}>
                  <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', PRIORITY_DOT[option.value])} />
                  {option.label}
                </ChoiceChip>
              ))}
            </ChoiceChipGroup>
          )}
        />
        <FormField
          control={control}
          name="dueAt"
          label="Expected return"
          description={ticket.dueAt ? 'Leave it to keep the current date.' : 'Optional. Leave it empty to set no date.'}
          render={({ field, controlProps }) => <Input {...field} {...controlProps} type="datetime-local" className="w-full sm:w-fit" />}
        />
      </form>
    </ResponsiveDialog>
  );
}
