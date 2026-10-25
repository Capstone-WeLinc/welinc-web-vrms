import { useState } from 'react';
import { FolderTree, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { confirm } from '../../../components/shared/confirm/confirm';
import { DataTable } from '../../../components/shared/data-table/DataTable';
import type { Column, RowAction } from '../../../components/shared/data-table/types';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage, getConflictCode } from '../../../lib/api/errors';
import { updateCategory, type IssueCategory } from '../../../lib/api/knowledgeApi';
import { CategoryDialog } from '../components/CategoryDialog';
import { KnowledgeHeader } from '../components/KnowledgeHeader';
import { useCategories } from '../hooks/useKnowledgeData';

const COLUMNS: Column<IssueCategory>[] = [
  { id: 'name', header: 'Name', mobile: 'title', cell: (c) => <span className="font-medium">{c.name}</span> },
  {
    id: 'description',
    header: 'Description',
    mobile: 'subtitle',
    cell: (c) => <span className="text-muted-foreground">{c.description ?? '—'}</span>,
  },
  { id: 'entries', header: 'Entries', align: 'end', cell: (c) => c.entryCount },
  { id: 'status', header: 'Status', mobile: 'badge', cell: (c) => <StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
];

type DialogState = { category: IssueCategory | null; key: number } | null;

/** Every category in sortOrder, with edit, reorder and deactivate (spec 0007, AC-22, AC-23). */
export function KnowledgeCategoriesPage() {
  const { showToast } = useToast();
  const categories = useCategories(true);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const rows = categories.data ?? [];

  const openDialog = (category: IssueCategory | null) => {
    setDialog({ category, key: Date.now() });
    setDialogOpen(true);
  };

  const patch = async (category: IssueCategory, change: Parameters<typeof updateCategory>[1], done: string) => {
    try {
      await updateCategory(category.id, change, category.updatedAt);
      showToast(done, 'success');
    } catch (err) {
      showToast(
        getConflictCode(err) === 'STALE'
          ? 'Someone else changed this category. Showing the latest list.'
          : getApiErrorMessage(err, 'Couldn’t update the category.'),
        'error',
      );
    }
    await categories.refresh();
  };

  const toggleActive = async (category: IssueCategory) => {
    if (category.isActive) {
      const ok = await confirm({
        title: `Deactivate ${category.name}?`,
        description: 'It leaves the repair form and the library chips. Tickets and entries that use it keep it.',
        confirmText: 'Deactivate',
        tone: 'destructive',
      });
      if (!ok) return;
    }
    await patch(category, { isActive: !category.isActive }, category.isActive ? 'Category deactivated' : 'Category reactivated');
  };

  const rowActions = (category: IssueCategory): RowAction[] => {
    const index = rows.findIndex((c) => c.id === category.id);
    const above = rows[index - 1];
    const below = rows[index + 1];
    return [
      { label: 'Edit', onSelect: () => openDialog(category) },
      ...(above ? [{ label: 'Move up', onSelect: () => void patch(category, { sortOrder: above.sortOrder }, 'Category moved up') }] : []),
      ...(below ? [{ label: 'Move down', onSelect: () => void patch(category, { sortOrder: below.sortOrder }, 'Category moved down') }] : []),
      {
        label: category.isActive ? 'Deactivate' : 'Reactivate',
        destructive: category.isActive,
        onSelect: () => void toggleActive(category),
      },
    ];
  };

  return (
    <div>
      <KnowledgeHeader
        isEditor
        action={
          <Button onClick={() => openDialog(null)}>
            <Plus aria-hidden="true" />
            New category
          </Button>
        }
      />
      <DataTable
        columns={COLUMNS}
        rows={rows}
        getRowId={(c) => c.id}
        state={categories.state}
        onRetry={categories.retry}
        errorMessage={categories.errorMessage}
        label="Issue categories"
        rowActions={rowActions}
        rowActionsLabel={(c) => `Actions for ${c.name}`}
        empty={{ title: 'No categories yet.', description: 'Add one to start grouping entries.', icon: FolderTree }}
      />
      {dialog && (
        <CategoryDialog
          key={dialog.key}
          category={dialog.category}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSaved={() => void categories.refresh()}
          onReload={categories.retry}
        />
      )}
    </div>
  );
}
