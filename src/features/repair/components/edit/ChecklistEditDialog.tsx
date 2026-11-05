import { useId, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FormAlert } from '../../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../../components/shared/ResponsiveDialog';
import { confirm } from '../../../../components/shared/confirm/confirm';
import { getApiErrorMessage, getFieldErrors } from '../../../../lib/api/errors';
import type { RepairIssue, RepairIssueStep } from '../../../../types';
import { guardedClose } from '../../hooks/useEditSession';
import {
  checklistChanged,
  checklistPayload,
  type ChecklistRow,
  STEP_TAG_TOOLTIP,
  STEP_TEXT_MAX,
  stepRowError,
  STEPS_MAX,
  stepTag,
  tickedLoss,
  tickedLossMessage,
} from '../../lib/checklist';

/** A dialog row; `stepId` because the field array keeps `id` for its own key. */
type FormRow = { stepId?: string; text: string };
type FormValues = { steps: FormRow[] };

export type ChecklistSave = { checklistVersion: number; steps: ChecklistRow[] };

interface ChecklistEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The issue as the dialog opened (AC-17): its steps and checklistVersion. */
  issue: RepairIssue;
  /** The issue's steps in the latest ticket data, for the ticked step prompt (AC-9). */
  latestSteps: RepairIssueStep[];
  /** Resolve once handled (the page closes the dialog); throw to show the error here. */
  onSave: (save: ChecklistSave) => Promise<void>;
}

const toRows = (rows: FormRow[]): ChecklistRow[] => rows.map((r) => (r.stepId ? { id: r.stepId, text: r.text } : { text: r.text }));

/** Spec 0023, AC-4 to AC-9, AC-13, AC-17, AC-18: add, reword, remove and reorder an issue's steps. */
export function ChecklistEditDialog({ open, onOpenChange, issue, latestSteps, onSave }: ChecklistEditDialogProps) {
  const formId = useId();
  const saveId = `${formId}-save`;
  const addRef = useRef<HTMLButtonElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const opened = new Map(issue.steps.map((s) => [s.id, s]));
  const {
    control,
    register,
    handleSubmit,
    getValues,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { steps: issue.steps.map((s) => ({ stepId: s.id, text: s.text })) },
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'steps' });
  const rows = useWatch({ control, name: 'steps' }) ?? [];
  const dirty = checklistChanged(issue.steps, toRows(rows));
  const changeOpen = guardedClose(dirty, isSubmitting, onOpenChange);
  const full = fields.length >= STEPS_MAX;

  /** Focus a control of a row after React has moved it. */
  const focusLater = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());
  const ctrl = (key: string, part: 'up' | 'down') => `${formId}-${key}-${part}`;

  const moveRow = (from: number, to: number) => {
    const key = fields[from].id;
    move(from, to);
    // A button that turns disabled at the top or bottom hands focus to its partner (AC-18)
    if (to === 0) focusLater(ctrl(key, 'down'));
    else if (to === fields.length - 1) focusLater(ctrl(key, 'up'));
    else focusLater(ctrl(key, from > to ? 'up' : 'down'));
  };

  /** AC-18: focus the row that took the removed one's place, else the last row, else Add step. */
  const removeRow = (index: number) => {
    remove(index);
    const left = fields.length - 1;
    if (left === 0) requestAnimationFrame(() => addRef.current?.focus());
    else requestAnimationFrame(() => setFocus(`steps.${Math.min(index, left - 1)}.text`));
  };

  const submit = async (values: FormValues) => {
    setFormError(null);
    const list = toRows(values.steps);
    // AC-9: ticked steps removed or reworded, counted against the latest ticket data
    const loss = tickedLossMessage(tickedLoss(latestSteps, list));
    if (loss) {
      const ok = await confirm({ title: 'Save these changes?', description: loss, confirmText: 'Save', tone: 'destructive' });
      if (!ok) {
        requestAnimationFrame(() => document.getElementById(saveId)?.focus());
        return;
      }
    }
    const { steps, rowOf } = checklistPayload(list);
    try {
      await onSave({ checklistVersion: issue.checklistVersion, steps });
    } catch (err) {
      // AC-5: the server's per row messages, mapped back from the sent list to the dialog rows
      const fieldErrors = getFieldErrors(err);
      fieldErrors.forEach(({ index, message }, i) => {
        const row = rowOf[index];
        if (row !== undefined) setError(`steps.${row}.text`, { message }, { shouldFocus: i === 0 });
      });
      if (fieldErrors.length === 0) setFormError(getApiErrorMessage(err, 'That didn’t save. Try again.'));
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => void changeOpen(next)}
      title="Edit steps"
      description={issue.description}
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" disabled={isSubmitting} onClick={() => void changeOpen(false)}>
            Cancel
          </Button>
          <Button id={saveId} type="submit" form={formId} size="touch" className="md:h-10 md:text-sm" loading={isSubmitting}>
            Save steps
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No steps yet. Add the first one, or save to leave the checklist empty.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {fields.map((field, index) => {
              const n = index + 1;
              const step = field.stepId ? opened.get(field.stepId) : undefined;
              const tag = step ? stepTag(step) : 'Added';
              const error = errors.steps?.[index]?.text?.message;
              const errorId = `${formId}-${field.id}-error`;
              return (
                <li key={field.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-strong tabular-nums">Step {n}</span>
                    {tag && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="rounded-sm text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {tag}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{STEP_TAG_TOOLTIP[tag]}</TooltipContent>
                      </Tooltip>
                    )}
                    {step?.checkedAt && <span className="text-xs text-muted-foreground">· Ticked</span>}
                  </div>
                  <div className="flex items-start gap-1">
                    <Textarea
                      {...register(`steps.${index}.text`, {
                        validate: (text) => stepRowError({ id: getValues(`steps.${index}.stepId`), text }) ?? true,
                      })}
                      aria-label={`Step ${n}`}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
                      maxLength={STEP_TEXT_MAX + 50}
                      rows={1}
                      className="min-h-11 flex-1 resize-none"
                    />
                    <Button
                      id={ctrl(field.id, 'up')}
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0 md:size-9"
                      aria-label={`Move step ${n} up`}
                      disabled={index === 0}
                      onClick={() => moveRow(index, index - 1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      id={ctrl(field.id, 'down')}
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0 md:size-9"
                      aria-label={`Move step ${n} down`}
                      disabled={index === fields.length - 1}
                      onClick={() => moveRow(index, index + 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0 text-destructive hover:text-destructive md:size-9"
                      aria-label={`Remove step ${n}`}
                      onClick={() => removeRow(index)}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                  {error && (
                    <p id={errorId} className="text-xs text-destructive">
                      {error}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button ref={addRef} type="button" variant="outline" size="sm" disabled={full} onClick={() => append({ text: '' }, { shouldFocus: true })}>
            <Plus aria-hidden="true" />
            Add step
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {fields.length} of {STEPS_MAX} steps
          </span>
        </div>
        {formError && <FormAlert message={formError} />}
      </form>
    </ResponsiveDialog>
  );
}
