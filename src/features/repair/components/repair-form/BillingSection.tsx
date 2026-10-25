import { useWatch, type UseFormClearErrors, type UseFormSetValue } from 'react-hook-form';
import { FormField } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ACCOUNT_TYPE_OPTIONS, getRepairFormOptions } from '../../../../lib/repairOptions';
import type { RepairFormControl, RepairFormInput } from '../../lib/repairFormSchema';
import { FormSection } from '../../../../components/shared/FormSection';

interface BillingSectionProps {
  control: RepairFormControl;
  setValue: UseFormSetValue<RepairFormInput>;
  clearErrors: UseFormClearErrors<RepairFormInput>;
}

export function BillingSection({ control, setValue, clearErrors }: BillingSectionProps) {
  const { corporations } = getRepairFormOptions();
  const accountType = useWatch({ control, name: 'accountType' });

  return (
    <FormSection title="Billing">
      {/* Stacked, since this section sits in the narrow column from 1280px. */}
      <div className="flex flex-col gap-5">
        <FormField
          control={control}
          name="accountType"
          label="Account type"
          required
          render={({ field, controlProps, labelId }) => (
            <ToggleGroup
              type="single"
              variant="outline"
              size="touch"
              id={controlProps.id}
              aria-labelledby={labelId}
              value={field.value}
              onValueChange={(value) => {
                // Never empty (AC-12); Online hides Corporation and clears it.
                if (!value) return;
                field.onChange(value);
                if (value === 'ONLINE') {
                  setValue('corporation', '');
                  clearErrors('corporation');
                }
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
            name="corporation"
            label="Corporation"
            required
            render={({ field, controlProps }) => (
              <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur} className="w-full">
                  <SelectValue placeholder="Choose a corporation" />
                </SelectTrigger>
                <SelectContent>
                  {corporations.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </div>
    </FormSection>
  );
}
