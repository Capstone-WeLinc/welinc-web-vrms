import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

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
      <h1>WeLinc VRMS</h1>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
      <div className="sidebar-footer">
        <button className="button secondary" type="button" onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
