import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/brand-logo.jpg';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const token = useAuthStore((state) => state.token);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (token) {
      navigate(from, { replace: true });
    }
  }, [from, navigate, token]);

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
          <p>Sign in to monitor repairs, manage tickets, and review live analytics.</p>
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
            <div className="password-field">
              <input
                className="input password-input"
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error ? <div className="alert" style={{ marginBottom: 16 }}>{error}</div> : null}

          <Button type="submit" disabled={isLoading || !username || !password}>
            {isLoading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 32, color: '#475569' }}>
          Credentials: <strong>admin / admin1234</strong>
        </p>
      </div>
    </div>
  );
}
