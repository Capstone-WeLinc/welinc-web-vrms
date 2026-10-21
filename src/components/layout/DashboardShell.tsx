import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function DashboardShell() {
  return (
    <div>
      <Sidebar />
      <div className="app-shell">
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
