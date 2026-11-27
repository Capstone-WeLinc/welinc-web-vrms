import type { AuditChange, RepairStatus } from '../../types';
import api from './axios';
import { refreshNavCounts } from '../navCounts';

// Spec 0007: the knowledge base in welinc-backend-vrms (/vrms/knowledge).

export type KnowledgeEntryStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type RepairPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type EntryStatusFilter = KnowledgeEntryStatus | 'ALL';
export type EntrySort = 'seen' | 'updated' | 'name';

export interface IssueCategory {
  id: string;
  name: string;
  description: string | null;
  /** Spec 0030, AC-4: usual shop hours for its issues; null adds nothing to a due date. */
  fixHours: number | null;
  isActive: boolean;
  sortOrder: number;
  /** Entries in every status. */
  entryCount: number;
  updatedAt: string;
}

export interface KnowledgeEntrySummary {
  id: string;
  name: string;
  category: { id: string; name: string };
  status: KnowledgeEntryStatus;
  symptoms: string;
  estimatedHours: number | null;
  updatedAt: string;
  seenCount: number;
  lastSeenAt: string | null;
  /** Median hours over 3 or more samples, else null. */
  typicalHours: number | null;
  /** Editors only. */
  typicalCost?: number | null;
}

export interface KnowledgeEntryList {
  data: KnowledgeEntrySummary[];
  total: number;
  /** Entries in any status (Active only for a mechanic), to tell an empty library from no match. */
  libraryTotal: number;
  /** Entries per category id under the current status filter. */
  categoryCounts: Record<string, number>;
}

export interface EntryStats {
  seenCount: number;
  lastSeenAt: string | null;
  typicalHours: number | null;
  hoursSamples: number;
  estimatedHours: number | null;
  typicalDays: number | null;
  /** Editors only. */
  typicalCost?: number | null;
}

