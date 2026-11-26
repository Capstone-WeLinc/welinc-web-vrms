import { useState } from 'react';
import { Send, SearchX } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '../../../components/shared/data-table/DataTable';
import type { Column } from '../../../components/shared/data-table/types';
import type { DeliveryFilters, DeliveryRow, DeliveryStatus } from '../../../lib/api/deliveriesApi';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import { formatDateTime } from '../../../lib/utils/format';
import {
  DELIVERY_KIND_LABEL,
  DELIVERY_KINDS,
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUSES,
  DELIVERY_TARGETS,
  deliverySubject,
  lastErrorText,
} from '../lib/deliveries';
import { DeliverySheet } from './DeliverySheet';

const LABEL = 'text-label text-muted-foreground';
const ALL = 'all';

const columns: Column<DeliveryRow>[] = [
  {
    id: 'about',
    header: 'About',
    mobile: 'title',
    cell: (r) => {
      const subject = deliverySubject(r);
      return subject ? (
        <span translate="no" className="font-mono whitespace-nowrap">{subject}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    id: 'kind',
    header: 'Message',
    mobile: 'subtitle',
    cell: (r) => (
      <span className="whitespace-nowrap">
        {DELIVERY_KIND_LABEL[r.kind]} <span className="text-muted-foreground">to {r.target}</span>
      </span>
    ),
  },
  { id: 'status', header: 'Status', mobile: 'badge', cell: (r) => <DeliveryStatusBadge row={r} /> },
  { id: 'attempts', header: 'Attempts', mobile: 'field', align: 'end', cell: (r) => <span className="font-mono">{r.attempts}</span> },
  {
    id: 'error',
    header: 'Last error',
    mobile: 'field',
    cell: (r) => {
      const text = lastErrorText(r);
      return text ? <span className="font-mono text-small break-all">{text}</span> : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    id: 'created',
    header: 'Created',
    mobile: 'field',
    cell: (r) => <span className="font-mono whitespace-nowrap">{formatDateTime(r.createdAt)}</span>,
  },
];

type Props = {
  filters: DeliveryFilters;
  onFiltersChange: (filters: DeliveryFilters) => void;
  list: { state: 'loading' | 'error' | 'ready'; rows: DeliveryRow[]; errorMessage?: string; retry: () => void };
};

/** Spec 0029, AC-22: the Audit Logs page's Deliveries tab. */
export function DeliveriesView({ filters, onFiltersChange, list }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const filtered = !!(filters.status || filters.target || filters.kind);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <SegmentedControl
          aria-label="Delivery status"
          className="self-start"
          value={filters.status ?? ALL}
          onValueChange={(next) => onFiltersChange({ ...filters, status: next === ALL ? undefined : (next as DeliveryStatus) })}
        >
          <SegmentedControlItem value={ALL}>All</SegmentedControlItem>
          {DELIVERY_STATUSES.map((status) => (
            <SegmentedControlItem key={status} value={status}>
              {DELIVERY_STATUS_LABEL[status]}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <div className="flex flex-col gap-1.5 lg:w-44">
          <Label htmlFor="delivery-target" className={LABEL}>
            System
          </Label>
          <Select
            value={filters.target ?? ALL}
            onValueChange={(next) => onFiltersChange({ ...filters, target: next === ALL ? undefined : (next as DeliveryFilters['target']) })}
          >
            <SelectTrigger id="delivery-target" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Both systems</SelectItem>
              {DELIVERY_TARGETS.map((target) => (
                <SelectItem key={target} value={target}>
                  {target}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5 lg:w-52">
          <Label htmlFor="delivery-kind" className={LABEL}>
            Message
          </Label>
          <Select
            value={filters.kind ?? ALL}
            onValueChange={(next) => onFiltersChange({ ...filters, kind: next === ALL ? undefined : (next as DeliveryFilters['kind']) })}
          >
            <SelectTrigger id="delivery-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Every message</SelectItem>
              {DELIVERY_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {DELIVERY_KIND_LABEL[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        errorKind="page"
        columns={columns}
        rows={list.rows}
        getRowId={(row) => row.id}
        state={list.state}
        onRetry={list.retry}
        errorMessage={list.errorMessage}
        label="Messages to VMMS and BMS"
        onRowClick={(row) => setOpenId(row.id)}
        empty={
          filtered
            ? { title: 'No messages match these filters', icon: SearchX }
            : {
                title: 'No messages yet',
                description: 'Every update VRMS sends to VMMS and BMS shows up here, with its tries.',
                icon: Send,
              }
        }
      />

      <DeliverySheet
        deliveryId={openId}
        onClose={() => setOpenId(null)}
        onChanged={list.retry}
      />
    </div>
  );
}
