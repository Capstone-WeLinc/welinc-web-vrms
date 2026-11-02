import { useEffect, useId, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Callout } from '../../../../components/shared/Callout';
import { FormAlert } from '../../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../../components/shared/ResponsiveDialog';
import { getApiErrorMessage } from '../../../../lib/api/errors';
import { getCategories, getEntryOptions, type EntryOption, type IssueCategory } from '../../../../lib/api/knowledgeApi';
import { getRepairFormOptions } from '../../../../lib/repairOptions';
import { useModuleOn } from '../../../../lib/permissions/usePermissions';
import type { RepairIssue, RepairTicket } from '../../../../types';
import { guardedClose } from '../../hooks/useEditSession';
import {
  clearsKnownFix,
  editNeedsReason,
  ISSUE_DESCRIPTION_MAX,
  ISSUE_TEXT_MAX,
  issueDefaults,
  issueSchema,
  type IssueFormValues,
} from '../../lib/ticketEdits';
import { EditReasonField } from './EditReasonField';

/** No known fix picked; Radix Select needs a non empty value for the item. */
const NO_FIX = 'none';

export type IssueSave =
  | { mode: 'add'; categoryId: string; rootCause: string; description?: string; knowledgeEntryId?: string; reason?: string }
  | { mode: 'edit'; categoryId: string; text: string; reason?: string };

interface IssueEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The ticket as the dialog opened (spec 0019, AC-22). */
  ticket: RepairTicket;
  /** The issue being edited; left out to add one. */
  issue?: RepairIssue;
  /** Resolve once handled (the page closes the dialog); throw to show the message here. */
  onSave: (save: IssueSave) => Promise<void>;
}

/** Spec 0019, AC-14, AC-15 and AC-20: add an issue with create's fields, or reword one. */
export function IssueEditDialog({ open, onOpenChange, ticket, issue, onSave }: IssueEditDialogProps) {
  const formId = useId();
  const mode = issue ? 'edit' : 'add';
  const needsReason = editNeedsReason(ticket);
  const knowledgeOn = useModuleOn('knowledge');
  const [formError, setFormError] = useState<string | null>(null);
  const [categories, setCategories] = useState<IssueCategory[] | null>(null);
  const [entries, setEntries] = useState<EntryOption[]>([]);
  const [listFailed, setListFailed] = useState(false);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isDirty, isSubmitting },
  } = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema(mode, needsReason)),
    defaultValues: issueDefaults(issue),
  });
  const categoryId = useWatch({ control, name: 'categoryId' });
  const entryId = useWatch({ control, name: 'knowledgeEntryId' });

  // Active systems, plus the known fixes for a new issue while the knowledge base is on
  useEffect(() => {
    let cancelled = false;
    Promise.all([getCategories(), mode === 'add' && knowledgeOn ? getEntryOptions() : Promise.resolve([])])
      .then(([cats, opts]) => {
        if (cancelled) return;
        setCategories(cats.filter((c) => c.isActive));
        setEntries(opts);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setListFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, knowledgeOn]);

  const fixes = useMemo(() => entries.filter((e) => e.categoryId === categoryId), [entries, categoryId]);
  const losesFix = mode === 'edit' && clearsKnownFix(issue, categoryId);
  const changeOpen = guardedClose(isDirty, isSubmitting, onOpenChange);

  const submit = async (values: IssueFormValues) => {
    setFormError(null);
    const reason = needsReason ? values.reason.trim() : undefined;
    const text = values.text.trim();
    try {
      await onSave(
        mode === 'add'
          ? {
              mode,
              categoryId: values.categoryId,
              rootCause: values.rootCause.trim(),
              description: text || undefined,
              knowledgeEntryId: values.knowledgeEntryId || undefined,
              reason,
            }
          : { mode, categoryId: values.categoryId, text, reason },
      );
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'That didn’t save. Try again.'));
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => void changeOpen(next)}
      title={mode === 'add' ? `Add an issue to ${ticket.repairNumber}` : `Edit issue on ${ticket.repairNumber}`}
      description={mode === 'add' ? 'The issue joins the ticket’s work list.' : 'Every change is recorded in the ticket’s activity.'}
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" disabled={isSubmitting} onClick={() => void changeOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} size="touch" className="md:h-10 md:text-sm" loading={isSubmitting}>
            {mode === 'add' ? 'Add issue' : 'Save issue'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
        <FormField
          control={control}
          name="categoryId"
          label="System"
          required
          description={listFailed ? 'Couldn’t load the systems. Close and open this again to retry.' : undefined}
          render={({ field, controlProps }) => (
            <Select
              name={field.name}
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                // A known fix belongs to one system
                setValue('knowledgeEntryId', '');
              }}
              disabled={categories === null}
            >
              <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur} className="w-full">
                <SelectValue placeholder={categories === null ? 'Loading systems' : 'Choose a system'} />
              </SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                {/* An inactive system the issue already has stays readable */}
                {issue?.categoryId && issue.categoryName && categories && !categories.some((c) => c.id === issue.categoryId) && (
                  <SelectItem value={issue.categoryId}>{issue.categoryName}</SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        />
        {losesFix && issue?.knowledgeEntry && (
          <Callout tone="warning" className="animate-in fade-in-0 duration-150">
            Saving under another system removes the known fix “{issue.knowledgeEntry.name}” and its steps from this issue.
          </Callout>
        )}

        {mode === 'add' && (
          <>
            <FormField
              control={control}
              name="rootCause"
              label="Root cause"
              required
              render={({ field, controlProps }) => (
                <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur} className="w-full">
                    <SelectValue placeholder="Choose a root cause" />
                  </SelectTrigger>
                  <SelectContent>
                    {getRepairFormOptions().rootCauses.map((cause) => (
                      <SelectItem key={cause} value={cause}>
                        {cause}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {knowledgeOn && fixes.length > 0 && (
              <FormField
                control={control}
                name="knowledgeEntryId"
                label="Known fix"
                description="Optional. Its steps are copied to the issue."
                render={({ field, controlProps }) => (
                  <Select name={field.name} value={field.value || NO_FIX} onValueChange={(value) => field.onChange(value === NO_FIX ? '' : value)}>
                    <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_FIX}>No known fix</SelectItem>
                      {fixes.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </>
        )}

        <FormField
          control={control}
          name="text"
          label={mode === 'add' ? 'Description' : 'Issue'}
          required={mode === 'edit' || !entryId}
          description={
            mode === 'add'
              ? entryId
                ? 'Optional. Left blank, the known fix’s name is used.'
                : `Up to ${ISSUE_DESCRIPTION_MAX} characters.`
              : `The root cause and description, up to ${ISSUE_TEXT_MAX} characters. The system goes in front.`
          }
          render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={3} />}
        />

        {needsReason && <EditReasonField control={control} />}
        {formError && <FormAlert message={formError} />}
      </form>
    </ResponsiveDialog>
  );
}
