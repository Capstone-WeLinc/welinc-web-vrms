import { useState } from 'react';
import { Inbox, SearchX } from 'lucide-react';
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control';
import { DataTable } from '../../../../components/shared/data-table/DataTable';
import type { Column } from '../../../../components/shared/data-table/types';
import { PlateChip } from '../../../../components/shared/PlateChip';
import type { ReferralRow, ReferralStatus } from '../../../../lib/api/referralsApi';
import { formatDateTime } from '../../../../lib/utils/format';
import { REFERRAL_STATUS_LABEL, REFERRAL_STATUSES } from '../../lib/referrals';
import { ReferralSheet } from './ReferralSheet';

const baseColumns: Column<ReferralRow>[] = [
  {
    id: 'truck',
    header: 'Truck',
    mobile: 'title',
    cell: (r) => <PlateChip plate={r.vehiclePlate} />,
  },
  {
    id: 'workOrder',
    header: 'Work order',
    mobile: 'subtitle',
    cell: (r) => (
      <span translate="no" className="font-mono whitespace-nowrap">
        {r.workOrderNumber}
      </span>
    ),
  },
  {
    id: 'findings',
    header: 'Findings',
    mobile: 'field',
    align: 'end',
    cell: (r) => <span className="font-mono">{r.findingsCount}</span>,
  },
  {
    id: 'received',
    header: 'Received',
    mobile: 'field',
    cell: (r) => <span className="font-mono whitespace-nowrap">{formatDateTime(r.receivedAt)}</span>,
  },
];

// design.md "Tables": a column empty for every row hides (waiting referrals have no ticket yet)
const ticketColumn: Column<ReferralRow> = {
  id: 'ticket',
  header: 'Ticket',
  mobile: 'field',
  cell: (r) =>
    r.repairTicket ? (
      <span className="font-mono whitespace-nowrap">{r.repairTicket.repairNumber}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    ),
};

type Props = {
  status: ReferralStatus;
  onStatusChange: (status: ReferralStatus) => void;
  list: {
    state: 'loading' | 'error' | 'ready';
    rows: ReferralRow[];
    errorMessage?: string;
    retry: () => void;
  };
};

/** Spec 0029, AC-7: the Repairs page's Referrals tab. */
export function ReferralsView({ status, onStatusChange, list }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        aria-label="Referral status"
        className="self-start"
        value={status}
        onValueChange={(next) => onStatusChange(next as ReferralStatus)}
      >
        {REFERRAL_STATUSES.map((value) => (
          <SegmentedControlItem key={value} value={value}>
            {REFERRAL_STATUS_LABEL[value]}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>

      <DataTable
        errorKind="page"
        columns={list.rows.some((r) => r.repairTicket) ? [...baseColumns, ticketColumn] : baseColumns}
        rows={list.rows}
        getRowId={(row) => row.id}
        state={list.state}
        onRetry={list.retry}
        errorMessage={list.errorMessage}
        label="VMMS referrals"
        onRowClick={(row) => setOpenId(row.id)}
        empty={
          status === 'WAITING'
            ? {
                title: 'No referrals waiting',
                description: 'When a VMMS inspection sends a truck for repair, it shows up here.',
                icon: Inbox,
              }
            : {
                title: `No referrals ${REFERRAL_STATUS_LABEL[status].toLowerCase()}`,
                icon: SearchX,
              }
        }
      />

      <ReferralSheet
        referralId={openId}
        onClose={() => setOpenId(null)}
        onDecided={() => {
          setOpenId(null);
          list.retry();
        }}
      />
    </div>
  );
}
