import type { UseFormClearErrors } from 'react-hook-form';
import { FormField } from '@/components/ui/field';
import { ChoiceChip, ChoiceChipGroup } from '@/components/ui/choice-chip';
import { cn } from '@/lib/utils';
import { PRIORITY_DOT } from '../../../../components/shared/priorityStyles';
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
          <ChoiceChipGroup
            id={controlProps.id}
            aria-labelledby={labelId}
            value={field.value}
            onValueChange={field.onChange}
            className="grid w-full grid-cols-2 sm:flex sm:w-fit"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.value}
                value={option.value}
                ref={option.value === field.value ? field.ref : undefined}
                onBlur={field.onBlur}
              >
                <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', PRIORITY_DOT[option.value])} />
                {option.label}
              </ChoiceChip>
            ))}
          </ChoiceChipGroup>
        )}
      />

      <MechanicPicker control={control} mechanics={mechanics} clearErrors={clearErrors} />

    </FormSection>
  );
}
