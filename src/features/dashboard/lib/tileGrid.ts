// The wide screen columns for the dashboard's count tiles, so no row is left with one tile
// (spec 0029 adds up to three tiles: referrals, expedite requests, removed trucks).
const LG_COLUMNS: Record<number, string> = {
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-3',
  7: 'lg:grid-cols-4',
};

export function tileGridClass(count: number): string {
  return `grid grid-cols-2 gap-4 ${LG_COLUMNS[count] ?? 'lg:grid-cols-4'}`;
}
