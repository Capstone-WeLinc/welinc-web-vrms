export type UserRole = 'ADMIN' | 'MECHANIC' | 'CUSTOMER_SUPPORT' | 'OPERATIONS';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

export type RepairStatus = 'PENDING' | 'IN_PROGRESS' | 'FOR_VERIFICATION' | 'COMPLETED' | 'CANCELLED';

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
}

export interface CreateRepairPayload {
  vehiclePlate: string;
  driverName: string;
  issueDescription: string;
  status: RepairStatus;
}
