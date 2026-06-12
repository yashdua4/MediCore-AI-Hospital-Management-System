import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthTokens, RoleType } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionTimeoutAt: number | null; // Timestamp when session expires

  // Actions
  setAuth: (user: User, tokens: AuthTokens) => void;
  updateAccessToken: (token: string) => void;
  logout: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  switchRole: (role: RoleType) => void;
  extendSession: (durationMinutes?: number) => void;
  isSessionExpired: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionTimeoutAt: null,

      setAuth: (user, tokens) => {
        const timeout = Date.now() + 15 * 60 * 1000; // 15 mins expiry
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          error: null,
          sessionTimeoutAt: timeout,
        });
      },

      updateAccessToken: (token) => {
        const timeout = Date.now() + 15 * 60 * 1000; // Extend on refresh
        set({
          accessToken: token,
          sessionTimeoutAt: timeout,
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          sessionTimeoutAt: null,
        });
      },

      setError: (error) => set({ error }),
      setLoading: (isLoading) => set({ isLoading }),

      switchRole: (role) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              role,
            },
          });
        }
      },

      extendSession: (durationMinutes = 15) => {
        if (get().isAuthenticated) {
          set({
            sessionTimeoutAt: Date.now() + durationMinutes * 60 * 1000,
          });
        }
      },

      isSessionExpired: () => {
        const timeout = get().sessionTimeoutAt;
        if (!timeout) return false;
        return Date.now() > timeout;
      },
    }),
    {
      name: 'medicore-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        sessionTimeoutAt: state.sessionTimeoutAt,
      }),
    }
  )
);
