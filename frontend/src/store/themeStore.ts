import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  syncTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark', // Modern default is Dark Mode

      setTheme: (theme) => {
        set({ theme });
        get().syncTheme();
      },

      toggleTheme: () => {
        const nextTheme = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: nextTheme });
        get().syncTheme();
      },

      syncTheme: () => {
        const currentTheme = get().theme;
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(currentTheme);
      },
    }),
    {
      name: 'medicore-theme-storage',
      onRehydrateStorage: () => (state) => {
        state?.syncTheme();
      },
    }
  )
);
