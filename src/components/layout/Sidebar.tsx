import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import logo from '../../assets/logo.png';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/repairs', label: 'Repair Tickets' },
  { to: '/repairs/new', label: 'New Repair' },
  { to: '/history', label: 'Repair History' },
];

export function Sidebar() {
  const logout = useAuthStore((state) => state.logout);

  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <img src={logo} alt="WeLinc" style={{ width: 46, height: 46, borderRadius: 10 }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>WeLinc VRMS</div>
          <div style={{ fontSize: 12, color: '#cbd5e1' }}>Admin</div>
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

      <div className="sidebar-footer">
        <button className="button secondary" type="button" onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
