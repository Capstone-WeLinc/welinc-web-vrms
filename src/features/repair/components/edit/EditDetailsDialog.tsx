import { useEffect, useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { Callout } from '../../../../components/shared/Callout';
import { FormAlert } from '../../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../../components/shared/ResponsiveDialog';
import { PRIORITY_DOT } from '../../../../components/shared/priorityStyles';
import type { EditDetailsPayload } from '../../../../lib/api/repairApi';
import { getApiErrorMessage, getDriverExists, getOdometerProblem } from '../../../../lib/api/errors';
import { getLookup, type LookupOption } from '../../../../lib/api/vrmsConfigApi';
import { ACCOUNT_TYPE_OPTIONS, PRIORITY_OPTIONS } from '../../../../lib/repairOptions';
import type { RepairTicket } from '../../../../types';
import { guardedClose } from '../../hooks/useEditSession';
import {
  detailsDefaults,
  detailsPayload,
  detailsSchema,
  editNeedsReason,
  openedCorporationId,
  type DetailsFormValues,
} from '../../lib/ticketEdits';
import { DetailsDriverField } from './DetailsDriverField';
import { EditReasonField } from './EditReasonField';

interface EditDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The ticket as the dialog opened (spec 0019, AC-22). */
  ticket: RepairTicket;
  /** Resolve once handled (the page closes the dialog); throw to show the message here. */
  onSave: (payload: EditDetailsPayload) => Promise<void>;
}

/** Spec 0019, AC-4 to AC-7 and AC-20: fix the Vehicle and driver block of a ticket. */
export function EditDetailsDialog({ open, onOpenChange, ticket, onSave }: EditDetailsDialogProps) {
  const formId = useId();
  const needsReason = editNeedsReason(ticket);
  const [formError, setFormError] = useState<string | null>(null);
  const [existingDriver, setExistingDriver] = useState<{ id: string; name: string } | null>(null);
  // The server's jump warning and the reading it was about; saving that reading again confirms it
  const [jump, setJump] = useState<{ message: string; reading: string } | null>(null);
  const [corporations, setCorporations] = useState<LookupOption[] | null>(null);
  const [corporationsFailed, setCorporationsFailed] = useState(false);
  const [openedCorporation, setOpenedCorporation] = useState('');
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    resetField,
    formState: { isDirty, isSubmitting },
  } = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema(needsReason, ticket.accountType ?? '')),
    defaultValues: detailsDefaults(ticket),
  });
  const accountType = useWatch({ control, name: 'accountType' });
  const odometer = useWatch({ control, name: 'odometer' });
  const jumpConfirmed = jump !== null && odometer.trim() === jump.reading;

  // The active corporations; the ticket's stored name picks the opened one, without dirtying the form
  useEffect(() => {
    let cancelled = false;
    getLookup('corporation')
      .then((rows) => {
        if (cancelled) return;
        setCorporations(rows);
        const id = openedCorporationId(ticket, rows);
        setOpenedCorporation(id);
        if (id) resetField('corporationId', { defaultValue: id });
      })
      .catch(() => {
        if (cancelled) return;
        setCorporations([]);
        setCorporationsFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ticket, resetField]);

  const changeOpen = guardedClose(isDirty, isSubmitting, onOpenChange);

  const pickExistingDriver = (driver: { id: string; name: string }) => {
    setValue('addingDriver', false, { shouldDirty: true });
    setValue('driverId', driver.id, { shouldDirty: true });
    setValue('driverLabel', driver.name);
    setValue('newDriverName', '');
    setValue('newDriverLicense', '');
    clearErrors(['driverId', 'newDriverName', 'newDriverLicense']);
    setExistingDriver(null);
  };

  const submit = async (values: DetailsFormValues) => {
    setFormError(null);
    setExistingDriver(null);
    const opened = { ...detailsDefaults(ticket), corporationId: openedCorporation };
    const payload = detailsPayload(values, opened, ticket, ticket.updatedAt, jumpConfirmed);
    // Nothing changed: no request, the dialog just closes (AC-8b)
    if (!payload) return onOpenChange(false);
    try {
      await onSave(payload);
    } catch (err) {
      const problem = getOdometerProblem(err);
      if (problem?.code === 'ODOMETER_JUMP_UNCONFIRMED') {
        setJump({ message: problem.message, reading: values.odometer.trim() });
        return;
      }
      if (problem) {
        setError('odometer', { type: 'server', message: problem.message }, { shouldFocus: true });
        return;
      }
      const driver = getDriverExists(err);
      if (driver) {
        setExistingDriver(driver);
        setError('newDriverLicense', { type: 'server', message: `A driver with this license exists: ${driver.name}.` });
        return;
      }
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
            {jumpConfirmed ? 'Confirm and save' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
        <DetailsDriverField control={control} setValue={setValue} clearErrors={clearErrors} />
        {existingDriver && (
          <Callout tone="warning">
            <p>A driver with this license exists: {existingDriver.name}.</p>
            <Button type="button" variant="link" className="h-auto min-h-11 px-0 md:min-h-0" onClick={() => pickExistingDriver(existingDriver)}>
              Use {existingDriver.name}
            </Button>
          </Callout>
        )}

        <FormField
          control={control}
          name="odometer"
          label="Odometer (km)"
          required
          description="It must sit between the readings on this truck’s earlier and later tickets."
          render={({ field, controlProps }) => (
            <Input {...field} {...controlProps} inputMode="numeric" autoComplete="off" className="h-11 text-base tabular-nums md:h-10 md:text-sm" />
          )}
        />
        {jumpConfirmed && (
          <Callout tone="warning">
            <p>{jump.message}</p>
            <p>Save again to confirm the reading.</p>
          </Callout>
        )}

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

        <FormField
          control={control}
          name="accountType"
          label="Account type"
          render={({ field, controlProps, labelId }) => (
            <ToggleGroup
              type="single"
              variant="outline"
              size="touch"
              id={controlProps.id}
              aria-labelledby={labelId}
              value={field.value}
              onValueChange={(value) => {
                if (!value) return;
                field.onChange(value);
                // Online clears the corporation (AC-7)
                if (value === 'ONLINE') clearErrors('corporationId');
              }}
              className="grid w-full grid-cols-2 sm:flex sm:w-fit"
            >
              {ACCOUNT_TYPE_OPTIONS.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  ref={option.value === field.value ? field.ref : undefined}
                  onBlur={field.onBlur}
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
        {accountType === 'CORPORATE' && (
          <FormField
            control={control}
            name="corporationId"
            label="Corporation"
            required
            description={
              corporationsFailed
                ? 'Couldn’t load corporations. Close and open this again to retry.'
                : ticket.corporation && !openedCorporation && corporations
                  ? `Stored as ${ticket.corporation}, which is no longer in the list. It stays unless you pick another.`
                  : undefined
            }
            render={({ field, controlProps }) => (
              <Select name={field.name} value={field.value} onValueChange={field.onChange} disabled={corporations === null}>
                <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur} className="w-full">
                  <SelectValue placeholder={corporations === null ? 'Loading corporations' : 'Choose a corporation'} />
                </SelectTrigger>
                <SelectContent>
                  {(corporations ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}

        {needsReason && <EditReasonField control={control} />}
        {formError && <FormAlert message={formError} />}
      </form>
    </ResponsiveDialog>
  );
}
