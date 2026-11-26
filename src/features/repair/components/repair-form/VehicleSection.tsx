import { useMemo } from 'react';
import { type UseFormClearErrors, type UseFormSetValue } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GarageOption, VehicleOption } from '../../../../lib/api/vrmsConfigApi';
import type { OptionList } from '../../hooks/useRepairFormOptions';
import { type RepairFormControl, type RepairFormInput } from '../../lib/repairFormSchema';
import { FieldRow, FormSection } from '../../../../components/shared/FormSection';
import type { VehicleSummaryState } from '../../hooks/useVehicleSummary';
import { DriverField } from './DriverField';
import { VehicleCard } from './VehicleCard';
import { FieldSkeleton, ListError } from './RepairFormParts';

interface VehicleSectionProps {
  control: RepairFormControl;
  vehicles: OptionList<VehicleOption>;
  garages: OptionList<GarageOption>;
  setValue: UseFormSetValue<RepairFormInput>;
  clearErrors: UseFormClearErrors<RepairFormInput>;
  summary: VehicleSummaryState;
  /** Spec 0029, AC-8: opened from a VMMS referral, so the driver may stay empty. */
  driverOptional?: boolean;
}

// Spec 0029, AC-5: the trucks come from VMMS, so a missing one is VMMS's to add
const NOT_IN_VMMS = 'Not in VMMS yet. Ask VMMS Operations to add it.';

export function VehicleSection({ control, vehicles, garages, setValue, clearErrors, summary, driverOptional }: VehicleSectionProps) {

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
          ) : v.status === 'UNDER_MAINTENANCE' ? (
            // Spec 0029, AC-5: shown, never blocking
            <StatusBadge status={v.status} />
          ) : undefined,
      })),
    [vehicles.data],
  );

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
              description={noVehicles ? NOT_IN_VMMS : undefined}
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
                  emptyText={NOT_IN_VMMS}
                />
              )}
            />
          )}
          {vehicles.failed && (
            <ListError message="Couldn’t load vehicles." retrying={vehicles.retrying} onRetry={vehicles.retry} />
          )}
        </div>

        <VehicleCard state={summary} />

        <DriverField control={control} setValue={setValue} clearErrors={clearErrors} optional={driverOptional} />

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
          description={summary.summary && summary.summary.lastOdometer > 0 ? `Last reading ${summary.summary.lastOdometer.toLocaleString('en-US')} km` : undefined}
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
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-body text-muted-foreground"
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
