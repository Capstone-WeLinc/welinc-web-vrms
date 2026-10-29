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
  /** Names of the other systems this account holds a role in (spec 0011, AC-26); empty when none. */
  otherSystems?: SystemType[];
  contact?: string | null;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password?: string;
  isActive?: boolean;
  roleAssignments: UserRoleAssignment[];
  /** Spec 0011, AC-30: add the roles to the existing WeLinc account with this email. */
  attachExisting?: boolean;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
  roleAssignments?: UserRoleAssignment[];
}

/** Spec 0010. Open is every status except CLOSED and CANCELLED (lib/repairStatus.ts). */
export type RepairStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'FOR_VERIFICATION'
  | 'OUTSOURCED'
  | 'PENDING_APPROVAL'
  | 'CLOSED'
  | 'CANCELLED';
export type VehicleStatus = 'AVAILABLE' | 'UNDER_REPAIR' | 'UNDER_MAINTENANCE' | 'DISABLED';
export type DueAtSource = 'PRIORITY' | 'ISSUE_TYPE' | 'MANUAL';
export type AccountType = 'ONLINE' | 'CORPORATE';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** One assigned in house mechanic, built from TicketAssignment (spec 0010, AC-5). */
export interface MechanicAssignment {
  id: string;
  name: string;
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

/** What the caller may do on one ticket, computed by the server (spec 0011, AC-12a). */
export interface TicketCan {
  work: boolean;
  administer: boolean;
  editCosts: boolean;
  unlock: boolean;
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
  lastActivityAt?: string;
  /** Set on the move to Closed or Cancelled. */
  closedAt?: string | null;
  totalCost?: number | null;
  accountType?: AccountType;
  corporation?: string;
  garageLocation?: string;
  odometerReading?: number;
  mechanics?: MechanicAssignment[];
  priority?: PriorityLevel;
  issues?: RepairIssue[];
  /** Empty until feature 42 sets due dates. */
  dueAt?: string | null;
  dueAtSource?: DueAtSource | null;
  reportedByName?: string | null;
  /** Who closed (verified) the ticket, and when. */
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  remarks?: string;
  cancellationReason?: string;
  laborCost?: number | null;
  partsCost?: number | null;
  isLumpSum?: boolean;
  isUnlocked?: boolean;
  unlockReason?: string;
  driverIsVerified?: boolean;
  repairParts?: RepairPart[];
  /** An open ticket assigned to a mechanic who is no longer active (spec 0011, AC-34). */
  hasInactiveMechanic?: boolean;
  /** In progress or on hold with no active mechanic assigned (spec 0011, AC-34). */
  needsMechanic?: boolean;
  can: TicketCan;
}

export interface CreateRepairPayload {
  vehiclePlate: string;
  driverName: string;
  issueDescription: string;
  accountType: AccountType;
  corporation?: string;
  garageLocation: string;
  odometerReading: number;
  /** In house mechanics by Mechanic id (spec 0010, AC-12). */
  mechanics: { id: string }[];
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
  | 'cancellationReason'
  | 'isUnlocked'
  | 'totalCost'
> & { closedAt: string | null };

/** Totals over every row that matches the filters, not just the page. `spend` is null for mechanics. */
export interface RepairHistorySummary {
  /** Closed plus cancelled. */
  finished: number;
  closed: number;
  cancelled: number;
  spend: number | null;
}

/** One changed field. Values are raw strings ("IN_PROGRESS", "1200.00", "true") or null; the UI formats them. */
export interface AuditChange {
  field: string;
  before: string | null;
  after: string | null;
}

/** One audit timeline event (spec 0003, spec 0010). `actor` is null for a system event. */
export interface AuditEvent {
  id: string;
  type: string;
  at: string;
  actor: { id: string | null; name: string | null; email: string | null; role: string | null } | null;
  ticket: { id: string; repairNumber: string };
  changes: AuditChange[];
  /** A reason or comment: the cancel reason, the unlock reason, or the remarks sent with a move. */
  note: string | null;
}

export interface AuditActor {
  id: string;
  name: string;
  email: string;
}
