import { BadgePill } from './BadgePill';

/**
 * Spec 0029, AC-12: a ticket opened from a VMMS referral. Navy tint like an info tile, so it reads
 * as where the ticket came from and never competes with status or priority.
 */
export function FromVmmsChip({ workOrderNumber }: { workOrderNumber: string }) {
  return (
    <BadgePill className="bg-info-bg text-primary">
      From VMMS <span translate="no" className="font-mono whitespace-nowrap">{workOrderNumber}</span>
    </BadgePill>
  );
}
