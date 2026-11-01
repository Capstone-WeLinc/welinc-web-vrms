import type { RepairFormInput } from '../../repair/lib/repairFormSchema';
import { readDataMode } from './dataMode';

// Development only (break-ui, spec 0016): fills the new repair form with the chosen dataset, so
// the worst case shows in the fields and not only in the lists. Limits: driver name 100,
// description 500, 10 issues, odometer 9,999,999 (the form's own schema). The form loads this
// with a dynamic import behind import.meta.env.DEV, so production drops the file.

type Named = { id: string; name: string };

export interface PrefillLists {
  vehicles: { plateNumber: string }[];
  garages: { name: string }[];
  categories: { id: string }[];
  mechanics: Named[];
  corporations: Named[];
  rootCauses: readonly string[];
}

const LONG_DESCRIPTION =
  'Rear pads are still squealing after the road test, and the rotor on the left side has a visible groove, so please skim or ' +
  'replace it. The brake fluid reservoir was also topped up past the MAX line. See the photos at ' +
  'https://example.com/welinc/garages/marikina/tickets/2026-10/rear-brakes?tab=photos&filter=unresolved&sort=newest and call ' +
  'the Chief Mechanic on the shop floor before you resend, because the driver is waiting at the gate with the next trip booked ' +
  'for 6 AM and cannot take the unit as is, and the customer account manager has already been told.';

const LONG_DRIVER = 'Jean-Baptiste Emmanuel Zorg Wiśniewska-Kowalczyk de la Cruz-Montgomery Santos y Villanueva'.slice(0, 100);

/** The form values for the chosen dataset, or null to leave the form as it opens. */
export function devFormPrefill(lists: PrefillLists): RepairFormInput | null {
  const mode = readDataMode();
  if (mode === 'demo' || mode === 'empty') return null;

  const category = lists.categories[0]?.id ?? '';
  const issue = (i: number, description: string) => ({
    knowledgeEntryId: '',
    categoryId: category,
    rootCause: lists.rootCauses[i % lists.rootCauses.length] ?? '',
    description,
  });

  if (mode === 'one') {
    return {
      vehiclePlate: lists.vehicles[0]?.plateNumber ?? '',
      addingDriver: true,
      driverId: '',
      driverLabel: '',
      newDriverName: 'Jo',
      newDriverLicense: 'A01-23-456789',
      garageLocation: lists.garages[0]?.name ?? '',
      odometerReading: '0',
      issues: [issue(0, 'X')],
      priority: 'LOW',
      mechanics: [],
      accountType: 'ONLINE',
      corporationId: '',
    };
  }

  // worst and huge: every field at its longest
  const issues = Array.from({ length: 10 }, (_, i) => issue(i, `${i + 1}. ${LONG_DESCRIPTION}`.padEnd(500, ' squeal').slice(0, 500)));
  return {
    vehiclePlate: lists.vehicles[0]?.plateNumber ?? '',
    addingDriver: true,
    driverId: '',
    driverLabel: '',
    newDriverName: LONG_DRIVER,
    newDriverLicense: 'N10-17-275503',
    garageLocation: lists.garages[0]?.name ?? '',
    odometerReading: '9999999',
    issues,
    priority: 'CRITICAL',
    mechanics: lists.mechanics.slice(0, 4).map((m) => ({ id: m.id, name: m.name })),
    accountType: 'CORPORATE',
    corporationId: lists.corporations[0]?.id ?? '',
  };
}
