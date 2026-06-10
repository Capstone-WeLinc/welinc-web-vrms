import { FormEvent, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/brand-logo.jpg';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError('Login failed. Check your credentials and try again.');
    }
  };

  return (
    <div className="login-shell">
      <div className="card login-card">
        <div className="login-brand">
          <img src={logo} alt="WeLinc Logistics logo" className="login-logo" />
          <div>
            <h1>WeLinc VRMS</h1>
            <p>Hassle-free repair control for admin and operations.</p>
          </div>
        </div>

        <div className="login-welcome">
          <p>Sign in to monitor repairs, manage tickets, and review live analytics with temporary preview data.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              className="input"
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
            />
          </div>

          <div className="input-group">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              className="input"
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error ? <div className="alert" style={{ marginBottom: 16 }}>{error}</div> : null}

          <Button type="submit" disabled={isLoading || !username || !password}>
            {isLoading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <div className="login-footer">
          <p>Preview credentials: <strong>admin</strong> / <strong>password</strong></p>
        </div>
      </div>
    </div>
  );
}
