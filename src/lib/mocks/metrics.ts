import { RepairStatus } from '../../types';

/**
 * Mock data for dashboard repair metrics
 */
export const REPAIR_VOLUME = [
  { label: 'Week 1', repairs: 18 },
  { label: 'Week 2', repairs: 24 },
  { label: 'Week 3', repairs: 31 },
  { label: 'Week 4', repairs: 28 },
  { label: 'Week 5', repairs: 34 },
];

export const STATUS_DISTRIBUTION: Record<RepairStatus, number> = {
  PENDING: 6,
  IN_PROGRESS: 12,
  FOR_VERIFICATION: 5,
  COMPLETED: 28,
  CANCELLED: 3,
};
