import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import logo from '../../assets/brand-logo.jpg';

const adminNavItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/repairs', label: 'Repair Tickets' },
  { to: '/repairs/new', label: 'New Repair' },
  { to: '/history', label: 'Repair History' },
  { to: '/users', label: 'Users' },
];

const mechanicNavItems = [
  { to: '/dashboard', label: 'My Dashboard' },
  { to: '/repairs', label: 'My Repairs' },
  { to: '/history', label: 'Repair History' },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MECHANIC: 'Mechanic',
  OPERATIONS: 'Operations',
  CUSTOMER_SUPPORT: 'Customer Support',
};

export function Sidebar() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const navItems = user?.role === 'ADMIN' ? adminNavItems : mechanicNavItems;
  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : '';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <img src={logo} alt="WeLinc" style={{ width: 46, height: 46, borderRadius: 10 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>WeLinc VRMS</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Vehicle Repair System</div>
          </div>
        </div>

        <nav style={{ marginTop: 8 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        {user && (
          <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.07)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>{user.name}</div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>{roleLabel}</div>
          </div>
        )}
        <button className="button secondary" type="button" onClick={handleLogout} style={{ width: '100%' }}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
