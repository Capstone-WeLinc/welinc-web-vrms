import { createContext } from 'react';
import { ALL_MODULES_ON, buildAbility, type AppAbility, type Modules } from './keys';

export type PermissionsStatus = 'loading' | 'ready' | 'error';

export interface PermissionsState {
  status: PermissionsStatus;
  /** A new ability whenever the keys change, so every consumer re-renders. */
  ability: AppAbility;
  keys: readonly string[];
  /** Which modules are on (spec 0012, AC-12). */
  modules: Modules;
  /** Spec 0027: the caller is an active, assignable roster member. */
  inRoster: boolean;
  /** Why the first fetch failed, for the error state. */
  error?: string;
  retry: () => void;
  /** Refetches in the background, keeping what shows until the answer arrives (spec 0012, AC-22). */
  refresh: () => void;
}

export const NO_PERMISSIONS = buildAbility([]);

export const PermissionsContext = createContext<PermissionsState>({
  status: 'loading',
  ability: NO_PERMISSIONS,
  keys: [],
  modules: ALL_MODULES_ON,
  inRoster: false,
  retry: () => {},
  refresh: () => {},
});
