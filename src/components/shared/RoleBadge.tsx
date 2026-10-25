import { BadgePill } from './BadgePill';

interface RoleBadgeProps {
  /** The user's role from authStore, or a row's UserRoleAssignment.role. */
  role: string;
}

// CHIEF_MECHANIC exists since spec 0007; DRIVER is reserved until feature 44 confirms the enum name.
const ROLE_MAP: Record<string, { label: string; className: string }> = {
  ADMIN: { label: 'Admin', className: 'bg-role-admin-bg text-role-admin-fg' },
  CHIEF_MECHANIC: { label: 'Chief mechanic', className: 'bg-role-chief-mechanic-bg text-role-chief-mechanic-fg' },
  MECHANIC: { label: 'Mechanic', className: 'bg-role-mechanic-bg text-role-mechanic-fg' },
  OPERATIONS: { label: 'Operations', className: 'bg-role-operations-bg text-role-operations-fg' },
  CUSTOMER_SUPPORT: { label: 'Customer support', className: 'bg-role-customer-support-bg text-role-customer-support-fg' },
  DRIVER: { label: 'Driver', className: 'bg-role-driver-bg text-role-driver-fg' },
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const meta = ROLE_MAP[role] ?? { label: role, className: 'bg-status-cancelled-bg text-status-cancelled-fg' };
  return <BadgePill className={meta.className}>{meta.label}</BadgePill>;
}
