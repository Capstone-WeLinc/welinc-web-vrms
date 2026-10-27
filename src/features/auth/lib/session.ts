import type { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { getCurrentUser } from '../../../lib/api/authApi';
import type { User, UserRoleAssignment } from '../../../types';

export const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'http://localhost:8000';

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

/** Stores the token the portal hands over, builds the user from it, and opens the dashboard. */
export async function processToken(
  token: string,
  navigate: ReturnType<typeof useNavigate>,
  setError: (e: string) => void,
) {
  try {
    const decoded = decodeJwt<{ sub: string; email: string; roles: UserRoleAssignment[] }>(token);

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
      const user: User = {
        id: decoded.sub,
        email: decoded.email || '',
        name: fullUser.name || '',
        role: primaryRoleAssignment.role || 'MECHANIC',
        system: 'VRMS',
        roles: decoded.roles || [],
      };
      useAuthStore.setState({ token, user });
      localStorage.setItem('welinc_user', JSON.stringify(user));
    } catch {
      const user: User = {
        id: decoded.sub,
        email: decoded.email || '',
        name: '',
        role: primaryRoleAssignment.role || 'MECHANIC',
        system: 'VRMS',
        roles: decoded.roles || [],
      };
      useAuthStore.setState({ token, user });
      localStorage.setItem('welinc_user', JSON.stringify(user));
    }

    navigate('/dashboard', { replace: true });
  } catch (err) {
    console.error('Failed to process token:', err);
    setError('Your sign in has expired or isn’t valid. Sign in again on the portal.');
    localStorage.clear();
  }
}
