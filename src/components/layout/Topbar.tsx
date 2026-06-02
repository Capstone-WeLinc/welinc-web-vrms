import { useAuthStore } from '../../store/authStore';

export function Topbar() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="topbar">
      <div>
        <h2 className="page-title">VRMS Admin</h2>
      </div>
      <div className="topbar-user">
        {user ? `Signed in as ${user.username}` : 'Not signed in'}
      </div>
    </div>
  );
}
