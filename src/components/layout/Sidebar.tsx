import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LogOut,
  LayoutDashboard, 
  Wrench, 
  PlusCircle, 
  History, 
  Users, 
  PanelLeftClose, 
  PanelLeftOpen, 
  User,
  ClipboardList,
  ArrowRightLeft,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import logo from '../../assets/brand-logo.jpg';
import ConfirmModal from '../ConfirmModal';

const PORTAL_URL = (import.meta.env as any).VITE_PORTAL_URL || 'http://localhost:8000';
const VMMS_URL = (import.meta.env as any).VITE_VMMS_URL || 'http://localhost:8002';

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
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    onCollapse?.(next);
  };

  const navItems = user?.role === 'ADMIN' ? adminNavItems : mechanicNavItems;
  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : '';

  const getSubsystemCount = () => {
    try {
      const roles = user?.roles || [];
      const subsystemRoles = (roles as any[]).filter((r) =>
        ['VRMS', 'VMMS', 'BMS'].includes(r.system?.toUpperCase())
      );
      const uniqueSystems = new Set(subsystemRoles.map((r) => r.system.toUpperCase()));
      return uniqueSystems.size;
    } catch (err) {
      console.error('Error counting subsystems in VRMS sidebar:', err);
      return 1;
    }
  };

  const hasMultipleSystems = getSubsystemCount() > 1;

  const handleSwitchToVmms = () => {
    const token = useAuthStore.getState().token || localStorage.getItem('welinc_token');
    if (token) {
      window.location.href = `${VMMS_URL}/login?token=${token}`;
    } else {
      window.location.href = VMMS_URL;
    }
  };

  const handleLogout = () => {
    setShowConfirmLogout(true);
  };

  const executeLogout = () => {
    logout();
    window.location.href = `${PORTAL_URL}/login?logout=true`;
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div>
        {/* Brand Header */}
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
            }}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* User Profile */}
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

        {/* Navigation */}
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

      {/* Footer Actions */}
      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Show "Switch to VMMS" only for users with multiple systems */}
        {hasMultipleSystems && (
          <button 
            id="sidebar-switch-vmms"
            className="sidebar-btn" 
            type="button" 
            onClick={handleSwitchToVmms}
            title="Switch to VMMS"
          >
            <ArrowRightLeft size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Switch to VMMS</span>}
          </button>
        )}

        {/* Logout — always visible */}
        <button 
          id="sidebar-logout"
          className="sidebar-btn" 
          type="button" 
          onClick={handleLogout}
          title="Logout"
          style={{ color: 'var(--danger)' }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
      <ConfirmModal
        isOpen={showConfirmLogout}
        title="Sign Out?"
        message="Are you sure you want to sign out of WeLinc VRMS?"
        confirmText="Sign Out"
        cancelText="Cancel"
        type="warning"
        onConfirm={executeLogout}
        onCancel={() => setShowConfirmLogout(false)}
      />
    </aside>
  );
}
