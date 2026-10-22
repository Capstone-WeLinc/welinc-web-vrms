export type UserRole = 'ADMIN' | 'MECHANIC' | 'CUSTOMER_SUPPORT' | 'OPERATIONS';
export type SystemType = 'VRMS' | 'VMMS' | 'BMS' | 'SHARED';

export interface UserRoleAssignment {
  role: UserRole;
  system: SystemType;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  system: SystemType;
  roles?: UserRoleAssignment[];
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  isActive: boolean;
  isLocked: boolean;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: UserRoleAssignment[];
  contact?: string | null;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password?: string;
  isActive?: boolean;
  roleAssignments: UserRoleAssignment[];
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
  roleAssignments?: UserRoleAssignment[];
}

export type RepairStatus = 'PENDING' | 'IN_PROGRESS' | 'FOR_VERIFICATION' | 'COMPLETED' | 'CANCELLED';
export type AccountType = 'ONLINE' | 'CORPORATE';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MechanicAssignment {
  id: string;
  name: string;
  isOutsourced?: boolean;
  shopName?: string;
}

export interface RepairIssue {
  id: string;
  vehicleSystem: string;
  rootCause: string;
  description: string;
}

export interface ShopChangeLog {
  changedBy: string;
  previousValue: string;
  newValue: string;
  changedAt: string;
}

export interface RepairPart {
  id: string;
  description: string;
  unitCost: number;
  quantity: number;
  subtotal: number;
}

export interface AuditLogEntry {
  id: string;
  email: string;
  action: string;
  fieldName?: string;
  previousValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface RepairTicket {
  id: string;
  repairNumber: string;
  vehiclePlate: string;
  vehicleModel?: string;
  driverName: string;
  issueDescription: string;
  status: RepairStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  totalCost?: number | null;
  accountType?: AccountType;
  corporation?: string;
  garageLocation?: string;
  odometerReading?: number;
  mechanics?: MechanicAssignment[];
  shopName?: string;
  shopChangeLog?: ShopChangeLog[];
  priority?: PriorityLevel;
  issues?: RepairIssue[];
  targetDueDate?: string | null;
  remarks?: string;
  repairDurationDays?: number;
  repairDurationHours?: number;
  cancellationReason?: string;
  failedVerificationReason?: string;
  laborCost?: number | null;
  partsCost?: number | null;
  isLumpSum?: boolean;
  isUnlocked?: boolean;
  unlockReason?: string;
  driverIsVerified?: boolean;
  repairParts?: RepairPart[];
  auditLog?: AuditLogEntry[];
}

export interface CreateRepairPayload {
  vehiclePlate: string;
  driverName: string;
  issueDescription: string;
  accountType: AccountType;
  corporation?: string;
  garageLocation: string;
  odometerReading: number;
  mechanics: Omit<MechanicAssignment, 'id'>[];
  shopName: string;
  priority: PriorityLevel;
  issues: Omit<RepairIssue, 'id'>[];
  repairNumber?: string;
}

/** A closed ticket as `GET /vrms/repairs/history` sends it (spec 0003). Mechanics get no `totalCost`. */
export type RepairHistoryRow = Pick<
  RepairTicket,
  | 'id'
  | 'repairNumber'
  | 'status'
  | 'vehiclePlate'
  | 'vehicleModel'
  | 'driverName'
  | 'garageLocation'
  | 'createdAt'
  | 'updatedAt'
  | 'completedAt'
  | 'cancellationReason'
  | 'isUnlocked'
  | 'totalCost'
> & { closedAt: string | null };

/** Totals over every row that matches the filters, not just the page. `spend` is null for mechanics. */
export interface RepairHistorySummary {
  closed: number;
  completed: number;
  cancelled: number;
  spend: number | null;
}

export interface CostSnapshot {
  partsCost: number | null;
  laborCost: number | null;
  total: number | null;
  isLumpSum: boolean;
}

/** One audit timeline event (spec 0003). `actor` is null when the row has no email. */
export interface AuditEvent {
  id: string;
  type: string;
  at: string;
  actor: { id: string | null; name: string | null; email: string | null } | null;
  ticket: { id: string; repairNumber: string };
  status?: { from: string | null; to: string };
  cost?: { from: CostSnapshot | null; to: CostSnapshot | null } | null;
  unlockReason?: string;
  garage?: { from: string | null; to: string | null };
  rawAction: string;
}

export interface AuditActor {
  id: string;
  name: string;
  email: string;
}
