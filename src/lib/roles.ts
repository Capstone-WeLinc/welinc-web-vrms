// The VRMS role codes as people read them. CHIEF_MECHANIC exists since spec 0007; DRIVER is
// reserved until feature 44 confirms the enum name. An unknown code reads as itself.
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  CHIEF_MECHANIC: 'Chief mechanic',
  MECHANIC: 'Mechanic',
  OPERATIONS: 'Operations',
  CUSTOMER_SUPPORT: 'Customer support',
  DRIVER: 'Driver',
};

export function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}
