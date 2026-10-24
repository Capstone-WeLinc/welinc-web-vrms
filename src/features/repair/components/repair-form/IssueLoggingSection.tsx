import { useFieldArray, useWatch, type ControllerRenderProps } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldDescription, FormField } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getRepairFormOptions } from '../../../../lib/repairOptions';
import {
  DESCRIPTION_LIMIT,
  DESCRIPTION_WARN_AT,
  emptyIssue,
  MAX_ISSUES,
  type RepairFormControl,
} from '../../lib/repairFormSchema';
import { FieldRow, FormSection } from './RepairFormParts';

type SelectRenderProps = {
  field: Pick<ControllerRenderProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'>;
  controlProps: React.ComponentProps<'button'>;
};

/** A FormField render for a Select over a fixed list. A render function, so field.ref stays out of component props. */
function optionSelect(options: readonly string[], placeholder: string) {
  return function renderOptionSelect({ field, controlProps }: SelectRenderProps) {
    return (
      <Select name={field.name} value={field.value} onValueChange={field.onChange}>
        <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };
}

function IssueCard({
  control,
  index,
  canRemove,
  onRemove,
}: {
  control: RepairFormControl;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const { vehicleSystems, rootCauses } = getRepairFormOptions();
  const description = useWatch({ control, name: `issues.${index}.description` });
  const length = description?.length ?? 0;
  const number = index + 1;

  return (
    <li className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Issue {number}</h3>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 text-muted-foreground hover:text-destructive md:size-9"
            aria-label={`Remove issue ${number}`}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        )}
      </div>
      <FieldRow>
        <FormField
          control={control}
          name={`issues.${index}.vehicleSystem`}
          label="Vehicle system"
          required
          render={optionSelect(vehicleSystems, 'Choose a system')}
        />
        <FormField
          control={control}
          name={`issues.${index}.rootCause`}
          label="Root cause"
          required
          render={optionSelect(rootCauses, 'Choose a root cause')}
        />
      </FieldRow>
      <div className="flex flex-col gap-1.5">
        <FormField
          control={control}
          name={`issues.${index}.description`}
          label="Description"
          required
          render={({ field, controlProps }) => (
            <Textarea {...field} {...controlProps} rows={4} placeholder="What is wrong, and what the driver reported" />
          )}
        />
        <p
          className={cn(
            'self-end text-xs tabular-nums',
            length > DESCRIPTION_WARN_AT ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {length} / {DESCRIPTION_LIMIT}
        </p>
      </div>
    </li>
  );
}

export function IssueLoggingSection({ control }: { control: RepairFormControl }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'issues' });
  const atLimit = fields.length >= MAX_ISSUES;

  return (
    <FormSection title="Issues">
      <ol className="flex flex-col gap-4">
        {fields.map((item, index) => (
          <IssueCard
            key={item.id}
            control={control}
            index={index}
            canRemove={fields.length > 1}
            onRemove={() => remove(index)}
          />
        ))}
      </ol>
      <div className="flex flex-col items-start gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="touch"
          className="md:h-10 md:text-sm"
          disabled={atLimit}
          aria-describedby="issues-limit"
          onClick={() =>
            append(emptyIssue(), { shouldFocus: true, focusName: `issues.${fields.length}.vehicleSystem` })
          }
        >
          <Plus aria-hidden="true" />
          Add issue
        </Button>
        <FieldDescription id="issues-limit">Up to 10 issues per ticket.</FieldDescription>
      </div>
    </FormSection>
  );
}
