import { useAuthStore } from '../../store/authStore';
import { SAMPLE_REPAIRS } from '../../lib/mockData';

export function Topbar() {
  const user = useAuthStore((state) => state.user);
  const total = SAMPLE_REPAIRS.length;
  const open = SAMPLE_REPAIRS.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length;

  return (
    <div className="topbar">
      <div>
        <h2 className="page-title">VRMS Admin</h2>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Overview & analytics</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total tickets</div>
          <div style={{ fontWeight: 700 }}>{total}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Open</div>
          <div style={{ fontWeight: 700, color: 'var(--primary-strong)' }}>{open}</div>
        </div>
        <div className="topbar-user">
          {user ? `Signed in as ${user.username}` : 'Not signed in'}
        </div>
      </div>
    </div>
  );
}
