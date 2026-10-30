import { useFieldArray, useWatch, type ControllerRenderProps, type UseFormGetValues, type UseFormSetValue } from 'react-hook-form';
import { Info, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { FieldDescription, FormField } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FieldRow, FormSection } from '../../../../components/shared/FormSection';
import type { EntryOption, IssueCategory, RepairPriority } from '../../../../lib/api/knowledgeApi';
import { getRepairFormOptions } from '../../../../lib/repairOptions';
import { formatHours, formatPeso } from '../../../../lib/utils/format';
import type { OptionList } from '../../hooks/useRepairFormOptions';
import {
  DESCRIPTION_LIMIT,
  DESCRIPTION_WARN_AT,
  emptyIssue,
  MAX_ISSUES,
  OTHER_ISSUE,
  type RepairFormControl,
  type RepairFormInput,
} from '../../lib/repairFormSchema';
import { FieldSkeleton, ListError } from './RepairFormParts';
import { useModuleOn } from '../../../../lib/permissions/usePermissions';

type SelectRenderProps = {
  field: Pick<ControllerRenderProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'>;
  controlProps: React.ComponentProps<'button'>;
};

/** A FormField render for a Select over a list. A render function, so field.ref stays out of component props. */
function optionSelect(options: readonly { value: string; label: string }[], placeholder: string) {
  return function renderOptionSelect({ field, controlProps }: SelectRenderProps) {
    return (
      <Select name={field.name} value={field.value} onValueChange={field.onChange}>
        <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };
}

const PRIORITY_ORDER: RepairPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const OTHER_OPTION: ComboboxOption = { value: OTHER_ISSUE, label: 'Other (describe it yourself)' };

/** Grouped by category in category order, most seen first inside each group (AC-24). */
function entryOptions(entries: EntryOption[], categories: IssueCategory[]): ComboboxOption[] {
  const rank = new Map(categories.map((c, index) => [c.id, index]));
  return [...entries]
    .sort((a, b) => (rank.get(a.categoryId) ?? 999) - (rank.get(b.categoryId) ?? 999) || b.seenCount - a.seenCount)
    .map((entry) => ({
      value: entry.id,
      label: entry.name,
      description: `Seen ${entry.seenCount}×`,
      keywords: [entry.symptoms],
      group: entry.categoryName,
    }));
}

/** "Usually 2 h of work · about ₱3,450" (AC-25); the estimate stands in until there is a median. */
function estimateLine(entry: EntryOption) {
  const hours = entry.typicalHours ?? entry.estimatedHours;
  const parts = hours != null ? [`Usually ${formatHours(hours)} of work`] : [];
  if (entry.typicalCost != null) parts.push(`about ${formatPeso(entry.typicalCost)}`);
  return parts.join(' · ');
}

interface IssueCardProps {
  control: RepairFormControl;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  categories: OptionList<IssueCategory>;
  entries: OptionList<EntryOption>;
  setValue: UseFormSetValue<RepairFormInput>;
  getValues: UseFormGetValues<RepairFormInput>;
}

function IssueCard({ control, index, canRemove, onRemove, categories, entries, setValue, getValues }: IssueCardProps) {
  const { rootCauses } = getRepairFormOptions();
  const [description, entryId] = useWatch({ control, name: [`issues.${index}.description`, `issues.${index}.knowledgeEntryId`] });
  const length = description?.length ?? 0;
  const number = index + 1;
  const activeCategories = categories.data ?? [];
  const picked = entries.data?.find((e) => e.id === entryId);
  const template = picked?.descriptionTemplate ?? null;
  const canUseTemplate = !!template && description.trim() !== '' && description !== template;
  // Spec 0012, AC-15: the picker and its auto fill hide while the knowledge base is off
  const knowledgeOn = useModuleOn('knowledge');

  /** AC-25: picking an entry fills what it can, and never lowers the priority. */
  const pick = (value: string) => {
    const entry = entries.data?.find((e) => e.id === value);
    setValue(`issues.${index}.knowledgeEntryId`, value, { shouldDirty: true });
    if (!entry) return; // Other: the link clears, everything else stays as it is.
    if (activeCategories.some((c) => c.id === entry.categoryId)) {
      setValue(`issues.${index}.categoryId`, entry.categoryId, { shouldDirty: true, shouldValidate: true });
    }
    if (!getValues(`issues.${index}.description`).trim() && entry.descriptionTemplate) {
      setValue(`issues.${index}.description`, entry.descriptionTemplate.slice(0, DESCRIPTION_LIMIT), { shouldDirty: true, shouldValidate: true });
    }
    const current = getValues('priority');
    if (PRIORITY_ORDER.indexOf(entry.suggestedPriority) > PRIORITY_ORDER.indexOf(current)) {
      setValue('priority', entry.suggestedPriority, { shouldDirty: true });
    }
  };

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

      {knowledgeOn && (
        <div className="flex flex-col gap-2">
          {entries.loading ? (
            <FieldSkeleton label="Common issue" />
          ) : (
            <FormField
              control={control}
              name={`issues.${index}.knowledgeEntryId`}
              label="Common issue"
              description="Pick a known problem to fill in this issue, or choose Other."
              render={({ field, controlProps }) => (
                <Combobox
                  {...controlProps}
                  ref={field.ref}
                  options={entryOptions(entries.data ?? [], activeCategories)}
                  pinnedOption={OTHER_OPTION}
                  value={field.value}
                  onValueChange={pick}
                  onBlur={field.onBlur}
                  placeholder="Choose a common issue"
                  searchPlaceholder="Search by name or symptom"
                  emptyText="No common issue matches."
                />
              )}
            />
          )}
          {entries.failed && <ListError message="Couldn’t load common issues." retrying={entries.retrying} onRetry={entries.retry} />}
          {picked && estimateLine(picked) && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground tabular-nums">
              <Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
              {estimateLine(picked)}
            </p>
          )}
        </div>
      )}

      <FieldRow>
        <div className="flex flex-col gap-2">
          {categories.loading ? (
            <FieldSkeleton label="Vehicle system" />
          ) : (
            <FormField
              control={control}
              name={`issues.${index}.categoryId`}
              label="Vehicle system"
              required
              render={optionSelect(
                activeCategories.map((c) => ({ value: c.id, label: c.name })),
                'Choose a system',
              )}
            />
          )}
          {categories.failed && (
            <ListError message="Couldn’t load systems." retrying={categories.retrying} onRetry={categories.retry} />
          )}
        </div>
        <FormField
          control={control}
          name={`issues.${index}.rootCause`}
          label="Root cause"
          required
          render={optionSelect(
            rootCauses.map((cause) => ({ value: cause, label: cause })),
            'Choose a root cause',
          )}
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
        <div className="flex items-center justify-between gap-2">
          {canUseTemplate ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto min-h-11 px-0 md:min-h-0"
              onClick={() =>
                setValue(`issues.${index}.description`, template.slice(0, DESCRIPTION_LIMIT), { shouldDirty: true, shouldValidate: true })
              }
            >
              Use template
            </Button>
          ) : (
            <span />
          )}
          <p className={cn('text-xs tabular-nums', length > DESCRIPTION_WARN_AT ? 'text-destructive' : 'text-muted-foreground')}>
            {length} / {DESCRIPTION_LIMIT}
          </p>
        </div>
      </div>
    </li>
  );
}

interface IssueLoggingSectionProps {
  control: RepairFormControl;
  categories: OptionList<IssueCategory>;
  entries: OptionList<EntryOption>;
  setValue: UseFormSetValue<RepairFormInput>;
  getValues: UseFormGetValues<RepairFormInput>;
}

export function IssueLoggingSection({ control, categories, entries, setValue, getValues }: IssueLoggingSectionProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'issues' });
  const atLimit = fields.length >= MAX_ISSUES;
  const firstField = useModuleOn('knowledge') ? 'knowledgeEntryId' : 'categoryId';

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
            categories={categories}
            entries={entries}
            setValue={setValue}
            getValues={getValues}
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
          onClick={() => append(emptyIssue(), { shouldFocus: true, focusName: `issues.${fields.length}.${firstField}` })}
        >
          <Plus aria-hidden="true" />
          Add issue
        </Button>
        <FieldDescription id="issues-limit">Up to 10 issues per ticket.</FieldDescription>
      </div>
    </FormSection>
  );
}
