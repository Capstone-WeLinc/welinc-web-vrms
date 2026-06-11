import { useAuthStore } from '../../store/authStore';
import { SAMPLE_REPAIRS } from '../../lib/mockData';

export function Topbar() {
  const user = useAuthStore((state) => state.user);
  const total = SAMPLE_REPAIRS.length;
  const open = SAMPLE_REPAIRS.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length;

  return (
    <div className="topbar">
      <div className="topbar-copy">
        <h2 className="page-title">VRMS Admin</h2>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Overview & analytics</div>
      </div>
      <div className="topbar-actions">
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
