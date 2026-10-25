import { Checkbox } from '@/components/ui/checkbox';
import { FormSection } from '../../../components/shared/FormSection';

interface LinkIssuesSectionProps {
  issues: { issueId: string; repairNumber: string; description: string }[];
  checked: Set<string>;
  onToggle: (issueId: string, checked: boolean) => void;
}

/** The suggestion group's issues, all ticked; the still ticked ones are linked on save (AC-33). */
export function LinkIssuesSection({ issues, checked, onToggle }: LinkIssuesSectionProps) {
  return (
    <FormSection title="Link these issues">
      <p className="-mt-2 text-sm text-muted-foreground tabular-nums">
        {checked.size} of {issues.length} ticked. Ticked issues count toward this entry’s history.
      </p>
      <ul className="-mx-2 flex max-h-80 flex-col overflow-y-auto">
        {issues.map((issue) => {
          const id = `link-${issue.issueId}`;
          return (
            <li key={issue.issueId}>
              <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/50">
                <Checkbox
                  id={id}
                  checked={checked.has(issue.issueId)}
                  onCheckedChange={(value) => onToggle(issue.issueId, value === true)}
                  className="mt-0.5 size-5"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-foreground tabular-nums">{issue.repairNumber}</span>
                  <span className="block break-words text-muted-foreground">{issue.description}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </FormSection>
  );
}
