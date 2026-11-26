import type { UpcomingTrip } from '../../../lib/api/expediteApi';

// Spec 0029 (child 0003), AC-16: how many trips the card shows before it summarizes the rest.
export const TRIPS_SHOWN = 5;

export const BMS_UNREACHABLE = 'BMS can’t be reached.';
export const NO_TRIPS = 'No trips booked in the next 14 days.';

/** The rows shown, and how many more there are. */
export function visibleTrips(items: UpcomingTrip[], limit = TRIPS_SHOWN) {
  return { shown: items.slice(0, limit), more: Math.max(0, items.length - limit) };
}
