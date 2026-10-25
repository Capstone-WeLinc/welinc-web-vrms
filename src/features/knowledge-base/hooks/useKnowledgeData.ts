import { getCategories, getEntries, getEntry, type EntryListParams } from '../../../lib/api/knowledgeApi';
import { useLoad } from './useLoad';

const fetchEntries = (key: string) => getEntries(JSON.parse(key) as EntryListParams);
const fetchCategories = (key: string) => getCategories(key === 'all');
const fetchEntry = (key: string) => getEntry(key);

/** One page of library results (AC-9). A string key, so equal params never refetch. */
export function useEntryList(params: EntryListParams) {
  return useLoad(JSON.stringify(params), fetchEntries, 'The knowledge base didn’t load.');
}

/** Active categories, or every category for an editor who asks for inactive ones too. */
export function useCategories(includeInactive = false) {
  return useLoad(includeInactive ? 'all' : 'active', fetchCategories, 'Categories didn’t load.');
}

/** Null loads nothing (the new entry editor). */
export function useEntry(id: string | null) {
  return useLoad(id, fetchEntry, 'This entry didn’t load.');
}
