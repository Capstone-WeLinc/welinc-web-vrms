import { lazy, Suspense, useEffect, type ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { HistoryPage } from './features/repair/pages/HistoryPage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RepairDetailPage } from './features/repair/pages/RepairDetailPage';
import { RepairFormPage } from './features/repair/pages/RepairFormPage';
import { RepairListPage } from './features/repair/pages/RepairListPage';
import { UsersPage } from './features/user-management/pages/UsersPage';
import { AuditLogsPage } from './features/audit-logs/pages/AuditLogsPage';
import { ProfilePage } from './features/auth/pages/ProfilePage';
import { AnalyticsPage } from './features/analytics/pages/AnalyticsPage';
import { KnowledgeCategoriesPage } from './features/knowledge-base/pages/KnowledgeCategoriesPage';
import { KnowledgeEditorPage } from './features/knowledge-base/pages/KnowledgeEditorPage';
import { KnowledgeEntryPage } from './features/knowledge-base/pages/KnowledgeEntryPage';
import { KnowledgeLibraryPage } from './features/knowledge-base/pages/KnowledgeLibraryPage';
import { KnowledgeSuggestionsPage } from './features/knowledge-base/pages/KnowledgeSuggestionsPage';
import { useAuthStore } from './store/authStore';
import { DashboardShell } from './components/layout/DashboardShell';
import type { User } from './types';
import { getCurrentUser } from './lib/api/authApi';
import { Toaster } from './components/ui/sonner';
import { ConfirmProvider } from './components/shared/confirm/ConfirmProvider';
import { TooltipProvider } from './components/ui/tooltip';
import SessionMonitor from './components/SessionMonitor';
import { PermissionsProvider } from './lib/permissions/PermissionsProvider';
import { PermissionsGate } from './components/layout/PermissionsGate';
import { useCan } from './lib/permissions/usePermissions';
import type { PermissionKey } from './lib/permissions/keys';

// Development only: the condition is a build time constant, so production drops the import.
const DevUiPage = import.meta.env.DEV
  ? lazy(() => import('./features/dev-ui/pages/DevUiPage').then((m) => ({ default: m.DevUiPage })))
  : null;

function RequireAuth({ children }: { children: ReactElement }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/** Spec 0011, AC-22: the page needs any one of these keys, or it sends you to the dashboard. */
function RequirePermission({ keys, children }: { keys: PermissionKey[]; children: ReactElement }) {
  const allowed = useCan(...keys);
  return allowed ? children : <Navigate to="/dashboard" replace />;
}

const TICKET_READ: PermissionKey[] = ['ticket.view', 'ticket.view_all'];
const KNOWLEDGE_READ: PermissionKey[] = ['knowledge.view'];
const KNOWLEDGE_EDIT: PermissionKey[] = ['knowledge.edit'];

function App() {
  const token = useAuthStore((state) => state.token);
  const setUser = (user: User) => useAuthStore.setState({ user });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'welinc_token' || e.key === 'accessToken' || e.key === 'welinc_user') {
        window.location.reload();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (token) {
      getCurrentUser()
        .then((fullUser) => {
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            const updated = {
              ...currentUser,
              name: fullUser.name || '',
              email: fullUser.email || currentUser.email,
            };
            setUser(updated);
            localStorage.setItem('welinc_user', JSON.stringify(updated));
          }
        })
        .catch((err) => console.error('Failed to sync user details on mount:', err));
    }
  }, [token]);

  return (
    <TooltipProvider delayDuration={300}>
      <Toaster />
      <ConfirmProvider />
      <SessionMonitor />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {DevUiPage && (
          <Route
            path="/dev/ui"
            element={
              <Suspense fallback={null}>
                <DevUiPage />
              </Suspense>
            }
          />
        )}
        <Route
          path="/"
          element={
            <RequireAuth>
              <PermissionsProvider>
                <PermissionsGate>
                  <DashboardShell />
                </PermissionsGate>
              </PermissionsProvider>
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            path="repairs"
            element={
              <RequirePermission keys={TICKET_READ}>
                <RepairListPage />
              </RequirePermission>
            }
          />
          <Route
            path="repairs/new"
            element={
              <RequirePermission keys={['ticket.create']}>
                <RepairFormPage />
              </RequirePermission>
            }
          />
          <Route
            path="repairs/:repairId"
            element={
              <RequirePermission keys={TICKET_READ}>
                <RepairDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="history"
            element={
              <RequirePermission keys={TICKET_READ}>
                <HistoryPage />
              </RequirePermission>
            }
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="users"
            element={
              <RequirePermission keys={['users.manage']}>
                <UsersPage />
              </RequirePermission>
            }
          />
          <Route
            path="audit-logs"
            element={
              <RequirePermission keys={['audit.view']}>
                <AuditLogsPage />
              </RequirePermission>
            }
          />
          <Route
            path="analytics"
            element={
              <RequirePermission keys={['analytics.view']}>
                <AnalyticsPage />
              </RequirePermission>
            }
          />
          <Route
            path="knowledge-base"
            element={
              <RequirePermission keys={KNOWLEDGE_READ}>
                <KnowledgeLibraryPage />
              </RequirePermission>
            }
          />
          <Route
            path="knowledge-base/:entryId"
            element={
              <RequirePermission keys={KNOWLEDGE_READ}>
                <KnowledgeEntryPage />
              </RequirePermission>
            }
          />
          <Route
            path="knowledge-base/new"
            element={
              <RequirePermission keys={KNOWLEDGE_EDIT}>
                <KnowledgeEditorPage />
              </RequirePermission>
            }
          />
          <Route
            path="knowledge-base/:entryId/edit"
            element={
              <RequirePermission keys={KNOWLEDGE_EDIT}>
                <KnowledgeEditorPage />
              </RequirePermission>
            }
          />
          <Route
            path="knowledge-base/suggestions"
            element={
              <RequirePermission keys={KNOWLEDGE_EDIT}>
                <KnowledgeSuggestionsPage />
              </RequirePermission>
            }
          />
          <Route
            path="knowledge-base/categories"
            element={
              <RequirePermission keys={KNOWLEDGE_EDIT}>
                <KnowledgeCategoriesPage />
              </RequirePermission>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </TooltipProvider>
  );
}

export default App;
