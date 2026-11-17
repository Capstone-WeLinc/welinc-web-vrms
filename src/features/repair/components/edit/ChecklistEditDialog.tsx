import { stripSystem } from '../../lib/issueRow';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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
  DRAG_INSTRUCTIONS,
  dragSpeech,
  overTracker,
  STEP_TAG_TOOLTIP,
  STEP_TEXT_MAX,
  stepKeyAction,
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

/** AC-4a: mouse and touch start a drag after 4px, and only from the handle. */
const DRAG_DISTANCE_PX = 4;
const MODIFIERS = [restrictToVerticalAxis, restrictToParentElement];
const KEYBOARD_CODES = { start: ['Space'], cancel: ['Escape'], end: ['Space'] };

/** Spec 0023, AC-4 to AC-9, AC-13, AC-17, AC-18: add, reword, remove and drag to reorder an issue's steps. */
export function ChecklistEditDialog({ open, onOpenChange, issue, latestSteps, onSave }: ChecklistEditDialogProps) {
  const formId = useId();
  const saveId = `${formId}-save`;
  const addRef = useRef<HTMLButtonElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  /** The dragged row's place when the drag began, counted from 1 (AC-4a). */
  const startRef = useRef(0);
  const overRef = useRef(overTracker());
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
  const { fields, append, insert, remove, move } = useFieldArray({ control, name: 'steps' });
  const rows = useWatch({ control, name: 'steps' }) ?? [];
  const dirty = checklistChanged(issue.steps, toRows(rows));
  const changeOpen = guardedClose(dirty, isSubmitting, onOpenChange);
  const full = fields.length >= STEPS_MAX;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_DISTANCE_PX } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: KEYBOARD_CODES }),
  );

  const handleId = (key: string) => `${formId}-${key}-handle`;
  const textId = (key: string) => `${formId}-${key}-text`;
  const indexOf = (id: UniqueIdentifier) => fields.findIndex((f) => f.id === id);
  const activeIndex = activeId == null ? -1 : indexOf(activeId);

  /** Focus a field after React has re-rendered, with the cursor at its start or end (AC-4b). */
  const caretLater = (key: string, at: 'start' | 'end') =>
    requestAnimationFrame(() => {
      const el = document.getElementById(textId(key));
      if (!(el instanceof HTMLTextAreaElement)) return;
      el.focus();
      const pos = at === 'end' ? el.value.length : 0;
      el.setSelectionRange(pos, pos);
    });

  /** AC-18: focus the row that took the removed one's place, else the last row, else Add step. */
  const removeRow = (index: number) => {
    remove(index);
    const left = fields.length - 1;
    if (left === 0) requestAnimationFrame(() => addRef.current?.focus());
    else requestAnimationFrame(() => setFocus(`steps.${Math.min(index, left - 1)}.text`));
  };

  /** AC-4b: Backspace in an empty step goes up to the end of the step above, unlike Remove. */
  const backspaceRow = (index: number) => {
    const above = fields[index - 1]?.id;
    const below = fields[index + 1]?.id;
    remove(index);
    if (above) caretLater(above, 'end');
    else if (below) caretLater(below, 'start');
    else requestAnimationFrame(() => addRef.current?.focus());
  };

  const onStepKey = (index: number) => (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const action = stepKeyAction({
      key: event.key,
      value: event.currentTarget.value,
      repeat: event.repeat,
      composing: event.nativeEvent.isComposing || event.keyCode === 229,
      count: fields.length,
    });
    if (!action) return;
    event.preventDefault();
    if (action === 'add') insert(index + 1, { text: '' }, { shouldFocus: true });
    if (action === 'remove') backspaceRow(index);
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    startRef.current = indexOf(active.id) + 1;
    overRef.current.begin(active.id);
    setActiveId(active.id);
  };

  /** AC-4a: after any drop or cancel, focus is on the moved row's handle. */
  const endDrag = (id: UniqueIdentifier) => {
    setActiveId(null);
    requestAnimationFrame(() => document.getElementById(handleId(String(id)))?.focus());
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && over.id !== active.id) {
      const from = indexOf(active.id);
      const to = indexOf(over.id);
      if (from !== -1 && to !== -1) move(from, to);
    }
    endDrag(active.id);
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => dragSpeech.pickedUp(indexOf(active.id) + 1),
    onDragOver: ({ over }) =>
      over && overRef.current.changed(over.id) ? dragSpeech.over(startRef.current, indexOf(over.id) + 1) : undefined,
    onDragEnd: ({ over }) =>
      over ? dragSpeech.dropped(startRef.current, indexOf(over.id) + 1) : dragSpeech.cancelled(startRef.current),
    onDragCancel: () => dragSpeech.cancelled(startRef.current),
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

  const previewText = activeIndex === -1 ? '' : (rows[activeIndex]?.text ?? '');

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => void changeOpen(next)}
      // AC-4a: Escape during a drag cancels only the drag, never the sheet
      onEscapeKeyDown={(event) => {
        if (activeId != null) event.preventDefault();
      }}
      title="Edit steps"
      description={stripSystem(issue.description)}
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={MODIFIERS}
            accessibility={{ announcements, screenReaderInstructions: { draggable: DRAG_INSTRUCTIONS } }}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={({ active }) => endDrag(active.id)}
          >
            <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <ol className="flex flex-col gap-1">
                {fields.map((field, index) => {
                  const n = index + 1;
                  const step = field.stepId ? opened.get(field.stepId) : undefined;
                  const tag = step ? stepTag(step) : 'Added';
                  const error = errors.steps?.[index]?.text?.message;
                  const errorId = `${formId}-${field.id}-error`;
                  return (
                    <SortableStepRow key={field.id} id={field.id} n={n} handleId={handleId(field.id)}>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <Textarea
                          {...register(`steps.${index}.text`, {
                            validate: (text) => stepRowError({ id: getValues(`steps.${index}.stepId`), text }) ?? true,
                          })}
                          id={textId(field.id)}
                          aria-label={`Step ${n}`}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? errorId : undefined}
                          maxLength={STEP_TEXT_MAX}
                          rows={1}
                          onKeyDown={onStepKey(index)}
                          className="min-h-11 resize-none border-transparent bg-transparent px-2 py-2.5 shadow-none hover:border-input focus-visible:ring-offset-0"
                        />
                        {(tag || error || step?.checkedAt) && (
                          <div className="flex flex-col gap-0.5 px-2">
                            {(tag || step?.checkedAt) && (
                              <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                                {step?.checkedAt && <span className="text-success">Ticked</span>}
                                {tag && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span tabIndex={0} className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                        {tag}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{STEP_TAG_TOOLTIP[tag]}</TooltipContent>
                                  </Tooltip>
                                )}
                              </p>
                            )}
                            {error && (
                              <p id={errorId} className="text-xs text-destructive">
                                {error}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-touch"
                        className="shrink-0 text-muted-foreground hover:text-destructive focus-visible:text-destructive"
                        aria-label={`Remove step ${n}`}
                        onClick={() => removeRow(index)}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </SortableStepRow>
                  );
                })}
              </ol>
            </SortableContext>
            {/* The dialog content is transformed, which would offset a fixed overlay, so it renders on the body */}
            {createPortal(
              <DragOverlay>
                {activeIndex !== -1 ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none flex cursor-grabbing items-start gap-1 rounded-lg border border-border bg-card shadow-lg"
                  >
                    <span className="flex h-11 w-8 shrink-0 items-center justify-center text-muted-foreground">
                      <GripVertical className="size-4" />
                    </span>
                    <span className="w-6 shrink-0 pt-2.5 text-right text-sm text-muted-strong tabular-nums">{activeIndex + 1}.</span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 px-2 py-2.5 text-base break-words whitespace-pre-wrap md:text-sm',
                        previewText.trim() === '' && 'text-muted-foreground',
                      )}
                    >
                      {previewText.trim() === '' ? 'Empty step' : previewText}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>,
              document.body,
            )}
          </DndContext>
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

interface SortableStepRowProps {
  id: string;
  n: number;
  handleId: string;
  children: ReactNode;
}

/** AC-4 and AC-4a: one inline row. Only the handle starts a drag; while dragging its place shows as an empty slot. */
function SortableStepRow({ id, n, handleId, children }: SortableStepRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('rounded-lg', isDragging && 'bg-muted outline-2 -outline-offset-2 outline-border outline-dashed')}
    >
      <div className={cn('flex items-start gap-1', isDragging && 'invisible')}>
        <Button
          ref={setActivatorNodeRef}
          id={handleId}
          type="button"
          variant="ghost"
          className="h-11 w-8 shrink-0 cursor-grab touch-none px-0 text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={`Drag step ${n}`}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </Button>
        <span aria-hidden="true" className="w-6 shrink-0 pt-2.5 text-right text-sm text-muted-strong tabular-nums">
          {n}.
        </span>
        {children}
      </div>
    </li>
  );
}
