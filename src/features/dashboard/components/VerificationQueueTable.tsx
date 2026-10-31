import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '../../../components/shared/data-table/DataTable';
import type { Column } from '../../../components/shared/data-table/types';
import { PlateChip } from '../../../components/shared/PlateChip';
import type { RepairTicket } from '../../../types';
import { waitingText } from '../lib/attention';

interface VerificationQueueTableProps {
  rows: RepairTicket[];
  /** The hook's fetchedAt, so every wait time agrees with the tiles. */
  now: number;
}

const NAMES_SHOWN = 2;

/** A row is for scanning: two names, then "+N more", with the full list on hover. */
function MechanicNames({ mechanics }: { mechanics: RepairTicket['mechanics'] }) {
  if (!mechanics?.length) return <>No mechanic</>;
  const names = mechanics.map((m) => m.name);
  const extra = names.length - NAMES_SHOWN;
  return (
    <span className="wrap-anywhere" title={extra > 0 ? names.join(', ') : undefined}>
      {names.slice(0, NAMES_SHOWN).join(', ')}
      {extra > 0 && ` +${extra} more`}
    </span>
  );
}

// Spec 0015, AC-14: the Chief Mechanic's sign off queue, oldest wait first.
export function VerificationQueueTable({ rows, now }: VerificationQueueTableProps) {
  const navigate = useNavigate();

  const columns: Column<RepairTicket>[] = [
    { id: 'plate', header: 'Vehicle', mobile: 'title', cell: (t) => <PlateChip plate={t.vehiclePlate} /> },
    { id: 'repair', header: 'Ticket', mobile: 'subtitle', cell: (t) => t.repairNumber },
    {
      id: 'mechanics',
      header: 'Mechanics',
      mobile: 'field',
      cell: (t) => <MechanicNames mechanics={t.mechanics} />,
    },
    { id: 'garage', header: 'Garage', mobile: 'field', cell: (t) => <span className="wrap-anywhere">{t.garageLocation || 'No garage'}</span> },
    {
      id: 'wait',
      header: 'Waiting',
      mobile: 'field',
      cell: (t) => <time dateTime={t.statusChangedAt}>{waitingText(t, now)}</time>,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(t) => t.id}
        state="ready"
        label="Tickets waiting for your sign off"
        empty={{ title: 'Nothing waiting for your sign off', icon: ShieldCheck }}
        onRowClick={(t) => navigate(`/repairs/${t.id}`)}
      />
      {rows.length > 0 && (
        <Button asChild variant="link" className="self-end px-0">
          <Link to="/repairs?status=FOR_VERIFICATION">
            See all
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      )}
    </div>
  );
}
