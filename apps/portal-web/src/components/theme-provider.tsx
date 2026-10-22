import { useLayoutEffect } from 'react';
import { usePreferencesStore } from '../stores/preferences-store';
import { useLayoutStore } from '../stores/layout-store';
import { usePreferencesRuntime } from './layouts/hooks/use-preferences-runtime';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = usePreferencesStore((s) => s.theme.mode);
  const setIsDark = useLayoutStore((s) => s.setIsDark);
  usePreferencesRuntime();

  useLayoutEffect(() => {
    const root = document.documentElement;

    const applyTheme = (resolved: 'light' | 'dark') => {
      const isDark = resolved === 'dark';
      root.setAttribute('data-theme', resolved);
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
      setIsDark(isDark);
    };

    if (themeMode === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent | MediaQueryList) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      handler(mq);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }

    applyTheme(themeMode);
  }, [themeMode, setIsDark]);

  return <>{children}</>;
}
