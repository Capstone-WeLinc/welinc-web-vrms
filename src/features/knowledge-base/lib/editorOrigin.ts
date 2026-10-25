import type { IssueCategory, MechanicSuggestion, SuggestionGroup } from '../../../lib/api/knowledgeApi';
import { EMPTY_ENTRY_FORM, SYMPTOMS_LIMIT, type EntryFormInput } from './entryFormSchema';

// Spec 0007, AC-33 and AC-35: "Create entry" on Suggestions opens the editor with what it came
// from in router state. The editor keeps it in memory and strips it from history, leaving
// `?from=suggestions`, so a reload knows the group was lost instead of linking stale issues.

export const FROM_SUGGESTIONS = 'suggestions';

export type EditorOrigin =
  | {
      kind: 'group';
      issueIds: string[];
      categoryId: string | null;
      /** Newest first; the first one prefills Symptoms. */
      issues: { issueId: string; repairNumber: string; description: string }[];
    }
  | { kind: 'suggestion'; suggestionId: string; body: string };

export function groupOrigin(group: SuggestionGroup): EditorOrigin {
  return {
    kind: 'group',
    issueIds: group.issueIds,
    categoryId: group.categoryId,
    issues: group.issues.map((i) => ({ issueId: i.issueId, repairNumber: i.repairNumber, description: i.description })),
  };
}

export function suggestionOrigin(suggestion: MechanicSuggestion): EditorOrigin {
  return { kind: 'suggestion', suggestionId: suggestion.id, body: suggestion.body };
}

/** Router state is untyped; accept only an origin this page could have sent. */
export function readOrigin(state: unknown): EditorOrigin | null {
  const origin = (state as { origin?: EditorOrigin } | null)?.origin;
  if (origin?.kind === 'group' && Array.isArray(origin.issueIds)) return origin;
  if (origin?.kind === 'suggestion' && typeof origin.suggestionId === 'string') return origin;
  return null;
}

/** "[Brakes] Wear and tear: squeal" → "Wear and tear: squeal". */
export function withoutSystemPrefix(description: string) {
  return description.replace(/^\[[^\]]*\]\s*/, '');
}

/** The new entry form, prefilled from where it came from (AC-33, AC-35). */
export function originDefaults(origin: EditorOrigin | null, categories: IssueCategory[]): EntryFormInput {
  if (!origin) return EMPTY_ENTRY_FORM;
  if (origin.kind === 'suggestion') return { ...EMPTY_ENTRY_FORM, symptoms: origin.body.slice(0, SYMPTOMS_LIMIT) };
  const newest = origin.issues[0]?.description ?? '';
  const category = origin.categoryId && categories.some((c) => c.id === origin.categoryId && c.isActive) ? origin.categoryId : '';
  return { ...EMPTY_ENTRY_FORM, categoryId: category, symptoms: withoutSystemPrefix(newest).slice(0, SYMPTOMS_LIMIT) };
}
