import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getCurrentUser } from '../lib/api/authApi';

function decodeJwt<T>(token: string): T {
  const [, payload] = token.split('.');
  if (!payload) {
    throw new Error('Invalid token');
  }
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
  return JSON.parse(json) as T;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('logout') === 'true') {
      useAuthStore.getState().logout();
      const portalUrl = (import.meta.env as any).VITE_PORTAL_URL || 'http://localhost:5176';
      window.location.href = `${portalUrl}/login?logout=true`;
      return;
    }

    const ssoToken = searchParams.get('token');
    if (!ssoToken) {
      const existingToken = useAuthStore.getState().token;
      if (existingToken) {
        navigate('/dashboard', { replace: true });
        return;
      }
      // Redirect directly to the portal login
      const portalUrl = (import.meta.env as any).VITE_PORTAL_URL || 'http://localhost:5176';
      window.location.href = `${portalUrl}/login`;
      return;
    }

    try {
      const decoded = decodeJwt<{ sub: string; username: string; roles: any[] }>(ssoToken);
      
      // Look for VRMS role assignment
      const primaryRoleAssignment = decoded.roles?.find(
        (r) => r.system.toUpperCase() === 'VRMS'
      ) || decoded.roles?.[0];

      if (!primaryRoleAssignment) {
        setError('Your account does not have access to the Vehicle Repair Management System (VRMS).');
        localStorage.clear();
        return;
      }

      // Store token first so API requests include it
      localStorage.setItem('welinc_token', ssoToken);

      // Fetch full user details from backend to get the real Name
      getCurrentUser()
        .then((fullUser) => {
          const user = {
            id: decoded.sub,
            username: decoded.username,
            name: fullUser.name || decoded.username, // Real full name!
            role: (primaryRoleAssignment.role || 'MECHANIC') as any,
            system: 'VRMS' as any,
            roles: decoded.roles || [],
          };
          useAuthStore.setState({ token: ssoToken, user });
          localStorage.setItem('welinc_user', JSON.stringify(user));
          navigate('/dashboard', { replace: true });
        })
        .catch((err) => {
          console.error('Failed to fetch user details:', err);
          // Fallback to username if backend fails
          const user = {
            id: decoded.sub,
            username: decoded.username,
            name: decoded.username,
            role: (primaryRoleAssignment.role || 'MECHANIC') as any,
            system: 'VRMS' as any,
            roles: decoded.roles || [],
          };
          useAuthStore.setState({ token: ssoToken, user });
          localStorage.setItem('welinc_user', JSON.stringify(user));
          navigate('/dashboard', { replace: true });
        });
    } catch (err) {
      console.error('Failed to parse SSO token:', err);
      setError('Invalid or expired authentication token.');
      localStorage.clear();
    }
  }, [searchParams, navigate]);

  return (
    <div className="login-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', padding: 32, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
        {error ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ color: 'var(--danger)', display: 'flex', justifyContent: 'center' }}>
              <AlertCircle size={48} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Authentication Failed</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>{error}</p>
            <button
              onClick={() => {
                const portalUrl = (import.meta.env as any).VITE_PORTAL_URL || 'http://localhost:5176';
                window.location.href = `${portalUrl}/login`;
              }}
              style={{
                marginTop: 8,
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 16px',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Back to Portal Login
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={40} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Verifying SSO Session</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>Please wait while we redirect you to your dashboard.</p>
          </div>
        )}
      </div>
    </div>
  );
}
