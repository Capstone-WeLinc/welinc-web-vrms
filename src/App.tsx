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
import { KnowledgeBasePage } from './features/knowledge-base/pages/KnowledgeBasePage';
import { useAuthStore } from './store/authStore';
import { DashboardShell } from './components/layout/DashboardShell';
import type { User, UserRole } from './types';
import { getCurrentUser } from './lib/api/authApi';
import { Toaster } from './components/ui/sonner';
import { ConfirmProvider } from './components/shared/confirm/ConfirmProvider';
import { TooltipProvider } from './components/ui/tooltip';
import SessionMonitor from './components/SessionMonitor';

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

function RequireRole({ role, children }: { role: UserRole; children: ReactElement }) {
  const user = useAuthStore((state) => state.user);

  if (!user || user.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

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
              <DashboardShell />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="repairs" element={<RepairListPage />} />
          <Route
            path="repairs/new"
            element={
              <RequireRole role="ADMIN">
                <RepairFormPage />
              </RequireRole>
            }
          />
          <Route path="repairs/:repairId" element={<RepairDetailPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="users"
            element={
              <RequireRole role="ADMIN">
                <UsersPage />
              </RequireRole>
            }
          />
          <Route
            path="audit-logs"
            element={
              <RequireRole role="ADMIN">
                <AuditLogsPage />
              </RequireRole>
            }
          />
          <Route
            path="analytics"
            element={
              <RequireRole role="ADMIN">
                <AnalyticsPage />
              </RequireRole>
            }
          />
          <Route path="knowledge-base" element={<KnowledgeBasePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </TooltipProvider>
  );
}

export default App;
