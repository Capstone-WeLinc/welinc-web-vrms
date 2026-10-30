import type { ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAbility } from '@casl/react';
import { Settings } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { BackLink } from '../../../components/shared/BackLink';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { AppAbility, PermissionKey } from '../../../lib/permissions/keys';
import { useCan } from '../../../lib/permissions/usePermissions';
import { ForbiddenPage } from '../../../pages/ForbiddenPage';
import { SettingsSectionNav } from '../components/SettingsSectionNav';
import { allowedSections } from '../lib/sections';

function useAllowedSections() {
  const ability = useAbility<AppAbility>();
  return allowedSections((key) => ability.can(key, 'Permission'));
}

/**
 * The Admin Settings hub (spec 0012, AC-21). Desktop: the section list beside the open section.
 * Phone: /settings is the list, and each section opens full width with a back link.
 */
export function SettingsPage() {
  const sections = useAllowedSections();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const atIndex = pathname.replace(/\/+$/, '') === '/settings';

  return (
    <div>
      <PageHeader title="Settings" subtitle="How VRMS works for every garage. Changes apply at once." icon={Settings} />
      <div className="md:grid md:grid-cols-4 md:gap-6">
        {(!isMobile || atIndex) && (
          <aside className="md:col-span-1">
            <SettingsSectionNav sections={sections} />
          </aside>
        )}
        {(!isMobile || !atIndex) && (
          <div className="min-w-0 md:col-span-3">
            {isMobile && <BackLink to="/settings" label="All settings" />}
            <Outlet />
          </div>
        )}
      </div>
    </div>
  );
}

/** /settings opens the first allowed section on desktop; on phones the list above is the page. */
export function SettingsIndex() {
  const sections = useAllowedSections();
  const isMobile = useIsMobile();
  if (sections.length === 0) return <Navigate to="/dashboard" replace />;
  return isMobile ? null : <Navigate to={`/settings/${sections[0].path}`} replace />;
}

/** A section URL opened without its key shows the 403 page (AC-21). */
export function RequireSection({ permission, children }: { permission: PermissionKey; children: ReactElement }) {
  return useCan(permission) ? children : <ForbiddenPage />;
}
