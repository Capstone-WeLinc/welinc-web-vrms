import { useEffect, useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormAlert } from '../../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../../components/shared/ResponsiveDialog';
import { getApiErrorMessage } from '../../../../lib/api/errors';
import { getCategories, type IssueCategory } from '../../../../lib/api/knowledgeApi';
import type { ReferralDetail, ReferralIssueLine } from '../../../../lib/api/referralsApi';
import { guardedClose } from '../../hooks/useEditSession';
import { referralAddDefaults, referralAddSchema, toIssueLines, type ReferralAddValues } from '../../lib/referralAdd';

interface AddReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referral: ReferralDetail;
  /** The open ticket the findings join, as the sheet loaded it. */
  ticket: { id: string; repairNumber: string; updatedAt: string };
  /** Resolve once handled (the sheet closes); throw to show the message here. */
  onSave: (issues: ReferralIssueLine[]) => Promise<void>;
}

/** Spec 0029, AC-9: one issue line per VMMS finding, added to the truck's open ticket. */
export function AddReferralDialog({ open, onOpenChange, referral, ticket, onSave }: AddReferralDialogProps) {
  const formId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const [categories, setCategories] = useState<IssueCategory[] | null>(null);
  const [listFailed, setListFailed] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm<ReferralAddValues>({
    resolver: zodResolver(referralAddSchema),
    defaultValues: referralAddDefaults(referral),
  });
  const { fields } = useFieldArray({ control, name: 'issues' });

  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats.filter((c) => c.isActive));
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setListFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const changeOpen = guardedClose(isDirty, isSubmitting, onOpenChange);
  const submit = async (values: ReferralAddValues) => {
    setFormError(null);
    try {
      await onSave(toIssueLines(values));
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'That didn’t save. Try again.'));
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => void changeOpen(next)}
      title={`Add to ${ticket.repairNumber}`}
      description={`The findings from ${referral.workOrderNumber} join this ticket’s work list, and VMMS sees the link.`}
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-body" disabled={isSubmitting} onClick={() => void changeOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} size="touch" className="md:h-10 md:text-body" loading={isSubmitting}>
            {fields.length === 1 ? 'Add 1 issue' : `Add ${fields.length} issues`}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
        {formError && <FormAlert message={formError} />}
        <ol className="flex flex-col divide-y divide-divider">
          {fields.map((line, index) => (
            <li key={line.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
              <span className="text-label text-muted-strong">
                Finding <span className="font-mono">{index + 1}</span> of <span className="font-mono">{fields.length}</span>
              </span>
              <FormField
                control={control}
                name={`issues.${index}.categoryId`}
                label="System"
                required
                description={listFailed ? 'Couldn’t load the systems. Close and open this again to retry.' : undefined}
                render={({ field, controlProps }) => (
                  <Select name={field.name} value={field.value} onValueChange={field.onChange} disabled={categories === null}>
                    <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur} className="w-full">
                      <SelectValue placeholder={categories === null ? 'Loading systems' : 'Choose a system'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FormField
                control={control}
                name={`issues.${index}.description`}
                label="Issue"
                required
                render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={2} />}
              />
            </li>
          ))}
        </ol>
      </form>
    </ResponsiveDialog>
  );
}
