import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  LogOut, 
  Sun, 
  Moon, 
  LayoutDashboard, 
  Wrench, 
  PlusCircle, 
  History, 
  Users, 
  PanelLeftClose, 
  PanelLeftOpen, 
  User,
  ClipboardList
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import logo from '../../assets/brand-logo.jpg';

const adminNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/repairs', label: 'Repair Tickets', icon: Wrench },
  { to: '/repairs/new', label: 'New Repair', icon: PlusCircle },
  { to: '/history', label: 'Repair History', icon: History },
  { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
  { to: '/users', label: 'Users', icon: Users },
];

const mechanicNavItems = [
  { to: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
  { to: '/repairs', label: 'My Repairs', icon: Wrench },
  { to: '/history', label: 'Repair History', icon: History },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MECHANIC: 'Mechanic',
  OPERATIONS: 'Operations',
  CUSTOMER_SUPPORT: 'Customer Support',
};

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ onCollapse }: SidebarProps) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vrms_theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('vrms_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    onCollapse?.(next);
  };

  const navItems = user?.role === 'ADMIN' ? adminNavItems : mechanicNavItems;
  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : '';

  const getSubsystemCount = () => {
    if (user?.roles && Array.isArray(user.roles)) {
      const subsystemRoles = user.roles.filter((r: any) =>
        ['VRMS', 'VMMS', 'BMS'].includes(r.system.toUpperCase())
      );
      const uniqueSystems = new Set(subsystemRoles.map((r: any) => r.system.toUpperCase()));
      return uniqueSystems.size;
    }
    try {
      const token = localStorage.getItem('welinc_token') || localStorage.getItem('token');
      if (!token) return 0;
      const [, payload] = token.split('.');
      if (!payload) return 0;
      let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      base64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      const decoded = JSON.parse(json) as { roles?: { system: string }[] };
      const subsystemRoles = (decoded.roles || []).filter((r) =>
        ['VRMS', 'VMMS', 'BMS'].includes(r.system.toUpperCase())
      );
      const uniqueSystems = new Set(subsystemRoles.map(r => r.system.toUpperCase()));
      return uniqueSystems.size;
    } catch (err) {
      console.error('Error parsing token to count subsystems:', err);
      return 2;
    }
  };

  const hasMultipleSystems = getSubsystemCount() > 1;

  const getPortalUrl = () => {
    const envUrl = (import.meta.env as any).VITE_PORTAL_URL;
    if (envUrl) return envUrl;
    return `${window.location.protocol}//${window.location.hostname}:5176`;
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSignOut = () => {
    logout();
    window.location.href = `${getPortalUrl()}/login?logout=true`;
  };

  const handleBackToPortal = () => {
    window.location.href = getPortalUrl();
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <img src={logo} alt="WeLinc" style={{ width: 46, height: 46, borderRadius: 10, flexShrink: 0 }} />
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>WeLinc VRMS</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Vehicle Repair System</div>
              </div>
            )}
          </div>
          <button 
            type="button" 
            onClick={toggleCollapse}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '6px',
              transition: 'all 0.2s',
              alignSelf: 'center',
            }}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* User profile layout placed at the top (like VMMS) */}
        {user && (
          <div className="sidebar-profile" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: collapsed ? '10px' : '12px 14px' }}>
            <div className="sidebar-avatar" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 36,
              width: 36,
              borderRadius: 8,
              background: 'var(--primary)',
              color: 'white',
              flexShrink: 0
            }}>
              <User size={18} strokeWidth={1.8} />
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div className="sidebar-profile-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div className="sidebar-profile-role" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roleLabel}</div>
              </div>
            )}
          </div>
        )}

        <nav style={{ marginTop: 8 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button 
          className="sidebar-btn" 
          type="button" 
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={16} style={{ flexShrink: 0 }} /> : <Sun size={16} style={{ flexShrink: 0 }} />}
          {!collapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
        </button>
        {hasMultipleSystems ? (
          <button 
            className="sidebar-btn" 
            type="button" 
            onClick={handleBackToPortal}
            title="Switch Subsystem"
          >
            <LayoutGrid size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Switch Subsystem</span>}
          </button>
        ) : (
          <button 
            className="sidebar-btn" 
            type="button" 
            onClick={handleSignOut}
            title="Sign Out"
            style={{ color: 'var(--danger)' }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
