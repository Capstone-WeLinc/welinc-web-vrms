import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { confirm } from '@/components/shared/confirm/confirm';
import { DataTable } from '@/components/shared/data-table/DataTable';
import type { Column } from '@/components/shared/data-table/types';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useToast } from '@/context/toast';
import { Row, Section } from './ShowcaseLayout';

type SampleTicket = {
  id: string;
  vehicle: string;
  plate: string;
  mechanic: string;
  status: string;
  priority: string;
  cost: number;
};

const VEHICLES = ['Toyota Hilux', 'Isuzu D-Max', 'Mitsubishi L300', 'Toyota HiAce', 'Ford Ranger', 'Nissan Navara'];
const MECHANICS = ['Ramon Dela Cruz', 'Jessa Villanueva', 'Arnel Bautista', 'Marites Santos'];
const STATUSES = ['PENDING', 'IN_PROGRESS', 'FOR_VERIFICATION', 'COMPLETED', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const SAMPLE_TICKETS: SampleTicket[] = Array.from({ length: 47 }, (_, index) => ({
  id: `REP-20260723-${String(515 + index).padStart(5, '0')}`,
  vehicle: VEHICLES[index % VEHICLES.length],
  plate: `NAB ${1200 + index * 7}`,
  mechanic: MECHANICS[index % MECHANICS.length],
  status: STATUSES[index % STATUSES.length],
  priority: PRIORITIES[(index * 3) % PRIORITIES.length],
  cost: 1500 + ((index * 1375) % 18000),
}));

const PAGE_SIZE = 8;
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const COLUMNS: Column<SampleTicket>[] = [
  { id: 'id', header: 'Ticket', cell: (row) => <span className="font-medium">{row.id}</span>, mobile: 'title' },
  { id: 'vehicle', header: 'Vehicle', cell: (row) => `${row.vehicle} · ${row.plate}`, mobile: 'subtitle' },
  { id: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} />, mobile: 'badge' },
  { id: 'priority', header: 'Priority', cell: (row) => <PriorityBadge priority={row.priority} /> },
  { id: 'mechanic', header: 'Mechanic', cell: (row) => row.mechanic },
  { id: 'cost', header: 'Cost', cell: (row) => peso.format(row.cost), align: 'end' },
];

type DemoState = 'ready' | 'loading' | 'empty' | 'error';
const DEMO_STATES: DemoState[] = ['ready', 'loading', 'empty', 'error'];

export function DataTableSection() {
  const { showToast } = useToast();
  const [demoState, setDemoState] = useState<DemoState>('ready');
  const [page, setPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(false);

  // A fake fetch: the table shows skeleton rows and hides the old ones until it lands.
  const fakeLoad = (next: () => void) => {
    setPageLoading(true);
    setTimeout(() => {
      next();
      setPageLoading(false);
    }, 800);
  };

  const onPageChange = (next: number) => fakeLoad(() => setPage(next));
  const onRetry = () => fakeLoad(() => setDemoState('ready'));

  const rows = demoState === 'empty' ? [] : SAMPLE_TICKETS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const state = pageLoading || demoState === 'loading' ? 'loading' : demoState === 'error' ? 'error' : 'ready';

  return (
    <Section
      id="data-table"
      title="Data table"
      description="One columns definition: a table from 768px up, stacked cards below. Click a row to open it. Row actions sit in the ⋮ menu. Resize the window below 768px to see the cards."
    >
      <Row label="State">
        <div role="group" aria-label="Table state" className="flex flex-wrap gap-2">
          {DEMO_STATES.map((option) => (
            <Button
              key={option}
              variant={demoState === option ? 'default' : 'outline'}
              size="sm"
              aria-pressed={demoState === option}
              onClick={() => setDemoState(option)}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </Button>
          ))}
        </div>
      </Row>

      <DataTable
        label="Sample repair tickets"
        columns={COLUMNS}
        rows={rows}
        getRowId={(row) => row.id}
        state={state}
        onRetry={onRetry}
        errorMessage="The repair service did not respond."
        empty={{
          title: 'No repair tickets yet',
          description: 'New tickets show up here as soon as they are filed.',
          action: (
            <Button>
              <Plus aria-hidden="true" />
              New ticket
            </Button>
          ),
        }}
        onRowClick={(row) => showToast(`Opening ${row.id}.`, 'info')}
        rowActions={(row) => [
          { label: 'View', onSelect: () => showToast(`Opening ${row.id}.`, 'info') },
          { label: 'Edit', onSelect: () => showToast(`Editing ${row.id}.`, 'info') },
          {
            label: 'Delete',
            destructive: true,
            onSelect: async () => {
              const confirmed = await confirm({ title: `Delete ${row.id}?`, description: 'This cannot be undone.', confirmText: 'Delete ticket', tone: 'destructive' });
              if (confirmed) showToast(`${row.id} deleted (sample only).`, 'success');
            },
          },
        ]}
        pagination={{ page, pageSize: PAGE_SIZE, total: demoState === 'empty' ? 0 : SAMPLE_TICKETS.length, onPageChange }}
      />

      <Row label="Without click, actions or pagination">
        <div className="w-full">
          <DataTable
            label="Read only tickets"
            columns={COLUMNS.slice(0, 3)}
            rows={SAMPLE_TICKETS.slice(0, 3)}
            getRowId={(row) => row.id}
            state="ready"
            empty={{ title: 'No tickets' }}
          />
        </div>
      </Row>
    </Section>
  );
}
