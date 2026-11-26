import { BadgePill } from './BadgePill';

/**
 * Spec 0029, AC-35: an open ticket whose truck VMMS removed. A soft red tint (never the solid red
 * of Critical), because the ticket needs an Admin to cancel it or VMMS to add the truck back.
 */
export function TruckRemovedChip() {
  return <BadgePill className="bg-destructive/10 text-destructive">Truck removed in VMMS</BadgePill>;
}
