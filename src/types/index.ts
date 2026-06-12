export type UserRole = 'ADMIN' | 'MECHANIC' | 'CUSTOMER_SUPPORT' | 'OPERATIONS';
export type SystemType = 'VRMS' | 'VMMS' | 'BMS' | 'SHARED';

export interface UserRoleAssignment {
  role: UserRole;
  system: SystemType;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  system: SystemType;
  roles?: UserRoleAssignment[];
}

export interface ManagedUser {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  isLocked: boolean;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: UserRoleAssignment[];
}

export interface CreateUserPayload {
  name: string;
  username: string;
  password: string;
  isActive?: boolean;
  roleAssignments: UserRoleAssignment[];
}

export interface UpdateUserPayload {
  name?: string;
  username?: string;
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

export interface RepairTicket {
  id: string;
  repairNumber: string;
  vehiclePlate: string;
  driverName: string;
  issueDescription: string;
  status: RepairStatus;
  createdAt: string;
  updatedAt: string;
  totalCost?: number;
  accountType?: AccountType;
  corporation?: string;
  garageLocation?: string;
  odometerReading?: number;
  mechanics?: MechanicAssignment[];
  shopName?: string;
  shopChangeLog?: ShopChangeLog[];
  priority?: PriorityLevel;
  issues?: RepairIssue[];
  targetDueDate?: string;
  remarks?: string;
  repairDurationDays?: number;
  repairDurationHours?: number;
  cancellationReason?: string;
  labourCost?: number;
  partsCost?: number;
}

export interface CreateRepairPayload {
  vehiclePlate: string;
  driverName: string;
  issueDescription: string;
  status: RepairStatus;
  accountType: AccountType;
  corporation?: string;
  garageLocation: string;
  odometerReading: number;
  mechanics: MechanicAssignment[];
  shopName: string;
  priority: PriorityLevel;
  issues: RepairIssue[];
  repairNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}
