export type UserRole = 'ADMIN' | 'MECHANIC' | 'CHIEF_MECHANIC' | 'CUSTOMER_SUPPORT' | 'OPERATIONS';
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

/** A step copied from the linked knowledge entry (spec 0007, AC-28). */
export interface RepairIssueStep {
  id: string;
  position: number;
  text: string;
  checkedAt: string | null;
  checkedByEmail: string | null;
}

/** One issue on a ticket, as formatTicket sends it (spec 0007, AC-27). */
export interface RepairIssue {
  id: string;
  /** `[System] Root cause: text`. */
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  knowledgeEntry: {
    id: string;
    name: string;
    status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
    safetyNotes: string | null;
    parts: string[];
    /** Median hours over 3 or more repairs, else null. */
    typicalHours: number | null;
    estimatedHours: number | null;
  } | null;
  steps: RepairIssueStep[];
  /** "What fixed it", saved on the move to For verification (AC-31). */
  resolutionNote: string | null;
  hoursSpent: number | null;
  followedKnownFix: boolean | null;
  resolvedAt: string | null;
}

/** One issue's "What fixed it" on the move to For verification (spec 0007, AC-31). */
export interface IssueResolution {
  issueId: string;
  resolutionNote?: string;
  hoursSpent?: number;
  followedKnownFix?: boolean;
}

/** One issue as the repair form sends it (spec 0007, AC-26). */
export interface CreateRepairIssue {
  /** An active IssueCategory, shown as System. */
  categoryId: string;
  rootCause: string;
  description: string;
  /** The picked common issue; left out for Other. */
  knowledgeEntryId?: string;
}

export interface RepairPart {
  id: string;
  description: string;
  unitCost: number;
  quantity: number;
  subtotal: number;
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
}

export interface CreateRepairPayload {
  vehiclePlate: string;
  driverName: string;
  issueDescription: string;
  accountType: AccountType;
  corporation?: string;
  garageLocation: string;
  odometerReading: number;
  /** In house mechanics by Mechanic id, outsourced ones by name and shop (spec 0009, AC-27). */
  mechanics: ({ id: string; isOutsourced: false } | { name: string; isOutsourced: true; shopName: string })[];
  shopName: string;
  priority: PriorityLevel;
  issues: CreateRepairIssue[];
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
  /** KNOWLEDGE_LINK: the known fix entry names before and after; null is none (spec 0007, AC-29). */
  knowledge?: { issueId: string | null; from: string | null; to: string | null };
  rawAction: string;
}

export interface AuditActor {
  id: string;
  name: string;
  email: string;
}
