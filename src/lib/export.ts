import { RepairTicket } from '../types';

function toCSV(rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const header = keys.join(',');
  const lines = rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','));
  return [header, ...lines].join('\n');
}

export function downloadRepairsCSV(items: RepairTicket[]) {
  const rows = items.map((r) => ({
    id: r.id,
    repairNumber: r.repairNumber,
    vehiclePlate: r.vehiclePlate,
    driverName: r.driverName,
    status: r.status,
    updatedAt: r.updatedAt,
    totalCost: r.totalCost ?? 0,
  }));

  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'repairs.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadSummaryCSV(summary: {
  total: number;
  open: number;
  forVerification: number;
  completed: number;
  cancelled: number;
  totalCost: number;
  averageCost: number;
}) {
  const rows = [
    { Metric: 'Total Repairs', Value: summary.total },
    { Metric: 'Open Tickets', Value: summary.open },
    { Metric: 'Pending Verification', Value: summary.forVerification },
    { Metric: 'Completed Repairs', Value: summary.completed },
    { Metric: 'Cancelled Repairs', Value: summary.cancelled },
    { Metric: 'Total Cost (PHP)', Value: summary.totalCost },
    { Metric: 'Average Cost (PHP)', Value: summary.averageCost },
  ];

  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'repair_summary.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

