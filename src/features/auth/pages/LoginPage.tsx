import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { getCurrentUser } from '../../../lib/api/authApi';
import { api } from '../../../lib/api/client';

const PORTAL_URL = (import.meta.env as any).VITE_PORTAL_URL || 'http://localhost:8000';
const AUTH_MODE = (import.meta.env as any).VITE_AUTH_MODE || 'portal'; // 'portal' | 'standalone'

function decodeJwt<T>(token: string): T {
  const [, payload] = token.split('.');
  if (!payload) throw new Error('Invalid token');
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
  return JSON.parse(json) as T;
}

async function processToken(
  token: string,
  navigate: ReturnType<typeof useNavigate>,
  setError: (e: string) => void,
) {
  try {
    const decoded = decodeJwt<{ sub: string; email: string; roles: any[] }>(token);

    const primaryRoleAssignment =
      decoded.roles?.find((r) => r.system.toUpperCase() === 'VRMS') || decoded.roles?.[0];

    if (!primaryRoleAssignment) {
      setError('Your account does not have access to the Vehicle Repair Management System (VRMS).');
      localStorage.clear();
      return;
    }

    localStorage.setItem('welinc_token', token);

    try {
      const fullUser = await getCurrentUser();
      const user = {
        id: decoded.sub,
        email: decoded.email || '',
        name: fullUser.name || decoded.email || '',
        role: (primaryRoleAssignment.role || 'MECHANIC') as any,
        system: 'VRMS' as any,
        roles: decoded.roles || [],
      };
      useAuthStore.setState({ token, user });
      localStorage.setItem('welinc_user', JSON.stringify(user));
    } catch {
      const user = {
        id: decoded.sub,
        email: decoded.email || '',
        name: decoded.email || '',
        role: (primaryRoleAssignment.role || 'MECHANIC') as any,
        system: 'VRMS' as any,
        roles: decoded.roles || [],
      };
      useAuthStore.setState({ token, user });
      localStorage.setItem('welinc_user', JSON.stringify(user));
    }

    navigate('/dashboard', { replace: true });
  } catch (err) {
    console.error('Failed to process token:', err);
    setError('Invalid or expired authentication token.');
    localStorage.clear();
  }
}

// ─── Portal SSO Mode ──────────────────────────────────────────────────────────
function PortalSSOLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // First check query string parameters for a token passed by portal redirect
    const searchParams = new URLSearchParams(window.location.search);
    const ssoToken = searchParams.get('token');
    if (ssoToken) {
      processToken(ssoToken, navigate, setError);
      return;
    }

    // Check if already authenticated
    const existingToken = useAuthStore.getState().token || localStorage.getItem('welinc_token');
    if (existingToken) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Listen for token handoff via postMessage from the portal
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === 'WELINC_AUTH_TOKEN' &&
        typeof event.data.token === 'string'
      ) {
        processToken(event.data.token, navigate, setError);
      }
    };
    window.addEventListener('message', handleMessage);

    // Also check sessionStorage for the fallback handoff
    const handoffToken = sessionStorage.getItem('welinc_handoff_token');
    if (handoffToken) {
      sessionStorage.removeItem('welinc_handoff_token');
      processToken(handoffToken, navigate, setError);
      return;
    }

    // No token received — redirect to portal
    const timer = setTimeout(() => {
      window.location.href = `${PORTAL_URL}/login`;
    }, 1500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', padding: 32, textAlign: 'center' }}>
        {error ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ color: 'var(--danger)', display: 'flex', justifyContent: 'center' }}>
              <AlertCircle size={48} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Authentication Failed</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>{error}</p>
            <button
              onClick={() => { window.location.href = `${PORTAL_URL}/login`; }}
              className="button"
              style={{ marginTop: 8 }}
            >
              Back to Portal Login
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={40} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Redirecting to login…</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>Please wait while we redirect you to the portal.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Standalone Login Mode ────────────────────────────────────────────────────
function StandaloneLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existingToken = useAuthStore.getState().token || localStorage.getItem('welinc_token');
    if (existingToken) navigate('/dashboard', { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });
      await processToken(response.data.accessToken, navigate, (msg) => setError(msg));
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError('Unable to reach the server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="card login-card">
        <div className="login-brand">
          <h1 className="page-title" style={{ fontSize: '1.5rem' }}>WeLinc VRMS</h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>
            Vehicle Repair Management System
          </p>
        </div>

        {error && (
          <div className="alert" style={{ background: 'var(--danger-soft)', borderColor: 'var(--danger)', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle size={16} style={{ color: 'var(--danger)', marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: 'var(--danger)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label">
              Email Address <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="standalone-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@welinc.com"
              required
              autoComplete="email"
              className="input"
            />
          </div>

          <div className="input-group">
            <label className="label">
              Password <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div className="password-field">
              <input
                id="standalone-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoComplete="current-password"
                className="input password-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            id="standalone-submit"
            type="submit"
            disabled={loading}
            className="button"
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
export function LoginPage() {
  if (AUTH_MODE === 'standalone') {
    return <StandaloneLogin />;
  }
  return <PortalSSOLogin />;
}
