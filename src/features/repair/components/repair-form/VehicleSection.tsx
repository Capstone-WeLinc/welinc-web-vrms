import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DriverOption, GarageOption, VehicleOption } from '../../../../lib/api/vrmsConfigApi';
import type { OptionList } from '../../hooks/useRepairFormOptions';
import { sameName, UNDER_REPAIR_WARNING, type RepairFormControl } from '../../lib/repairFormSchema';
import { FieldRow, FieldSkeleton, FormSection, ListError } from './RepairFormParts';

interface VehicleSectionProps {
  control: RepairFormControl;
  vehicles: OptionList<VehicleOption>;
  drivers: OptionList<DriverOption>;
  garages: OptionList<GarageOption>;
}

export function VehicleSection({ control, vehicles, drivers, garages }: VehicleSectionProps) {
  const plate = useWatch({ control, name: 'vehiclePlate' });

  const vehicleOptions = useMemo<ComboboxOption[]>(
    () =>
      (vehicles.data ?? []).map((v) => ({
        value: v.plateNumber,
        label: v.plateNumber,
        description: v.model,
        keywords: [v.model],
        badge:
          v.status === 'UNDER_REPAIR' ? (
            <Badge variant="outline" className="border-highlight bg-highlight/15 text-foreground">
              Under repair
            </Badge>
          ) : undefined,
      })),
    [vehicles.data],
  );

  // Drivers are matched by name on the server, so the name is the value; the first of each name wins.
  const driverOptions = useMemo<ComboboxOption[]>(() => {
    const unique: ComboboxOption[] = [];
    for (const driver of drivers.data ?? []) {
      const name = driver.name.trim();
      if (name && !unique.some((option) => sameName(option.value, name))) unique.push({ value: name, label: name });
    }
    return unique;
  }, [drivers.data]);

  const underRepair = vehicles.data?.some((v) => v.plateNumber === plate && v.status === 'UNDER_REPAIR') ?? false;
  const noVehicles = vehicles.data?.length === 0;
  const noGarages = garages.data?.length === 0;

  return (
    <FormSection title="Vehicle">
      <FieldRow>
        <div className="flex flex-col gap-2">
          {vehicles.loading ? (
            <FieldSkeleton label="Vehicle" />
          ) : (
            <FormField
              control={control}
              name="vehiclePlate"
              label="Vehicle"
              required
              description={
                underRepair ? (
                  <span className="flex items-start gap-1.5 text-foreground">
                    <AlertTriangle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                    {UNDER_REPAIR_WARNING}
                  </span>
                ) : noVehicles ? (
                  'No vehicles are registered yet.'
                ) : undefined
              }
              render={({ field, controlProps }) => (
                <Combobox
                  {...controlProps}
                  ref={field.ref}
                  options={vehicleOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Choose a vehicle"
                  searchPlaceholder="Search by plate or model"
                  emptyText="No vehicle matches."
                />
              )}
            />
          )}
          {vehicles.failed && (
            <ListError message="Couldn’t load vehicles." retrying={vehicles.retrying} onRetry={vehicles.retry} />
          )}
        </div>

        <div className="flex flex-col gap-2">
          {drivers.loading ? (
            <FieldSkeleton label="Driver" />
          ) : (
            <FormField
              control={control}
              name="driverName"
              label="Driver"
              required
              description="New names are saved as unverified drivers."
              render={({ field, controlProps }) => (
                <Combobox
                  {...controlProps}
                  ref={field.ref}
                  options={driverOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  onCreate={field.onChange}
                  createLabel={(text) => `Add "${text}" as a new driver`}
                  placeholder="Choose or add a driver"
                  searchPlaceholder="Search or type a new name"
                  emptyText="No driver matches."
                />
              )}
            />
          )}
          {drivers.failed && (
            <ListError message="Couldn’t load drivers." retrying={drivers.retrying} onRetry={drivers.retry} />
          )}
        </div>

        <div className="flex flex-col gap-2">
          {garages.loading ? (
            <FieldSkeleton label="Garage location" />
          ) : (
            <FormField
              control={control}
              name="garageLocation"
              label="Garage location"
              required
              description={noGarages ? 'No garages are set up yet.' : undefined}
              render={({ field, controlProps }) => {
                const names = (garages.data ?? []).map((g) => g.name);
                // Keep a garage that dropped off the list visible, so its error has context (AC-20).
                const stale = field.value && !names.includes(field.value) ? field.value : null;
                return (
                  <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur} className="w-full">
                      <SelectValue placeholder="Choose a garage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stale && (
                        <SelectItem value={stale} disabled>
                          {stale}
                        </SelectItem>
                      )}
                      {(garages.data ?? []).map((g) => (
                        <SelectItem key={g.id} value={g.name}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
          )}
          {garages.failed && (
            <ListError message="Couldn’t load garages." retrying={garages.retrying} onRetry={garages.retry} />
          )}
        </div>

        <FormField
          control={control}
          name="odometerReading"
          label="Odometer reading"
          required
          render={({ field, controlProps }) => (
            <div className="relative">
              <Input
                {...field}
                {...controlProps}
                inputMode="numeric"
                autoComplete="off"
                placeholder="123456"
                className="pr-12"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
              >
                km
              </span>
            </div>
          )}
        />
      </FieldRow>
    </FormSection>
  );
}
