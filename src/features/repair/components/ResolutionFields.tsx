import { stripSystem } from '../lib/issueRow';
import { Controller, useWatch, type Control } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { RepairIssue } from '../../../types';
import type { NoteFormValues } from '../lib/resolutionForm';

/** One block per issue on the move to For verification (spec 0007, AC-30). */
export function ResolutionFields({ control, issues }: { control: Control<NoteFormValues>; issues: RepairIssue[] }) {
  const rows = useWatch({ control, name: 'resolutions' });
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-body font-medium text-foreground">What fixed each issue</legend>
      {issues.map((issue, index) => {
        const linked = issue.knowledgeEntry != null;
        const followed = rows?.[index]?.followedKnownFix ?? true;
        return (
          <div key={issue.id} className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <p className="text-body font-medium break-words text-foreground">
              <span className="text-muted-foreground tabular-nums">{index + 1}.</span> {stripSystem(issue.description)}
            </p>
            {linked && (
              <Controller
                control={control}
                name={`resolutions.${index}.followedKnownFix`}
                render={({ field }) => (
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body text-foreground">
                    <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} onBlur={field.onBlur} className="size-5" />
                    Followed the known fix ({issue.knowledgeEntry!.name})
                  </label>
                )}
              />
            )}
            <FormField
              control={control}
              name={`resolutions.${index}.resolutionNote`}
              label="What fixed it?"
              required={!linked}
              description={
                linked && followed
                  ? 'Optional. Add anything that differed from the known fix.'
                  : 'A few words is enough, like ‘replaced front pads, rotors fine’.'
              }
              render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={2} maxLength={500} />}
            />
            <FormField
              control={control}
              name={`resolutions.${index}.hoursSpent`}
              label="Hours spent"
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
                  className="h-11 w-40 text-base-input tabular-nums md:h-10 md:text-body"
                />
              )}
            />
          </div>
        );
      })}
    </fieldset>
  );
}
