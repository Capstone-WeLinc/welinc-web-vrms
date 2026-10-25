import { useWatch, type UseFormClearErrors, type UseFormSetError, type UseFormSetValue } from 'react-hook-form';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PRIORITY_TOGGLE_ON } from '../../../../components/shared/priorityStyles';
import type { MechanicOption } from '../../../../lib/api/vrmsConfigApi';
import { getRepairFormOptions, PRIORITY_OPTIONS } from '../../../../lib/repairOptions';
import type { OptionList } from '../../hooks/useRepairFormOptions';
import { OTHER_SHOP, type RepairFormControl, type RepairFormInput } from '../../lib/repairFormSchema';
import { MechanicPicker } from './MechanicPicker';
import { FormSection } from '../../../../components/shared/FormSection';

interface AssignmentSectionProps {
  control: RepairFormControl;
  mechanics: OptionList<MechanicOption>;
  setValue: UseFormSetValue<RepairFormInput>;
  setError: UseFormSetError<RepairFormInput>;
  clearErrors: UseFormClearErrors<RepairFormInput>;
}

export function AssignmentSection({ control, mechanics, setValue, setError, clearErrors }: AssignmentSectionProps) {
  const { shops } = getRepairFormOptions();
  const shopChoice = useWatch({ control, name: 'shopChoice' });

  return (
    <FormSection title="Priority and assignment">
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
            // Radix sends '' when the selected item is pressed again; priority is never empty (AC-9).
            onValueChange={(value) => value && field.onChange(value)}
            className="grid w-full grid-cols-2 sm:flex sm:w-fit"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                ref={option.value === field.value ? field.ref : undefined}
                onBlur={field.onBlur}
                className={PRIORITY_TOGGLE_ON[option.value]}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      />

      <MechanicPicker control={control} mechanics={mechanics} setError={setError} clearErrors={clearErrors} />

      {/* Stacked, since this section sits in the narrow column from 1280px. */}
      <div className="flex flex-col gap-5">
        <FormField
          control={control}
          name="shopChoice"
          label="Repair shop"
          required
          render={({ field, controlProps }) => (
            <Select
              name={field.name}
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                // A listed shop hides Shop name and drops what was typed there (AC-11).
                if (value !== OTHER_SHOP) {
                  setValue('otherShopName', '');
                  clearErrors('otherShopName');
                }
              }}
            >
              <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur} className="w-full">
                <SelectValue placeholder="Choose a repair shop" />
              </SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (
                  <SelectItem key={shop} value={shop}>
                    {shop}
                  </SelectItem>
                ))}
                <SelectItem value={OTHER_SHOP}>Other</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {shopChoice === OTHER_SHOP && (
          <FormField
            control={control}
            name="otherShopName"
            label="Shop name"
            required
            render={({ field, controlProps }) => <Input {...field} {...controlProps} autoComplete="off" />}
          />
        )}
      </div>
    </FormSection>
  );
}
