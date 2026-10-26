import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

// Sign in happens on the portal; SsoHandoff stores the token it hands over (spec 0009, AC-15).
interface AuthState {
  token: string | null;
  user: User | null;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      logout: () => {
        set({ token: null, user: null });
        localStorage.removeItem('welinc_token');
        localStorage.removeItem('welinc_user');
      },
    }),
    {
      name: 'welinc-auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
