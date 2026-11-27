import { useAbility } from '@casl/react';
import type { AppAbility } from '../../lib/permissions/keys';
import { usePermissions } from '../../lib/permissions/usePermissions';
import { useNavCounts } from '../../lib/navCounts';
import { useAuthStore } from '../../store/authStore';
import { getNavSections, usesTabBar, withCounts } from './navItems';

/**
 * The nav for the signed in user's keys, with its counts (spec 0027); it follows the ability,
 * so a refetch updates it.
 */
export function useNavSections() {
  const ability = useAbility<AppAbility>();
  const { inRoster } = usePermissions();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const counts = useNavCounts(userId);
  return withCounts(getNavSections((key) => ability.can(key, 'Permission'), { inRoster }), counts);
}

/** True when phones show the bottom tab bar, so fixed bottom bars sit above it. */
export function useHasTabBar() {
  return usesTabBar(useNavSections());
}
