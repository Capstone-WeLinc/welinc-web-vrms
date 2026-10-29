import type { UseFormClearErrors } from 'react-hook-form';
import { FormField } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PRIORITY_TOGGLE_ON } from '../../../../components/shared/priorityStyles';
import type { MechanicOption } from '../../../../lib/api/vrmsConfigApi';
import { PRIORITY_OPTIONS } from '../../../../lib/repairOptions';
import type { OptionList } from '../../hooks/useRepairFormOptions';
import type { RepairFormControl, RepairFormInput } from '../../lib/repairFormSchema';
import { MechanicPicker } from './MechanicPicker';
import { FormSection } from '../../../../components/shared/FormSection';

interface AssignmentSectionProps {
  control: RepairFormControl;
  mechanics: OptionList<MechanicOption>;
  clearErrors: UseFormClearErrors<RepairFormInput>;
}

export function AssignmentSection({ control, mechanics, clearErrors }: AssignmentSectionProps) {
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

      <MechanicPicker control={control} mechanics={mechanics} clearErrors={clearErrors} />

    </FormSection>
  );
}
