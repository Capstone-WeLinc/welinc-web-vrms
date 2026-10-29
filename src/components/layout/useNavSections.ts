import { useAbility } from '@casl/react';
import type { AppAbility } from '../../lib/permissions/keys';
import { useAuthStore } from '../../store/authStore';
import { getNavSections } from './navItems';

/** The nav for the signed in user's keys; it follows the ability, so a refetch updates it. */
export function useNavSections() {
  const ability = useAbility<AppAbility>();
  const role = useAuthStore((state) => state.user?.role);
  return getNavSections((key) => ability.can(key, 'Permission'), role);
}
