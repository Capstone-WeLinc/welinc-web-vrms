import { mechanicProblem } from '../../lib/mechanicProblem';
import type { RepairTicket } from '../../types';
import { BadgePill } from './BadgePill';

const WARNING = 'bg-status-pending-bg text-status-pending-fg';

export function MechanicProblemBadge({ ticket }: { ticket: Pick<RepairTicket, 'hasInactiveMechanic' | 'needsMechanic' | 'status' | 'mechanicCount'> }) {
  const problem = mechanicProblem(ticket);
  return problem ? <BadgePill className={WARNING}>{problem}</BadgePill> : null;
}
