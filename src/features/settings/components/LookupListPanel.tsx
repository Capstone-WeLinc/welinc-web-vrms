import { useState } from 'react';
import { ListTree, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { confirm } from '../../../components/shared/confirm/confirm';
import { DataTable } from '../../../components/shared/data-table/DataTable';
import type { Column, RowAction } from '../../../components/shared/data-table/types';
import { DetailSection } from '../../../components/shared/DetailSection';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { createLookupValue, getLookupAll, updateLookupValue, type LookupValue } from '../../../lib/api/vrmsConfigApi';
import { useLoad } from '../../knowledge-base/hooks/useLoad';
import { LookupNameDialog } from './LookupNameDialog';

const COLUMNS: Column<LookupValue>[] = [
  { id: 'name', header: 'Name', mobile: 'title', cell: (v) => <span className="font-medium wrap-anywhere">{v.name}</span> },
  { id: 'status', header: 'Status', mobile: 'badge', cell: (v) => <StatusBadge status={v.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
];

type DialogState = { value: LookupValue | null; key: number } | null;

interface LookupListPanelProps {
  /** The list's key on the server, such as `vehicle_type`. */
  list: string;
  /** Shown as the section title, such as "Vehicle types". */
  title: string;
  /** What one value is called, for buttons and messages: "vehicle type". */
  noun: string;
  /** Said when deactivating: what stays and what leaves. */
  deactivateNote: string;
}

/**
 * One generic lookup list: every value with add, rename, deactivate and reactivate (spec 0016,
 * AC-20). Values are never deleted. Each change shows in Settings > Change history.
 */
export function LookupListPanel({ list, title, noun, deactivateNote }: LookupListPanelProps) {
  const { showToast } = useToast();
  const values = useLoad(list, getLookupAll, `${title} didn’t load.`);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const rows = values.data ?? [];

  const openDialog = (value: LookupValue | null) => {
    setDialog({ value, key: Date.now() });
    setDialogOpen(true);
  };

  const save = async (value: LookupValue | null, name: string) => {
    if (value) await updateLookupValue(list, value.id, { name });
    else await createLookupValue(list, name);
    setDialogOpen(false);
    showToast(value ? `Renamed to ${name}.` : `${name} added.`, 'success');
    await values.refresh();
  };

  const toggleActive = async (value: LookupValue) => {
    if (value.isActive) {
      const ok = await confirm({
        title: `Deactivate ${value.name}?`,
        description: deactivateNote,
        confirmText: 'Deactivate',
        tone: 'destructive',
      });
      if (!ok) return;
    }
    try {
      await updateLookupValue(list, value.id, { isActive: !value.isActive });
      showToast(value.isActive ? `${value.name} deactivated.` : `${value.name} reactivated.`, 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, `Couldn’t update the ${noun}.`), 'error');
    }
    await values.refresh();
  };

  const rowActions = (value: LookupValue): RowAction[] => [
    { label: 'Rename', onSelect: () => openDialog(value) },
    { label: value.isActive ? 'Deactivate' : 'Reactivate', destructive: value.isActive, onSelect: () => void toggleActive(value) },
  ];

  return (
    <DetailSection
      title={title}
      action={
        <Button onClick={() => openDialog(null)}>
          <Plus aria-hidden="true" />
          New {noun}
        </Button>
      }
    >
      <DataTable
        errorKind="page"
        columns={COLUMNS}
        rows={rows}
        getRowId={(v) => v.id}
        state={values.state}
        onRetry={values.retry}
        errorMessage={values.errorMessage}
        label={title}
        rowActions={rowActions}
        rowActionsLabel={(v) => `Actions for ${v.name}`}
        empty={{ title: `No ${title.toLowerCase()} yet.`, description: `Add a ${noun} to start the list.`, icon: ListTree }}
      />
      {dialog && (
        <LookupNameDialog
          key={dialog.key}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={dialog.value ? `Rename ${dialog.value.name}` : `New ${noun}`}
          submitLabel={dialog.value ? 'Save name' : `Add ${noun}`}
          initialName={dialog.value?.name ?? ''}
          onSubmit={(name) => save(dialog.value, name)}
        />
      )}
    </DetailSection>
  );
}
