import { CalendarCheck, Truck, Wrench, type LucideIcon } from 'lucide-react';

/** A fixed icon per system code, as the portal's `systemIcons.ts` (spec 0007, AC-15). */
export const SYSTEM_ICONS: Record<string, LucideIcon> = { BMS: CalendarCheck, VMMS: Truck, VRMS: Wrench };

/** Each system's one line, the portal's `SYSTEM_LINES` word for word (suite spec 0019, AC-2). */
export const SYSTEM_LINES: Record<string, string> = {
  BMS: 'Bookings, trips and drivers',
  VMMS: 'Maintenance schedules and fleet upkeep',
  VRMS: 'Repair tickets, mechanics and workshop work',
};
