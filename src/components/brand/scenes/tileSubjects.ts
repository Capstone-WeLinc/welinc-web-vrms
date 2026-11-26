/** The 12 things a small error can be about (VRMS spec 0028, AC-8). */
export const TILE_SUBJECTS = [
  'activity',
  'charts',
  'devices',
  'history',
  'knowledge',
  'list',
  'parts',
  'people',
  'roles',
  'settings',
  'tickets',
  'trucks',
] as const;
export type TileSubject = (typeof TILE_SUBJECTS)[number];
