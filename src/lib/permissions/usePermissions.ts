import { useContext } from 'react';
import { useAbility } from '@casl/react';
import { PermissionsContext } from './context';
import type { AppAbility, PermissionKey } from './keys';

/** True when the signed in user holds any of these keys. */
export function useCan(...keys: PermissionKey[]): boolean {
  const ability = useAbility<AppAbility>();
  return keys.some((key) => ability.can(key, 'Permission'));
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
