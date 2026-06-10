import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RepairDetailPage } from './pages/RepairDetailPage';
import { RepairFormPage } from './pages/RepairFormPage';
import { RepairListPage } from './pages/RepairListPage';
import { UsersPage } from './pages/UsersPage';
import { useAuthStore } from './store/authStore';
import { DashboardShell } from './components/layout/DashboardShell';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  return (
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
        <Route path="repairs/new" element={<RepairFormPage />} />
        <Route path="repairs/:repairId" element={<RepairDetailPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
