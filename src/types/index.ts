export type UserRole = 'ADMIN' | 'MECHANIC' | 'CHIEF_MECHANIC' | 'CUSTOMER_SUPPORT' | 'OPERATIONS';
export type SystemType = 'VRMS' | 'VMMS' | 'BMS' | 'SHARED';

/** One role in a system's catalog, from `GET /auth/systems` (spec 0004, AC-16). */
export interface CatalogRole {
  code: string;
  name: string;
  description: string;
  isSystemAdmin: boolean;
}

/** One system from `GET /auth/systems`, roles in display order (spec 0004, AC-16). */
export interface SystemView {
  code: Exclude<SystemType, 'SHARED'>;
  name: string;
  webAddress: string | null;
  maxRolesPerUser: number | null;
  roles: CatalogRole[];
}

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
  /** Every system the user holds, from welinc-auth (spec 0007, AC-8). */
  systems: string[];
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  /** False until a setup or reset code was used (suite spec 0009, AC-22). */
  passwordSet: boolean;
  isActive: boolean;
  isLocked: boolean;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: UserRoleAssignment[];
  contact?: string | null;
}

/**
 * One person on the Users page: VRMS's copy of welinc-auth's directory, from `GET /vrms/people`
 * (suite spec 0014, task 13a). Everyone holding a VRMS role, permanent or temporary; an erased
 * person is never listed. Lock, setup and email state live on the portal's person page.
 */
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  /** welinc-auth's stored picture path, relative to the gateway, or null. */
  picture: string | null;
  roles: UserRoleAssignment[];
  /** The VRMS role codes held through a temporary grant (a subset of `roles`). */
  temporaryRoles: UserRole[];
  isActive: boolean;
  /** Deleted at welinc-auth and in the grace period: restorable from the portal. */
  deleted: boolean;
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
/** VMMS's values, copied by the fleet sync (spec 0029, AC-4). */
export type VehicleStatus = 'AVAILABLE' | 'UNDER_REPAIR' | 'UNDER_MAINTENANCE';
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
  /** Spec 0023, AC-13: copied from a known fix, or added on this ticket. */
  origin: StepOrigin;
  /** Spec 0023, AC-13: set when a copied step was reworded on this ticket. */
  editedAt: string | null;
}

export type StepOrigin = 'KNOWN_FIX' | 'ADDED';

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
    /** Spec 0019, AC-15: a system change clears a known fix from another category. */
    categoryId?: string;
    status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
    safetyNotes: string | null;
    parts: string[];
    /** Median hours over 3 or more repairs, else null. */
    typicalHours: number | null;
    estimatedHours: number | null;
  } | null;
  /** Spec 0023, AC-6: the checklist lock the Edit steps dialog sends back. */
  checklistVersion: number;
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
  /** Left out when blank and a common issue is picked: the server uses its name (spec 0016, AC-5). */
  description?: string;
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
  /** Verify or return to mechanic; false on a ticket the caller is assigned to (spec 0014, AC-13). */
  verify: boolean;
  editCosts: boolean;
  unlock: boolean;
  /** Add, remove or swap mechanics on any open ticket (spec 0016, AC-16; spec 0019, AC-9). */
  assign: boolean;
  /** Edit the details and issues after create (ticket.edit, spec 0019, AC-1). */
  edit: boolean;
  /** Add, reword, remove and reorder an issue's steps (ticket.checklist.edit, spec 0023, AC-2). */
  editChecklist: boolean;
}

/** One status move the server lets this caller make now (spec 0014, AC-13). */
export interface TicketMove {
  to: RepairStatus;
  label: string;
  kind: 'forward' | 'back' | 'cancel';
  /** What the move's dialog must collect; resolutions only while the knowledge base is on. */
  needs: 'resolutions' | 'remarks' | 'cancellationReason' | 'costs' | null;
  /** Spec 0018: a photo the move needs that can't be added inside its dialog; fix it first. */
  blockedBy?: 'beforePhoto' | 'afterPhoto' | null;
}

/** The newest Return to mechanic still in force (spec 0014, AC-14). */
export interface TicketRejection {
  remarks: string;
  byName: string;
  /** ISO instant. */
  at: string;
}

export interface RepairTicket {
  id: string;
  repairNumber: string;
  vehiclePlate: string;
  vehicleModel?: string;
  /** Null on a ticket opened from a VMMS referral (spec 0029, AC-12): show `driverLabel()`. */
  driverName: string | null;
  /** Spec 0019, AC-4: the details edit compares it to tell a swap from the same driver. */
  driverId?: string | null;
  /** Spec 0029, AC-12: the VMMS work order a ticket was opened from, else null. */
  fromVmmsWorkOrder?: string | null;
  /** Spec 0029, AC-35: open, and VMMS removed its truck. The Admin cancels it, or VMMS adds the truck back. */
  truckRemoved?: boolean;
  issueDescription: string;
  status: RepairStatus;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
  /** When the status last changed (spec 0015). */
  statusChangedAt: string;
  /** Spec 0018: when work first started; set on single ticket responses only. Decides Before or After. */
  workStartedAt?: string | null;
  /** Set on the move to Closed or Cancelled. */
  closedAt?: string | null;
  totalCost?: number | null;
  accountType?: AccountType | null;
  corporation?: string | null;
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
  /** Spec 0019, AC-19: the last edit after create, and who made it. Null until someone edits. */
  editedAt?: string | null;
  editedByName?: string | null;
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
  /** Spec 0019, AC-13: how many mechanics are on the ticket. */
  mechanicCount?: number;
  /** In progress or on hold with no active mechanic assigned (spec 0011, AC-34). */
  needsMechanic?: boolean;
  can: TicketCan;
  /** Single ticket responses only; the page offers these and nothing else (spec 0014, AC-13). */
  moves?: TicketMove[];
  /** Single ticket responses only (spec 0014, AC-14). */
  lastRejection?: TicketRejection | null;
}

export interface CreateRepairPayload {
  vehiclePlate: string;
  /** Exactly one of driverId and newDriver (spec 0016, AC-6); neither for a VMMS referral (spec 0029). */
  driverId?: string;
  newDriver?: { name: string; licenseNumber: string };
  accountType: AccountType;
  /** An active value of the corporation list; sent with CORPORATE only. */
  corporationId?: string;
  garageLocation: string;
  odometerReading: number;
  /** The reading is right although it jumps far above the last one (spec 0016, AC-7). */
  confirmOdometerJump?: boolean;
  /** In house mechanics by Mechanic id (spec 0010, AC-12). Empty or left out: the ticket starts Open (spec 0016, AC-1). */
  mechanics?: { id: string }[];
  priority: PriorityLevel;
  issues: CreateRepairIssue[];
  /** Spec 0029, AC-8: the VMMS referral the ticket is opened from. */
  referralId?: string;
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
> & {
  closedAt: string | null;
  /** Feature 23: who verified and when; null on a cancelled ticket. */
  verifiedByName: string | null;
  verifiedAt: string | null;
};

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
  /** Spec 0021, AC-8: STATUS, ASSIGNMENT, EDITS, COSTS, FILES, CHECKLIST or KNOWLEDGE; null outside the catalog. */
  category: string | null;
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
