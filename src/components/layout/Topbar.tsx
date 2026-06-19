import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getRepairs } from '../../lib/api/repairApi';
import { RepairTicket } from '../../types';

export function Topbar() {
  const user = useAuthStore((state) => state.user);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
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

  useEffect(() => {
    getRepairs().then(resp => setRepairs(resp.data)).catch(() => {});
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const total = repairs.length;
  const open = repairs.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length;

  return (
    <div className="topbar">
      <div className="topbar-copy">
        <h2 className="page-title">VRMS Admin</h2>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Overview & analytics</div>
      </div>
      <div className="topbar-actions">
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '10px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)',
            transition: 'all 0.2s ease',
          }}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <div className="topbar-stat">
          <span>Total tickets</span>
          <strong>{total}</strong>
        </div>
        <div className="topbar-stat">
          <span>Open</span>
          <strong>{open}</strong>
        </div>
        <div className="topbar-user">
          <span className="topbar-user-label">Signed in</span>
          <strong>{user ? user.name : 'Not signed in'}</strong>
          <span>{user ? user.role.replace('_', ' ') : 'Session unavailable'}</span>
        </div>
      </div>
    </div>
  );
}

