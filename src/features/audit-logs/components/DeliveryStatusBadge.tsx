import { TriangleAlert } from 'lucide-react';
import { BadgePill } from '../../../components/shared/BadgePill';
import type { DeliveryRow, DeliveryStatus } from '../../../lib/api/deliveriesApi';
import { DELIVERY_STATUS_LABEL } from '../lib/deliveries';

const STATUS_CLASS: Record<DeliveryStatus, string> = {
  FAILED: 'bg-destructive/10 text-destructive',
  PENDING: 'bg-primary/10 text-primary',
  SENT: 'bg-success/15 text-success',
  DISMISSED: 'bg-muted text-muted-strong',
};

export function DeliveryStatusBadge({ row }: { row: Pick<DeliveryRow, 'status' | 'warning'> }) {
  return (
    <span className="flex items-center gap-1.5">
      <BadgePill className={STATUS_CLASS[row.status]}>{DELIVERY_STATUS_LABEL[row.status]}</BadgePill>
      {row.warning && (
        <span className="text-warning-text" title="Still retrying after 3 attempts">
          <TriangleAlert aria-hidden="true" className="size-4" />
          <span className="sr-only">Still retrying after 3 attempts</span>
        </span>
      )}
    </span>
  );
}

