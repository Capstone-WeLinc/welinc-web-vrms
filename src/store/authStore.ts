import create from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { login as loginApi } from '../lib/api/authApi';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isLoading: false,
      login: async (username, password) => {
        set({ isLoading: true });

        try {
          const response = await loginApi(username.trim(), password.trim());

          set({
            token: response.accessToken,
            user: response.user,
            isLoading: false,
          });

          localStorage.setItem('welinc_token', response.accessToken);
          localStorage.setItem('welinc_user', JSON.stringify(response.user));
        } finally {
          set({ isLoading: false });
        }
      },
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
