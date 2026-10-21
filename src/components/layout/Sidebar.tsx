import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  Wrench,
  PlusCircle,
  History,
  Users,
  User,
  ClipboardList,
  ArrowRightLeft,
  BarChart2,
  BookOpen,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import logo from '../../assets/brand-logo.jpg';
import ConfirmModal from '../ConfirmModal';
import type { LucideIcon } from 'lucide-react';

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'http://localhost:8000';
const VMMS_URL = import.meta.env.VITE_VMMS_URL || 'http://localhost:8002';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const adminNavSections: NavSection[] = [
  {
    title: 'GENERAL',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/profile', label: 'Profile', icon: User },
    ],
  },
  {
    title: 'VEHICLE REPAIRS',
    items: [
      { to: '/repairs', label: 'Repair Tickets', icon: Wrench },
      { to: '/repairs/new', label: 'New Repair', icon: PlusCircle },
      { to: '/history', label: 'Repair History', icon: History },
    ],
  },
  {
    title: 'ANALYTICS & AI',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart2 },
      { to: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { to: '/users', label: 'Users', icon: Users },
      { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
    ],
  },
];

const mechanicNavSections: NavSection[] = [
  {
    title: 'GENERAL',
    items: [
      { to: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
      { to: '/profile', label: 'Profile', icon: User },
    ],
  },
  {
    title: 'VEHICLE REPAIRS',
    items: [
      { to: '/repairs', label: 'My Repairs', icon: Wrench },
      { to: '/history', label: 'Repair History', icon: History },
    ],
  },
  {
    title: 'KNOWLEDGE BASE',
    items: [
      { to: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
    ],
  },
];

export function Sidebar() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const navSections = user?.role === 'ADMIN' ? adminNavSections : mechanicNavSections;

  const getSubsystemCount = () => {
    try {
      const roles = user?.roles || [];
      const subsystemRoles = roles.filter((r) =>
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
    <aside className="sidebar">
      <div>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, padding: '0 10px' }}>
          <div style={{ width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 }}>
            <img src={logo} alt="WeLinc" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <div className="sidebar-text" style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>WeLinc VRMS</div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Vehicle Repair System</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ marginTop: 8 }}>
          {navSections.map((section, idx) => (
            <div key={section.title} className="sidebar-section" style={{ marginTop: idx > 0 ? 12 : 0 }}>
              {/* Section Header / Divider */}
              <div 
                className="sidebar-section-header"
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 28,
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.4)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '8px 10px 4px'
                }}
              >
                <span className="sidebar-text">{section.title}</span>
                {idx > 0 && (
                  <div className="sidebar-divider-collapsed" />
                )}
              </div>

              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={() => {
                      let isActive = location.pathname.startsWith(item.to);
                      // Special case: /repairs should not be active if we are on /repairs/new
                      // because /repairs/new has its own sidebar item.
                      if (item.to === '/repairs' && location.pathname === '/repairs/new') {
                        isActive = false;
                      }
                      // Exact match for others just in case
                      if (item.to === '/dashboard' && location.pathname !== '/dashboard') isActive = false;
                      if (item.to === '/history' && location.pathname !== '/history') isActive = false;
                      if (item.to === '/profile' && location.pathname !== '/profile') isActive = false;
                      if (item.to === '/audit-logs' && location.pathname !== '/audit-logs') isActive = false;
                      if (item.to === '/users' && location.pathname !== '/users') isActive = false;
                      if (item.to === '/analytics' && location.pathname !== '/analytics') isActive = false;
                      if (item.to === '/knowledge-base' && location.pathname !== '/knowledge-base') isActive = false;

                      return `nav-link${isActive ? ' active' : ''}`;
                    }}
                    title={item.label}
                  >
                    <div style={{ width: 46, display: 'flex', justifyContent: 'center', flexShrink: 0, marginRight: 12 }}>
                      <Icon size={20} strokeWidth={1.8} />
                    </div>
                    <span className="sidebar-text">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
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
            <div style={{ width: 46, display: 'flex', justifyContent: 'center', flexShrink: 0, marginRight: 12 }}>
              <ArrowRightLeft size={18} strokeWidth={1.8} />
            </div>
            <span className="sidebar-text">Switch to VMMS</span>
          </button>
        )}

        {/* Logout — always visible */}
        <button
          id="sidebar-logout"
          className="sidebar-btn"
          type="button"
          onClick={handleLogout}
          title="Logout"
          style={{
            background: 'var(--danger)',
            color: 'white',
            border: 'none',
            borderRadius: '999px',
            justifyContent: 'center'
          }}
        >
          <LogOut size={18} strokeWidth={1.8} />
          <span className="sidebar-text" style={{ marginLeft: 10 }}>Logout</span>
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
