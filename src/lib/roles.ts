import type { UserRole } from '../types';

/**
 * A chief mechanic follows the mechanic rules on tickets until feature 17 widens it (spec 0007, AC-2).
 */
export function isMechanicRole(role: UserRole | string | undefined) {
  return role === 'MECHANIC' || role === 'CHIEF_MECHANIC';
}

/** Knowledge base editors (spec 0007, AC-3); readers are editors plus MECHANIC. */
export const KNOWLEDGE_EDITOR_ROLES: UserRole[] = ['ADMIN', 'CHIEF_MECHANIC'];

export function isKnowledgeEditor(role: UserRole | string | undefined) {
  return role === 'ADMIN' || role === 'CHIEF_MECHANIC';
}
