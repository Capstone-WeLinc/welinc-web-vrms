import { useAbility } from '@casl/react';
import type { AppAbility } from '../../lib/permissions/keys';
import { usePermissions } from '../../lib/permissions/usePermissions';
import { getNavSections, usesTabBar } from './navItems';

/** The nav for the signed in user's keys; it follows the ability, so a refetch updates it. */
export function useNavSections() {
  const ability = useAbility<AppAbility>();
  const { inRoster } = usePermissions();
  return getNavSections((key) => ability.can(key, 'Permission'), { inRoster });
}

/** True when phones show the bottom tab bar, so fixed bottom bars sit above it. */
export function useHasTabBar() {
  return usesTabBar(useNavSections());
}
