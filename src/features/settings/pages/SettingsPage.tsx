import { useEffect, useRef, type ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAbility } from '@casl/react';

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
  const current = sections.find((s) => pathname.startsWith(`/settings/${s.path}`));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastPath = useRef(pathname);

  // A section picked from the list moves focus to its heading, so a keyboard user lands on it
  useEffect(() => {
    if (lastPath.current !== pathname && current) headingRef.current?.focus();
    lastPath.current = pathname;
  }, [pathname, current]);

  return (
    <div>
      <PageHeader title="Settings" context="How VRMS works for every garage." />
      <div className="md:grid md:grid-cols-4 md:gap-6">
        {(!isMobile || atIndex) && (
          <aside className="md:col-span-1">
            <SettingsSectionNav sections={sections} />
          </aside>
        )}
        {(!isMobile || !atIndex) && (
          <div className="min-w-0 md:col-span-3">
            {isMobile && <BackLink to="/settings" label="All settings" />}
            {current && (
              <div className="mb-4">
                <h2 ref={headingRef} tabIndex={-1} className="text-heading font-semibold text-foreground outline-none">
                  {current.label}
                </h2>
                <p className="mt-1 text-body text-pretty text-muted-foreground">{current.description}</p>
              </div>
            )}
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
