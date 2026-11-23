import { useMemo } from 'react';
import { useWatch, type UseFormClearErrors, type UseFormSetValue } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NAME_LIMIT, type RepairFormControl, type RepairFormInput } from '../../lib/repairFormSchema';
import { useDriverSearch } from '../../hooks/useDriverSearch';
import { ListError } from './RepairFormParts';

interface DriverFieldProps {
  control: RepairFormControl;
  setValue: UseFormSetValue<RepairFormInput>;
  clearErrors: UseFormClearErrors<RepairFormInput>;
}

/**
 * The form's driver choice (spec 0016, AC-6 and AC-13): search existing drivers by name or
 * license, or open the Name and License number fields to add a new one in place.
 */
export function DriverField({ control, setValue, clearErrors }: DriverFieldProps) {
  const adding = useWatch({ control, name: 'addingDriver' });
  const driverId = useWatch({ control, name: 'driverId' });
  const driverLabel = useWatch({ control, name: 'driverLabel' });
  const { drivers, failed, retrying, retry, setQuery } = useDriverSearch();

  const options = useMemo<ComboboxOption[]>(() => {
    const rows = drivers.map((d) => ({ value: d.id, label: d.name, description: d.licenseNumber }));
    // Keep the picked driver visible even when the search no longer lists them
    if (driverId && !rows.some((row) => row.value === driverId)) rows.unshift({ value: driverId, label: driverLabel, description: undefined });
    return rows;
  }, [drivers, driverId, driverLabel]);

  const switchTo = (addingNew: boolean) => {
    setValue('addingDriver', addingNew, { shouldDirty: true });
    clearErrors(['driverId', 'newDriverName', 'newDriverLicense']);
    if (addingNew) {
      setValue('driverId', '', { shouldDirty: true });
      setValue('driverLabel', '', { shouldDirty: true });
    } else {
      setValue('newDriverName', '');
      setValue('newDriverLicense', '');
    }
  };

  if (adding) {
    return (
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormField
          control={control}
          name="newDriverName"
          label="Driver name"
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
