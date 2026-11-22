import { Controller, useFieldArray, useFormState, useWatch } from 'react-hook-form';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChoiceChip, ChoiceChipGroup } from '@/components/ui/choice-chip';
import { cn } from '@/lib/utils';
import { FieldRow, FormSection } from '../../../components/shared/FormSection';
import { PRIORITY_DOT } from '../../../components/shared/priorityStyles';
import type { IssueCategory } from '../../../lib/api/knowledgeApi';
import { PRIORITY_OPTIONS } from '../../../lib/repairOptions';
import {
  MAX_PARTS,
  MAX_STEPS,
  NAME_LIMIT,
  PART_LIMIT,
  SAFETY_LIMIT,
  STEP_LIMIT,
  SYMPTOMS_LIMIT,
  TEMPLATE_LIMIT,
  type EntryFormControl,
} from '../lib/entryFormSchema';

type TextName = 'symptoms' | 'descriptionTemplate' | 'safetyNotes';

/** "123 / 1000", red once over the limit. */
function CharCount({ control, name, limit }: { control: EntryFormControl; name: TextName; limit: number }) {
  const value = useWatch({ control, name }) ?? '';
  return (
    <p className={cn('-mt-3 self-end text-xs tabular-nums', value.length > limit ? 'text-destructive' : 'text-muted-foreground')}>
      {value.length} / {limit}
    </p>
  );
}

