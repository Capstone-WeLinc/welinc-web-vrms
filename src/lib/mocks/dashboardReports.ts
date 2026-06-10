/**
 * Mock data for Dashboard/Report Module (Module V)
 * Includes repair frequency analysis, cost vs income, and profitability data
 */

export interface VehicleProfitability {
  vehiclePlate: string;
  driverName: string;
  totalEarnings: number;
  totalRepairCost: number;
  netProfit: number;
  isProfitable: boolean;
  frequentRepairs: boolean;
  repairCount: number;
}

export interface RepairFrequency {
  vehiclePlate: string;
  repairCount: number;
  isFlagged: boolean;
  lastRepairDate: string;
}

/**
 * Cost vs Income Analysis - Tracks profitability per truck for selected time period
 */
export const VEHICLE_PROFITABILITY_DATA: VehicleProfitability[] = [
  {
    vehiclePlate: 'SL 1920',
    driverName: 'Pablo Santos',
    totalEarnings: 12500,
    totalRepairCost: 4200,
    netProfit: 8300,
    isProfitable: true,
    frequentRepairs: true,
    repairCount: 7,
  },
  {
    vehiclePlate: 'SL 4017',
    driverName: 'Mara De la Cruz',
    totalEarnings: 15800,
    totalRepairCost: 3500,
    netProfit: 12300,
    isProfitable: true,
    frequentRepairs: false,
    repairCount: 2,
  },
  {
    vehiclePlate: 'SL 1256',
    driverName: 'Janice Ramos',
    totalEarnings: 8900,
    totalRepairCost: 9200,
    netProfit: -300,
    isProfitable: false,
    frequentRepairs: false,
    repairCount: 3,
  },
  {
    vehiclePlate: 'SL 2960',
    driverName: 'Eduardo Morales',
    totalEarnings: 18200,
    totalRepairCost: 2100,
    netProfit: 16100,
    isProfitable: true,
    frequentRepairs: false,
    repairCount: 1,
  },
  {
    vehiclePlate: 'SL 9999',
    driverName: 'Noel Alvarez',
    totalEarnings: 11500,
    totalRepairCost: 3950,
    netProfit: 7550,
    isProfitable: true,
    frequentRepairs: false,
    repairCount: 2,
  },
  {
    vehiclePlate: 'SL 5821',
    driverName: 'Fernando Gutierrez',
    totalEarnings: 14200,
    totalRepairCost: 5670,
    netProfit: 8530,
    isProfitable: true,
    frequentRepairs: false,
    repairCount: 3,
  },
];

/**
 * Repair Frequency - Flags trucks with frequent repairs for preventive maintenance
 */
export const REPAIR_FREQUENCY_DATA: RepairFrequency[] = [
  {
    vehiclePlate: 'SL 1920',
    repairCount: 7,
    isFlagged: true,
    lastRepairDate: '2026-06-03T09:45:00.000Z',
  },
  {
    vehiclePlate: 'SL 4017',
    repairCount: 2,
    isFlagged: false,
    lastRepairDate: '2026-06-04T11:20:00.000Z',
  },
  {
    vehiclePlate: 'SL 1256',
    repairCount: 3,
    isFlagged: false,
    lastRepairDate: '2026-06-03T08:05:00.000Z',
  },
  {
    vehiclePlate: 'SL 2960',
    repairCount: 1,
    isFlagged: false,
    lastRepairDate: '2026-06-01T12:30:00.000Z',
  },
  {
    vehiclePlate: 'SL 9999',
    repairCount: 2,
    isFlagged: false,
    lastRepairDate: '2026-06-04T09:10:00.000Z',
  },
  {
    vehiclePlate: 'SL 5821',
    repairCount: 3,
    isFlagged: false,
    lastRepairDate: '2026-06-05T08:30:00.000Z',
  },
];

/**
 * Monthly Report Summary - Generated automatically on first day of each month
 */
export const MONTHLY_REPORT = {
  month: 'June 2026',
  totalCompletedRepairs: 32,
  totalCancelledRepairs: 2,
  totalRepairCost: 45680,
  averageRepairCost: 1427,
  highestCostRepair: 3450,
  mostFrequentIssue: 'Engine/Cooling System',
  garageSummary: [
    {
      garageLocation: 'North Garage',
      completedRepairs: 12,
      totalCost: 18500,
    },
    {
      garageLocation: 'South Garage',
      completedRepairs: 10,
      totalCost: 14200,
    },
    {
      garageLocation: 'East Garage',
      completedRepairs: 7,
      totalCost: 8920,
    },
    {
      garageLocation: 'West Garage',
      completedRepairs: 3,
      totalCost: 4060,
    },
  ],
};

/**
 * Daily Report - Active repairs and overdue tickets
 */
export const DAILY_REPORT = {
  date: '2026-06-05',
  activeRepairs: 5,
  pendingRepairs: 1,
  overdueRepairs: 1,
  cancelledToday: 0,
  completedToday: 1,
  truckStatus: [
    { vehiclePlate: 'SL 1920', status: 'UNDER_REPAIR', since: '2 days 4 hours' },
    { vehiclePlate: 'SL 4017', status: 'UNDER_REPAIR', since: '1 day 8 hours' },
    { vehiclePlate: 'SL 1256', status: 'UNDER_REPAIR', since: '2 days 2 hours' },
    { vehiclePlate: 'SL 9999', status: 'UNDER_REPAIR', since: '1 day 1 hour' },
    { vehiclePlate: 'SL 5821', status: 'UNDER_REPAIR', since: '20 hours' },
  ],
};

/**
 * Yearly Report Summary - Generated at year-end
 */
export const YEARLY_REPORT_TEMPLATE = {
  year: 2026,
  totalRepairs: 487,
  totalCompletedRepairs: 468,
  totalCancelledRepairs: 19,
  totalRepairCost: 534200,
  averageRepairCost: 1098,
  highestCostRepair: 5800,
  totalTrucksServiced: 18,
  garagePerformance: [
    {
      garageLocation: 'North Garage',
      totalRepairs: 145,
      totalCost: 165300,
    },
    {
      garageLocation: 'South Garage',
      totalRepairs: 138,
      totalCost: 152800,
    },
    {
      garageLocation: 'East Garage',
      totalRepairs: 114,
      totalCost: 128200,
    },
    {
      garageLocation: 'West Garage',
      totalRepairs: 90,
      totalCost: 87900,
    },
  ],
};
