import type { IssueCategory } from '../../../lib/api/knowledgeApi';
import type { MyPermissions } from '../../../lib/api/permissionsApi';
import type { HistoryChange, Setting, SettingsView } from '../../../lib/api/settingsApi';
import type { DataMode } from './dataMode';
import { dashboardTickets } from './dashboardData';
import { decoratedTicket } from './ticketData';

// Development only (break-ui): the Settings hub's datasets. Each takes the real response and
// changes only what a real admin, actor or catalog could produce. Limits: actor name 100 and
// email 255 (setting_changes), note 500 (NOTE_MAX), category name 50 and
// description 200 (issue_categories). Catalog labels are code, so their worst case is the
// longest real label or a believable next entry. Fixtures are built on call, never at module
// level, so production drops this file.

type Actor = { name: string | null; email: string | null };

const LONG_NAME: Actor = { name: 'Aleksandra Wiśniewska-Kowalczyk', email: 'aleksandra.wisniewska-kowalczyk@welinc.example.com' };
const EMAIL_ONLY: Actor = { name: null, email: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com' };
const SHORT_NAME: Actor = { name: 'Jo', email: 'jo@welinc.example.com' };
const DIACRITICS: Actor = { name: 'Đặng Thị Ngọc Hân', email: 'ngochan.dang@welinc.example.com' };

// 500 characters, the most a note can hold
const LONG_NOTE =
  'Raising the repeat window back to three years. The Marikina garage audit found buses that come back every 13 to 14 months ' +
  'for the same alternator fault, and the one year window hid them from the repeat list. Agreed with Chief Mechanic Đặng Thị ' +
  'Ngọc Hân on the 28 October call, audit notes at https://example.com/welinc/garages/marikina/audits/2026-10/repeat-vehicles' +
  '?tab=alternators&filter=unresolved. Revisit after the December fleet review if the list gets too long to act on. Ops leads agreed too.';

const ODD_NOTE = 'Line one of the reason\nLine two after Enter <script>alert(1)</script> &amp; **not bold**';

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

// ---------- GET /vrms/settings ----------

function futureValue(partial: Pick<Setting, 'key' | 'group' | 'label' | 'description' | 'unit' | 'min' | 'max' | 'default' | 'value' | 'module'>): Setting {
  const isDefault = partial.value === partial.default;
  return {
    kind: 'value',
    type: 'int',
    isDefault,
    hides: [],
    requires: [],
    updatedAt: isDefault ? null : minutesAgo(90),
    updatedBy: isDefault ? null : LONG_NAME,
    ...partial,
  };
}

/** A module the catalog may grow (feature 40), so the dialog lists a dependent. */
const PARTS_MODULE: Setting = {
  key: 'module.parts',
  kind: 'module',
  group: 'Modules',
  label: 'Parts, suppliers and purchase orders',
  description: 'Parts stock per garage, supplier price lists and purchase orders raised from repair tickets.',
  type: 'boolean',
  unit: null,
  min: null,
  max: null,
  default: true,
  value: true,
  isDefault: true,
  hides: ['Parts page and stock counts per garage', 'Supplier price lists', 'Purchase orders raised from repair tickets', 'Low stock alerts'],
  requires: ['module.knowledge'],
  module: null,
  updatedAt: null,
  updatedBy: null,
};

const futureValues = (): Setting[] => [
  futureValue({
    key: 'ai.min_confidence',
    group: 'AI diagnosis and similar issue matching',
    label: 'Lowest confidence a diagnosis needs before mechanics see it on the ticket',
    description: 'Diagnoses below this are kept for feedback but not shown.',
    unit: 'percent',
    min: 0,
    max: 100,
    default: 60,
    value: 100,
    module: 'ai',
  }),
  futureValue({
    key: 'costs.approval_limit',
    group: 'Costs',
    label: 'Cost that needs a Chief Mechanic',
    description: 'Repairs above this wait for approval before work starts.',
    unit: 'pesos',
    min: 0,
    max: 1000000,
    default: 25000,
    value: 999999,
    module: null,
  }),
];

function worstSettings(real: SettingsView): SettingsView {
  const settings = real.settings.map((setting): Setting => {
    switch (setting.key) {
      case 'module.ai':
        return { ...setting, value: false, isDefault: false, updatedAt: minutesAgo(3), updatedBy: EMAIL_ONLY };
      case 'module.knowledge':
        return {
          ...setting,
          hides: [...setting.hides, 'Repeat vehicle flags on the vehicle page and the "keeps coming back" banner on open tickets'],
        };
      case 'knowledge.repeat_window_days':
        return { ...setting, value: 1095, isDefault: false, updatedAt: minutesAgo(60 * 26), updatedBy: LONG_NAME };
      case 'knowledge.group_min_size':
        return { ...setting, value: 2, isDefault: false, updatedAt: minutesAgo(60 * 24 * 12), updatedBy: SHORT_NAME };
      default:
        return setting;
    }
  });
  const lastModule = settings.map((s) => s.kind).lastIndexOf('module');
  settings.splice(lastModule + 1, 0, PARTS_MODULE);
  return { ...real, settings: [...settings, ...futureValues()] };
}

// ---------- GET /vrms/settings/changes ----------

function settingRow(id: string, partial: Omit<HistoryChange, 'id' | 'kind' | 'roleLabel'>): HistoryChange {
  return { id, kind: 'setting', roleLabel: null, ...partial };
}

const worstHistory = (): HistoryChange[] => [
  settingRow('w1', { key: 'knowledge.repeat_window_days', label: 'Repeat window', before: 365, after: 1095, action: 'SET', actor: LONG_NAME, note: LONG_NOTE, createdAt: minutesAgo(0) }),
  settingRow('w2', { key: 'module.ai', label: 'AI', before: true, after: false, action: 'SET', actor: EMAIL_ONLY, note: 'Gemini quota ran out', createdAt: minutesAgo(3) }),
  {
    id: 'w3',
    kind: 'lookup',
    key: 'lookup.corporation',
    label: 'Corporations: Northern Luzon Refrigerated Freight and Cold Chain Logistics Corporation',
    roleLabel: null,
    before: { name: 'NL Refrigerated Freight', isActive: true },
    after: { name: 'Northern Luzon Refrigerated Freight and Cold Chain Logistics Corporation', isActive: true },
    action: 'RENAME',
    actor: null,
    note: null,
    createdAt: '2026-12-31T23:30:00-08:00',
  },
  settingRow('w4', { key: 'knowledge.group_min_size', label: 'Smallest suggested group', before: 3, after: 2, action: 'SET', actor: SHORT_NAME, note: ODD_NOTE, createdAt: minutesAgo(60 * 24 * 12) }),
  settingRow('w5', { key: 'knowledge.min_samples', label: 'Repairs before typical time and cost', before: 20, after: 3, action: 'RESET', actor: DIACRITICS, note: '', createdAt: minutesAgo(60 * 24 * 400) }),
  settingRow('w6', {
    key: 'knowledge.legacy_window_days',
    label: 'knowledge.legacy_window_days',
    before: 30,
    after: null,
    action: 'SET',
    actor: { name: 'Christopher Alexander Montgomery III', email: null },
    note: 'Key removed from the catalog',
    createdAt: '1970-01-01T00:00:00.000Z',
  }),
  settingRow('w7', { key: 'costs.approval_limit', label: 'Cost that needs a Chief Mechanic', before: 25000, after: 999999, action: 'SET', actor: LONG_NAME, note: null, createdAt: minutesAgo(60 * 30) }),
  settingRow('w8', { key: 'module.knowledge', label: 'Knowledge base', before: false, after: true, action: 'SET', actor: { name: '  Sam   Lee ', email: null }, note: 'Back on', createdAt: minutesAgo(60 * 50) }),
];

const HUGE_TOTAL = 1284;
const HUGE_KEYS = [
  ['knowledge.repeat_window_days', 'Repeat window'],
  ['knowledge.min_samples', 'Repairs before typical time and cost'],
  ['knowledge.group_min_size', 'Smallest suggested group'],
  ['knowledge.repeat_threshold', 'Repairs that mark a repeat vehicle'],
] as const;
const HUGE_ACTORS = [LONG_NAME, EMAIL_ONLY, SHORT_NAME, DIACRITICS];

// A module change sits this far back, past what a client reading only the newest 100 rows sees
const HUGE_MODULE_CHANGE_AT = 150;

function hugeHistory(): HistoryChange[] {
  return Array.from({ length: HUGE_TOTAL }, (_, i) => {
    if (i === HUGE_MODULE_CHANGE_AT) {
      return settingRow(`h${i}`, { key: 'module.ai', label: 'AI', before: true, after: false, action: 'SET', actor: SHORT_NAME, note: 'Quota ran out', createdAt: minutesAgo(i * 37) });
    }
    const [key, label] = HUGE_KEYS[i % HUGE_KEYS.length];
    return settingRow(`h${i}`, {
      key,
      label,
      before: 3 + (i % 7),
      after: 4 + (i % 7),
      action: 'SET',
      actor: HUGE_ACTORS[i % HUGE_ACTORS.length],
      note: i % 3 === 0 ? LONG_NOTE : null,
      createdAt: minutesAgo(i * 37),
    });
  });
}

function historyRows(mode: DataMode): HistoryChange[] {
  if (mode === 'empty') return [];
  if (mode === 'one') return worstHistory().slice(1, 2);
  if (mode === 'huge') return hugeHistory();
  return worstHistory();
}

function settingChanges(mode: DataMode, params: Record<string, unknown>) {
  const kind = params.kind ?? 'all';
  const limit = Number(params.limit ?? 20);
  const start = Number(params.cursor ?? 0);
  const keys = typeof params.keys === 'string' ? params.keys.split(',') : null;
  // Kind, then keys, then the limit, as the server does (AC-31); nothing is validated here
  const rows = historyRows(mode)
    .filter((row) => kind === 'all' || row.kind === kind)
    .filter((row) => !keys || keys.includes(row.key));
  const end = start + limit;
  return { data: rows.slice(start, end), nextCursor: end < rows.length ? String(end) : null };
}

// /vrms/permissions/me stays real (its three roles are fixed); matrix history is in the portal now

// ---------- GET /vrms/knowledge/categories ----------

function category(id: string, partial: Omit<IssueCategory, 'id' | 'updatedAt'>): IssueCategory {
  return { id, updatedAt: minutesAgo(60), ...partial };
}

const worstCategories = (): IssueCategory[] => [
  // 50 characters, the column limit
  category('c1', { name: 'Air conditioning, heating and ventilation (HVAC/R)', description: null, isActive: true, sortOrder: 1, entryCount: 1284 }),
  category('c2', {
    name: 'AC',
    // 200 characters, the column limit
    description:
      'Compressor, condenser and blower faults on the Hino and Isuzu buses, including refrigerant leaks found during the dry season checks. Use HVAC for total climate control faults on the newer Higer units.',
    isActive: true,
    sortOrder: 2,
    entryCount: 1,
  }),
  category('c3', { name: 'Turbocharger/intercooler/wastegate', description: 'See https://example.com/welinc/kb/turbo-intercooler-wastegate-diagnosis-flowchart-v3', isActive: false, sortOrder: 3, entryCount: 0 }),
  category('c4', { name: 'Đèn và hệ thống điện', description: 'Lights and electrical, from the Vietnamese supplier sheet', isActive: true, sortOrder: 4, entryCount: 42 }),
  category('c5', { name: 'Brakes <rear> & "ABS"', description: 'Rear drums and ABS wheel sensors', isActive: true, sortOrder: 5, entryCount: 7 }),
];

const SYSTEMS = ['Brakes', 'Suspension', 'Steering', 'Engine cooling', 'Fuel system', 'Exhaust', 'Transmission', 'Clutch', 'Electrical', 'Body and glass'];
const PARTS = ['front', 'rear', 'left side', 'right side', 'sensors', 'wiring', 'leaks', 'noise', 'warning light', 'after service', 'intermittent', 'on hills', 'in rain', 'cold start', 'under load'];

function hugeCategories(): IssueCategory[] {
  return Array.from({ length: SYSTEMS.length * PARTS.length }, (_, i) =>
    category(`hc${i}`, {
      name: `${SYSTEMS[i % SYSTEMS.length]}, ${PARTS[Math.floor(i / SYSTEMS.length)]}`,
      description: i % 4 === 0 ? null : 'Split out of the old catch-all category after the 2026 audit.',
      isActive: i % 9 !== 0,
      sortOrder: i,
      entryCount: (i * 97) % 1500,
    }),
  );
}

function categories(mode: DataMode): IssueCategory[] {
  if (mode === 'empty') return [];
  if (mode === 'one') return [{ ...worstCategories()[1], entryCount: 1 }];
  if (mode === 'huge') return hugeCategories();
  return worstCategories();
}

// ---------- The boundary ----------

/**
 * A list served without the server, or undefined to ask it. These are made up whole, and their
 * cursors are not ones the server would accept.
 */
export function madeUpData(mode: DataMode, url: string, params: Record<string, unknown>): unknown {
  if (mode === 'demo') return undefined;
  const tickets = dashboardTickets(mode, url, params);
  if (tickets) return tickets;
  switch (url.split('?')[0]) {
    case '/vrms/settings/changes':
      return settingChanges(mode, params);
    case '/vrms/knowledge/categories':
      return categories(mode);
    default:
      return undefined;
  }
}

/**
 * The real response changed only where the worst case must, or undefined to keep it as sent, so
 * the live catalog still shows.
 */
export function decoratedData(mode: DataMode, url: string, real: unknown): unknown {
  // The ticket detail page has its own datasets for every mode (spec 0014 UI)
  const ticket = decoratedTicket(mode, url, real);
  if (ticket) return ticket;
  if (mode !== 'worst') return undefined;
  switch (url.split('?')[0]) {
    case '/vrms/settings':
      return worstSettings(real as SettingsView);
    case '/vrms/permissions/me': {
      const me = real as MyPermissions;
      return { ...me, modules: { ...me.modules, ai: false } };
    }
    default:
      return undefined;
  }
}

/** Saves would mix fixture versions with the live database, so they are refused while a fixture shows. */
export function isSettingsHubWrite(method: string | undefined, url: string | undefined) {
  if (!method || method.toLowerCase() === 'get' || !url) return false;
  return /^\/vrms\/(settings|permissions|knowledge\/categories)/.test(url);
}