export function BasicsSection({ control, categories }: { control: EntryFormControl; categories: IssueCategory[] }) {
  return (
    <FormSection title="Basics">
      <FormField
        control={control}
        name="name"
        label="Name"
        required
        description="What a mechanic would call it, like 'Brake pads worn'."
        render={({ field, controlProps }) => <Input {...field} {...controlProps} maxLength={NAME_LIMIT} className="h-11 text-base md:h-10 md:text-sm" />}
      />
      <FieldRow>
        <FormField
          control={control}
          name="categoryId"
          label="Category"
          required
          render={({ field, controlProps }) => (
            <Select name={field.name} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur} className="h-11 w-full md:h-10">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.isActive ? c.name : `${c.name} (inactive)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FormField
          control={control}
          name="estimatedHours"
          label="Estimated hours"
          description="Shown until 3 repairs give a real number."
          render={({ field, controlProps }) => (
            <Input
              {...field}
              {...controlProps}
              type="number"
              inputMode="decimal"
              min={0.25}
              max={200}
              step={0.25}
              placeholder="For example 1.5"
              className="h-11 text-base tabular-nums md:h-10 md:text-sm"
            />
          )}
        />
      </FieldRow>
      <FormField
        control={control}
        name="suggestedPriority"
        label="Suggested priority"
        required
        description="Raises the ticket's priority when this entry is picked."
        render={({ field, controlProps, labelId }) => (
          <ChoiceChipGroup
            id={controlProps.id}
            aria-labelledby={labelId}
            aria-describedby={controlProps['aria-describedby']}
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
    </FormSection>
  );
}

export function LooksLikeSection({ control }: { control: EntryFormControl }) {
  return (
    <FormSection title="What it looks like">
      <FormField
        control={control}
        name="symptoms"
        label="Symptoms"
        required
        description="What the driver or mechanic notices. Search matches these words."
        render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={4} className="text-base md:text-sm" />}
      />
      <CharCount control={control} name="symptoms" limit={SYMPTOMS_LIMIT} />
      <FormField
        control={control}
        name="descriptionTemplate"
        label="Description template"
        description="Fills the issue description when picked in the repair form."
        render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={3} className="text-base md:text-sm" />}
      />
      <CharCount control={control} name="descriptionTemplate" limit={TEMPLATE_LIMIT} />
    </FormSection>
  );
}

export function SafetySection({ control }: { control: EntryFormControl }) {
  return (
    <FormSection title="Safety">
      <FormField
        control={control}
        name="safetyNotes"
        label="Safety notes"
        description="Shown first on the entry and on the ticket, in a warning box."
        render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={3} className="text-base md:text-sm" />}
      />
      <CharCount control={control} name="safetyNotes" limit={SAFETY_LIMIT} />
    </FormSection>
  );
}

interface RowListSectionProps {
  control: EntryFormControl;
  name: 'steps' | 'parts';
  title: string;
  /** "step" or "part", for labels like "Move step 2 up". */
  noun: string;
  addLabel: string;
  max: number;
  limit: number;
  /** Fix steps keep at least one row; parts may have none. */
  minRows: number;
  emptyText?: string;
}

/** Numbered rows with Move up, Move down and Remove (AC-17). Empty rows are dropped on save. */
function RowListSection({ control, name, title, noun, addLabel, max, limit, minRows, emptyText }: RowListSectionProps) {
  const { fields, append, remove, swap } = useFieldArray({ control, name });
  const { errors } = useFormState({ control, name });
  const listError = errors[name]?.message ?? errors[name]?.root?.message;
  const listErrorId = `${name}-error`;
  const limitId = `${name}-limit`;
  const atMax = fields.length >= max;

  return (
    <FormSection title={title}>
      {fields.length === 0 && emptyText && <p className="text-sm text-muted-foreground">{emptyText}</p>}
      <ol className="flex flex-col gap-3" aria-describedby={listError ? listErrorId : undefined}>
        {fields.map((item, index) => {
          const n = index + 1;
          return (
            // On a phone the buttons wrap under the text, so the input keeps a usable width.
            <li key={item.id} className="flex flex-wrap items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-2 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary tabular-nums md:mt-1.5"
              >
                {n}
              </span>
              <Controller
                control={control}
                name={`${name}.${index}.text` as `${typeof name}.${number}.text`}
                render={({ field, fieldState }) => (
                  <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1.5">
                    <Input
                      {...field}
                      aria-label={`${noun[0].toUpperCase()}${noun.slice(1)} ${n}`}
                      aria-invalid={fieldState.invalid}
                      aria-describedby={fieldState.invalid ? `${name}-${index}-error` : undefined}
                      maxLength={limit}
                      className="h-11 text-base md:h-10 md:text-sm"
                    />
                    {fieldState.invalid && <FieldError id={`${name}-${index}-error`} errors={[fieldState.error]} />}
                  </div>
                )}
              />
              <div className="ml-auto flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 md:size-10"
                  aria-label={`Move ${noun} ${n} up`}
                  disabled={index === 0}
                  onClick={() => swap(index, index - 1)}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 md:size-10"
                  aria-label={`Move ${noun} ${n} down`}
                  disabled={index === fields.length - 1}
                  onClick={() => swap(index, index + 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 text-muted-foreground hover:text-destructive md:size-10"
                  aria-label={`Remove ${noun} ${n}`}
                  disabled={fields.length <= minRows}
                  onClick={() => remove(index)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      {listError && <FieldError id={listErrorId} errors={[{ message: listError }]} />}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="touch"
          className="md:h-10 md:text-sm"
          disabled={atMax}
          aria-describedby={limitId}
          onClick={() => append({ text: '' })}
        >
          <Plus aria-hidden="true" />
          {addLabel}
        </Button>
        <p id={limitId} className="text-xs text-muted-foreground tabular-nums">
          {fields.length} of {max}
        </p>
      </div>
    </FormSection>
  );
}

export function StepsSection({ control }: { control: EntryFormControl }) {
  return (
    <RowListSection
      control={control}
      name="steps"
      title="Fix steps"
      noun="step"
      addLabel="Add step"
      max={MAX_STEPS}
      limit={STEP_LIMIT}
      minRows={1}
    />
  );
}

export function PartsSection({ control }: { control: EntryFormControl }) {
  return (
    <RowListSection
      control={control}
      name="parts"
      title="Typical parts"
      noun="part"
      addLabel="Add part"
      max={MAX_PARTS}
      limit={PART_LIMIT}
      minRows={0}
      emptyText="No parts yet. Add the ones this fix usually needs."
    />
  );
}

