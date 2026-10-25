import type { RepairStatus } from '../../types';
import api from './axios';

// Spec 0007: the knowledge base in welinc-backend-vrms (/vrms/knowledge).

export type KnowledgeEntryStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type RepairPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type EntryStatusFilter = KnowledgeEntryStatus | 'ALL';
export type EntrySort = 'seen' | 'updated' | 'name';

export interface IssueCategory {
  id: string;
  name: string;
  description: string | null;
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

export interface EntryChange {
  id: string;
  email: string;
  action: string;
  fieldName: string | null;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export async function createEntry(fields: EntryFields & { status: 'DRAFT' | 'ACTIVE' }) {
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

export async function createCategory(name: string, description: string | null) {
  const response = await api.post<IssueCategory>('/vrms/knowledge/categories', { name, description });
  return response.data;
}

export async function updateCategory(
  id: string,
  patch: { name?: string; description?: string | null; isActive?: boolean; sortOrder?: number },
  lastUpdatedAt: string,
) {
  const response = await api.patch<IssueCategory>(`/vrms/knowledge/categories/${id}`, { ...patch, lastUpdatedAt });
  return response.data;
}
