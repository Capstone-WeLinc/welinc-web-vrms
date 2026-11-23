import { useMemo } from 'react';
import { useWatch, type Control, type UseFormClearErrors, type UseFormSetValue } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useDriverSearch } from '../../hooks/useDriverSearch';
import { NAME_LIMIT } from '../../lib/repairFormSchema';
import type { DetailsFormValues } from '../../lib/ticketEdits';
import { ListError } from '../repair-form/RepairFormParts';

interface DetailsDriverFieldProps {
  control: Control<DetailsFormValues>;
  setValue: UseFormSetValue<DetailsFormValues>;
  clearErrors: UseFormClearErrors<DetailsFormValues>;
}

/**
 * Spec 0019, AC-4: swap the driver for an existing one, or add a new one by LTO license with the
 * create form's rules (spec 0016, AC-6). The driver record itself is never renamed here.
 */
export function DetailsDriverField({ control, setValue, clearErrors }: DetailsDriverFieldProps) {
  const adding = useWatch({ control, name: 'addingDriver' });
  const driverId = useWatch({ control, name: 'driverId' });
  const driverLabel = useWatch({ control, name: 'driverLabel' });
  const { drivers, failed, retrying, retry, setQuery } = useDriverSearch();

  const options = useMemo<ComboboxOption[]>(() => {
    const rows = drivers.map((d) => ({ value: d.id, label: d.name, description: d.licenseNumber }));
    // Keep the ticket's driver visible even when the search does not list them
    if (driverId && !rows.some((row) => row.value === driverId)) rows.unshift({ value: driverId, label: driverLabel, description: undefined });
    return rows;
  }, [drivers, driverId, driverLabel]);

  const switchTo = (addingNew: boolean) => {
    setValue('addingDriver', addingNew, { shouldDirty: true });
    clearErrors(['driverId', 'newDriverName', 'newDriverLicense']);
    if (!addingNew) {
      setValue('newDriverName', '');
      setValue('newDriverLicense', '');
    }
  };

  if (adding) {
    return (
      <div className="flex flex-col gap-3">
        <FormField
          control={control}
          name="newDriverName"
          label="New driver’s name"
          required
          render={({ field, controlProps }) => (
            <Input {...field} {...controlProps} maxLength={NAME_LIMIT} autoComplete="off" className="h-11 text-base-input md:h-10 md:text-body" />
          )}
        />
        <FormField
          control={control}
          name="newDriverLicense"
          label="License number"
          required
          description="LTO format, for example A01-23-456789."
          render={({ field, controlProps }) => (
            <Input
              {...field}
              {...controlProps}
              onChange={(event) => field.onChange(event.target.value.toUpperCase())}
              autoComplete="off"
              placeholder="A01-23-456789"
              className="h-11 text-base-input md:h-10 md:text-body"
            />
          )}
        />
        <Button type="button" variant="link" size="sm" className="h-auto min-h-11 self-start px-0 md:min-h-0" onClick={() => switchTo(false)}>
          Choose an existing driver
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FormField
        control={control}
        name="driverId"
        label="Driver"
        required
        render={({ field, controlProps }) => (
          <Combobox
            {...controlProps}
            ref={field.ref}
            options={options}
            value={field.value}
            onValueChange={(id) => {
              field.onChange(id);
              setValue('driverLabel', options.find((o) => o.value === id)?.label ?? '');
            }}
            onBlur={field.onBlur}
            onSearchChange={setQuery}
            serverFiltered
            placeholder="Choose a driver"
            searchPlaceholder="Search by name or license"
            emptyText="No driver matches."
          />
        )}
      />
      {failed && <ListError message="Couldn’t load drivers." retrying={retrying} onRetry={retry} />}
      <Button type="button" variant="link" size="sm" className="h-auto min-h-11 self-start px-0 md:min-h-0" onClick={() => switchTo(true)}>
        Add new driver
      </Button>
    </div>
  );
}
