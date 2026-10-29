import { createContext } from 'react';
import { buildAbility, type AppAbility } from './keys';

export type PermissionsStatus = 'loading' | 'ready' | 'error';

export interface PermissionsState {
  status: PermissionsStatus;
  /** A new ability whenever the keys change, so every consumer re-renders. */
  ability: AppAbility;
  keys: readonly string[];
  /** Why the first fetch failed, for the error state. */
  error?: string;
  retry: () => void;
}

export const NO_PERMISSIONS = buildAbility([]);

export const PermissionsContext = createContext<PermissionsState>({
  status: 'loading',
  ability: NO_PERMISSIONS,
  keys: [],
  retry: () => {},
});
