import { buildStatusClass } from '../../lib/utils/format';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={buildStatusClass(status)}>{status.replace('_', ' ')}</span>;
}
