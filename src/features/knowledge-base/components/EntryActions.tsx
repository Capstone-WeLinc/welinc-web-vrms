import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { confirm } from '../../../components/shared/confirm/confirm';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage, getConflictCode } from '../../../lib/api/errors';
import { setEntryStatus, type KnowledgeEntryDetail, type KnowledgeEntryStatus } from '../../../lib/api/knowledgeApi';
import { ChangeHistoryDialog } from './ChangeHistoryDialog';

type StatusMove = { label: string; to: KnowledgeEntryStatus; title: string; description: string; done: string; destructive?: boolean };

/** The one status move each status offers in the menu (spec 0007, State transitions). */
const MOVES: Record<KnowledgeEntryStatus, StatusMove> = {
  DRAFT: {
    label: 'Publish',
    to: 'ACTIVE',
    title: 'Publish this entry?',
    description: 'It shows in the library for mechanics and in the repair form picker.',
    done: 'Entry published',
  },
  ACTIVE: {
    label: 'Deactivate',
    to: 'INACTIVE',
    title: 'Deactivate this entry?',
    description: 'It leaves the repair form picker. Tickets already linked keep it.',
    done: 'Entry deactivated',
    destructive: true,
  },
  INACTIVE: {
    label: 'Reactivate',
    to: 'ACTIVE',
    title: 'Reactivate this entry?',
    description: 'It shows in the library and the repair form picker again.',
    done: 'Entry reactivated',
  },
};

interface EntryActionsProps {
  entry: KnowledgeEntryDetail;
  onChanged: (entry: KnowledgeEntryDetail) => void;
  onStale: () => void;
}

/** Edit, plus a ⋮ menu with the status move and the change history (AC-16). Editors only. */
export function EntryActions({ entry, onChanged, onStale }: EntryActionsProps) {
  const { showToast } = useToast();
  const [historyOpen, setHistoryOpen] = useState(false);
  const move = MOVES[entry.status];

  const runMove = async () => {
    const ok = await confirm({
      title: move.title,
      description: move.description,
      confirmText: move.label,
      tone: move.destructive ? 'destructive' : 'default',
    });
    if (!ok) return;
    try {
      onChanged(await setEntryStatus(entry.id, move.to, entry.updatedAt));
      showToast(move.done, 'success');
    } catch (err) {
      if (getConflictCode(err) === 'STALE') {
        showToast('Someone else changed this entry. Showing the latest version.', 'error');
        onStale();
        return;
      }
      showToast(getApiErrorMessage(err, 'Couldn’t change the entry’s status.'), 'error');
    }
  };

  return (
    <div className="flex gap-2">
      <Button asChild size="touch" className="flex-1 md:h-10 md:flex-none md:text-sm">
        <Link to={`/knowledge-base/${entry.id}/edit`}>
          <Pencil aria-hidden="true" />
          Edit
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-touch" className="md:size-10" aria-label="More actions for this entry">
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem variant={move.destructive ? 'destructive' : 'default'} onSelect={() => void runMove()}>
              {move.label}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setHistoryOpen(true)}>Change history</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangeHistoryDialog entryId={entry.id} version={entry.updatedAt} open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}
