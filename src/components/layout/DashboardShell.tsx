import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function DashboardShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-shell-container">
      <Sidebar onCollapse={setCollapsed} />
      <div 
        className="app-shell" 
        style={{ 
          marginLeft: collapsed ? '80px' : '280px',
          transition: 'margin-left 0.3s ease-in-out'
        }}
      >
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
