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
  },\n  {\n    vehiclePlate: 'SL 4017',\n    driverName: 'Mara De la Cruz',\n    totalEarnings: 15800,\n    totalRepairCost: 3500,\n    netProfit: 12300,\n    isProfitable: true,\n    frequentRepairs: false,\n    repairCount: 2,\n  },\n  {\n    vehiclePlate: 'SL 1256',\n    driverName: 'Janice Ramos',\n    totalEarnings: 8900,\n    totalRepairCost: 9200,\n    netProfit: -300,\n    isProfitable: false,\n    frequentRepairs: false,\n    repairCount: 3,\n  },\n  {\n    vehiclePlate: 'SL 2960',\n    driverName: 'Eduardo Morales',\n    totalEarnings: 18200,\n    totalRepairCost: 2100,\n    netProfit: 16100,\n    isProfitable: true,\n    frequentRepairs: false,\n    repairCount: 1,\n  },\n  {\n    vehiclePlate: 'SL 9999',\n    driverName: 'Noel Alvarez',\n    totalEarnings: 11500,\n    totalRepairCost: 3950,\n    netProfit: 7550,\n    isProfitable: true,\n    frequentRepairs: false,\n    repairCount: 2,\n  },\n  {\n    vehiclePlate: 'SL 5821',\n    driverName: 'Fernando Gutierrez',\n    totalEarnings: 14200,\n    totalRepairCost: 5670,\n    netProfit: 8530,\n    isProfitable: true,\n    frequentRepairs: false,\n    repairCount: 3,\n  },\n];\n\n/**\n * Repair Frequency - Flags trucks with frequent repairs for preventive maintenance\n */\nexport const REPAIR_FREQUENCY_DATA: RepairFrequency[] = [\n  {\n    vehiclePlate: 'SL 1920',\n    repairCount: 7,\n    isFlagged: true,\n    lastRepairDate: '2026-06-03T09:45:00.000Z',\n  },\n  {\n    vehiclePlate: 'SL 4017',\n    repairCount: 2,\n    isFlagged: false,\n    lastRepairDate: '2026-06-04T11:20:00.000Z',\n  },\n  {\n    vehiclePlate: 'SL 1256',\n    repairCount: 3,\n    isFlagged: false,\n    lastRepairDate: '2026-06-03T08:05:00.000Z',\n  },\n  {\n    vehiclePlate: 'SL 2960',\n    repairCount: 1,\n    isFlagged: false,\n    lastRepairDate: '2026-06-01T12:30:00.000Z',\n  },\n  {\n    vehiclePlate: 'SL 9999',\n    repairCount: 2,\n    isFlagged: false,\n    lastRepairDate: '2026-06-04T09:10:00.000Z',\n  },\n  {\n    vehiclePlate: 'SL 5821',\n    repairCount: 3,\n    isFlagged: false,\n    lastRepairDate: '2026-06-05T08:30:00.000Z',\n  },\n];\n\n/**\n * Monthly Report Summary - Generated automatically on first day of each month\n */\nexport const MONTHLY_REPORT = {\n  month: 'June 2026',\n  totalCompletedRepairs: 32,\n  totalCancelledRepairs: 2,\n  totalRepairCost: 45680,\n  averageRepairCost: 1427,\n  highestCostRepair: 3450,\n  mostFrequentIssue: 'Engine/Cooling System',\n  garageSummary: [\n    {\n      garageLocation: 'North Garage',\n      completedRepairs: 12,\n      totalCost: 18500,\n    },\n    {\n      garageLocation: 'South Garage',\n      completedRepairs: 10,\n      totalCost: 14200,\n    },\n    {\n      garageLocation: 'East Garage',\n      completedRepairs: 7,\n      totalCost: 8920,\n    },\n    {\n      garageLocation: 'West Garage',\n      completedRepairs: 3,\n      totalCost: 4060,\n    },\n  ],\n};\n\n/**\n * Daily Report - Active repairs and overdue tickets\n */\nexport const DAILY_REPORT = {\n  date: '2026-06-05',\n  activeRepairs: 5,\n  pendingRepairs: 1,\n  overdueRepairs: 1,\n  cancelledToday: 0,\n  completedToday: 1,\n  truckStatus: [\n    { vehiclePlate: 'SL 1920', status: 'UNDER_REPAIR', since: '2 days 4 hours' },\n    { vehiclePlate: 'SL 4017', status: 'UNDER_REPAIR', since: '1 day 8 hours' },\n    { vehiclePlate: 'SL 1256', status: 'UNDER_REPAIR', since: '2 days 2 hours' },\n    { vehiclePlate: 'SL 9999', status: 'UNDER_REPAIR', since: '1 day 1 hour' },\n    { vehiclePlate: 'SL 5821', status: 'UNDER_REPAIR', since: '20 hours' },\n  ],\n};\n\n/**\n * Yearly Report Summary - Generated at year-end\n */\nexport const YEARLY_REPORT_TEMPLATE = {\n  year: 2026,\n  totalRepairs: 487,\n  totalCompletedRepairs: 468,\n  totalCancelledRepairs: 19,\n  totalRepairCost: 534200,\n  averageRepairCost: 1098,\n  highestCostRepair: 5800,\n  totalTrucksServiced: 18,\n  garagePerformance: [\n    {\n      garageLocation: 'North Garage',\n      totalRepairs: 145,\n      totalCost: 165300,\n    },\n    {\n      garageLocation: 'South Garage',\n      totalRepairs: 138,\n      totalCost: 152800,\n    },\n    {\n      garageLocation: 'East Garage',\n      totalRepairs: 114,\n      totalCost: 128200,\n    },\n    {\n      garageLocation: 'West Garage',\n      totalRepairs: 90,\n      totalCost: 87900,\n    },\n  ],\n};\n"