export interface KnowledgeEntryDetail {
  id: string;
  name: string;
  category: { id: string; name: string; isActive: boolean };
  status: KnowledgeEntryStatus;
  symptoms: string;
  descriptionTemplate: string | null;
  suggestedPriority: RepairPriority;
  estimatedHours: number | null;
  safetyNotes: string | null;
  steps: { position: number; text: string }[];
  parts: { position: number; name: string }[];
  stats: EntryStats;
  repeatVehicles: { plate: string; count: number; lastAt: string }[];
  /** Editors only. */
  recentTickets?: { id: string; repairNumber: string; status: RepairStatus; plate: string; createdAt: string }[];
  createdByEmail: string;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface EntryListParams {
  q?: string;
  categoryId?: string;
  status?: EntryStatusFilter;
  sort?: EntrySort;
  page?: number;
}

export async function getCategories(includeInactive = false): Promise<IssueCategory[]> {
  const response = await api.get<IssueCategory[]>('/vrms/knowledge/categories', {
    params: includeInactive ? { includeInactive: true } : undefined,
  });
  return response.data;
}

export async function getEntries(params: EntryListParams): Promise<KnowledgeEntryList> {
  const response = await api.get<KnowledgeEntryList>('/vrms/knowledge/entries', { params });
  return response.data;
}

/** An Active entry for the repair form picker and the ticket's link Combobox (AC-24). */
export interface EntryOption {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  symptoms: string;
  suggestedPriority: RepairPriority;
  descriptionTemplate: string | null;
  estimatedHours: number | null;
  seenCount: number;
  typicalHours: number | null;
  /** Editors only. */
  typicalCost?: number | null;
}

/** Every Active entry, most seen first. */
export async function getEntryOptions(): Promise<EntryOption[]> {
  const response = await api.get<EntryOption[]>('/vrms/knowledge/entries/options');
  return response.data;
}

export async function getEntry(id: string): Promise<KnowledgeEntryDetail> {
  const response = await api.get<KnowledgeEntryDetail>(`/vrms/knowledge/entries/${id}`);
  return response.data;
}

// ── Editing (AC-16 to AC-23) ──────────────────────────────────────────────

/** The editor's fields. Steps and parts are saved as a full list, positions 1..n. */
export interface EntryFields {
  name: string;
  categoryId: string;
  suggestedPriority: RepairPriority;
  estimatedHours: number | null;
  symptoms: string;
  descriptionTemplate: string | null;
  safetyNotes: string | null;
  steps: string[];
  parts: string[];
}

/** One save on an entry, with every field it changed (spec 0010, the audit log shape). */
export interface EntryChange {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  changes: AuditChange[];
  note: string | null;
  createdAt: string;
}

/** linkIssueIds and suggestionId come from Suggestions (AC-33, AC-35). */
export async function createEntry(
  fields: EntryFields & { status: 'DRAFT' | 'ACTIVE'; linkIssueIds?: string[]; suggestionId?: string },
) {
  const response = await api.post<{ entry: KnowledgeEntryDetail; linked: number; skipped: number }>(
    '/vrms/knowledge/entries',
    fields,
  );
  return response.data;
}

export async function updateEntry(id: string, fields: EntryFields, lastUpdatedAt: string) {
  const response = await api.patch<KnowledgeEntryDetail>(`/vrms/knowledge/entries/${id}`, { ...fields, lastUpdatedAt });
  return response.data;
}

export async function setEntryStatus(id: string, status: KnowledgeEntryStatus, lastUpdatedAt: string) {
  const response = await api.patch<KnowledgeEntryDetail>(`/vrms/knowledge/entries/${id}/status`, { status, lastUpdatedAt });
  return response.data;
}

export async function getEntryChanges(id: string): Promise<EntryChange[]> {
  const response = await api.get<EntryChange[]>(`/vrms/knowledge/entries/${id}/changes`);
  return response.data;
}

export async function createCategory(name: string, description: string | null, fixHours: number | null = null) {
  const response = await api.post<IssueCategory>('/vrms/knowledge/categories', { name, description, fixHours });
  return response.data;
}

export async function updateCategory(
  id: string,
  patch: { name?: string; description?: string | null; fixHours?: number | null; isActive?: boolean; sortOrder?: number },
  lastUpdatedAt: string,
) {
  const response = await api.patch<IssueCategory>(`/vrms/knowledge/categories/${id}`, { ...patch, lastUpdatedAt });
  return response.data;
}

// ── Suggestions (AC-32 to AC-36) ──────────────────────────────────────────

export interface SuggestionGroup {
  issueIds: string[];
  size: number;
  /** Set when every issue in the group shares one category. */
  categoryId: string | null;
  categoryName: string | null;
  /** Newest first. */
  issues: { issueId: string; ticketId: string; repairNumber: string; description: string; resolutionNote: string | null; createdAt: string }[];
}

export type SuggestionKind = 'CHANGE' | 'NEW_ENTRY';

export interface MechanicSuggestion {
  id: string;
  kind: SuggestionKind;
  body: string;
  createdByEmail: string;
  createdAt: string;
  /** The entry a CHANGE is about. */
  entry: { id: string; name: string } | null;
  /** The ticket issue it was suggested from. */
  source: { issueId: string; description: string; ticketId: string; repairNumber: string } | null;
}

export interface SuggestionsResponse {
  groups: SuggestionGroup[];
  suggestions: MechanicSuggestion[];
  openCount: number;
}

export async function getSuggestions(): Promise<SuggestionsResponse> {
  const response = await api.get<SuggestionsResponse>('/vrms/knowledge/suggestions');
  return response.data;
}

/** Open mechanic suggestions only, for the tab badge (AC-36). */
export async function getSuggestionCount(): Promise<number> {
  const response = await api.get<{ openCount: number }>('/vrms/knowledge/suggestions/count');
  return response.data.openCount;
}

export async function createSuggestion(input: { kind: SuggestionKind; body: string; entryId?: string; repairIssueId?: string }) {
  const response = await api.post<{ id: string }>('/vrms/knowledge/suggestions', input);
  refreshNavCounts(); // spec 0027, AC-7: the sidebar counts follow your own moves
  return response.data;
}

export async function resolveSuggestion(id: string, status: 'ACCEPTED' | 'DISMISSED') {
  const response = await api.patch<{ id: string }>(`/vrms/knowledge/suggestions/${id}`, { status });
  refreshNavCounts(); // spec 0027, AC-7: the sidebar counts follow your own moves
  return response.data;
}

export async function dismissGroup(issueIds: string[]): Promise<number> {
  const response = await api.post<{ dismissed: number }>('/vrms/knowledge/suggestions/dismiss-group', { issueIds });
  refreshNavCounts(); // spec 0027, AC-7: the sidebar counts follow your own moves
  return response.data.dismissed;
}
