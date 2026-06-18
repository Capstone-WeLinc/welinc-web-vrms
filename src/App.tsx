import { useEffect } from 'react';
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
import { useAuthStore } from './store/authStore';
import { DashboardShell } from './components/layout/DashboardShell';
import { UserRole } from './types';
import { getCurrentUser } from './lib/api/authApi';
import { ToastProvider } from './context/ToastContext';
import SessionMonitor from './components/SessionMonitor';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function RequireRole({ role, children }: { role: UserRole; children: JSX.Element }) {
  const user = useAuthStore((state) => state.user);

  if (!user || user.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const token = useAuthStore((state) => state.token);
  const setUser = (user: any) => useAuthStore.setState({ user });

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
              name: fullUser.name || currentUser.name || currentUser.email,
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
    <ToastProvider>
      <SessionMonitor />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
