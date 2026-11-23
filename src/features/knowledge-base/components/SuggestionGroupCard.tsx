import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SuggestionGroup } from '../../../lib/api/knowledgeApi';

const PREVIEW = 3;

interface SuggestionGroupCardProps {
  group: SuggestionGroup;
  busy: boolean;
  onCreate: () => void;
  onDismiss: () => void;
}

/** One recurring problem: how many, the newest three with "What fixed it", and the actions (AC-32). */
export function SuggestionGroupCard({ group, busy, onCreate, onDismiss }: SuggestionGroupCardProps) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? group.issues : group.issues.slice(0, PREVIEW);
  const listId = `group-${group.issueIds[0]}`;

  return (
    <Card className="gap-4 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-group font-semibold text-foreground tabular-nums">{group.size} similar issues</h3>
        {group.categoryName && <Badge variant="outline">{group.categoryName}</Badge>}
      </div>

      <ul id={listId} className="flex flex-col divide-y divide-border">
        {shown.map((issue) => (
          <li key={issue.issueId} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
            <p className="text-body break-words text-foreground">{issue.description}</p>
            {issue.resolutionNote && (
              <p className="text-body break-words text-muted-foreground">
                <span className="font-medium text-muted-strong">What fixed it:</span> {issue.resolutionNote}
              </p>
            )}
            <Link
              to={`/repairs/${issue.ticketId}`}
              className="self-start rounded-md text-caption font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring tabular-nums"
            >
              {issue.repairNumber}
            </Link>
          </li>
        ))}
      </ul>

      {group.issues.length > PREVIEW && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show fewer' : `Show all ${group.issues.length}`}
          <ChevronDown aria-hidden="true" className={cn('transition-transform motion-reduce:transition-none', expanded && 'rotate-180')} />
        </Button>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-body" disabled={busy} onClick={onDismiss}>
          Dismiss
        </Button>
        <Button type="button" size="touch" className="md:h-10 md:text-body" disabled={busy} onClick={onCreate}>
          Create entry
        </Button>
      </div>
    </Card>
  );
}
