import { useLayoutEffect } from 'react';
import { usePreferencesStore } from '../stores/preferences-store';
import { useLayoutStore } from '../stores/layout-store';
import { usePreferencesRuntime } from './layouts/hooks/use-preferences-runtime';

/**
 * ThemeProvider — 将主题偏好同步到 DOM。
 * 在 main.tsx 中包裹 App 组件使用。
 * 挂载 usePreferencesRuntime（等价 reference PreferenceManager 的
 * setupWatcher + updateCSSVariables + updateColorMode）。
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = usePreferencesStore((s) => s.theme.mode);
  const setIsDark = useLayoutStore((s) => s.setIsDark);
  usePreferencesRuntime();

  // useLayoutEffect（paint 前应用）而非 useEffect：切主题时 React 渲染与
  // data-theme 属性若分属两帧，中间帧会出现"状态已换、颜色未换"的闪变
  //（switchThemeMode 的 flushSync 会同步 flush 本 effect，两帧合一）。
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
      handler(mq); // 初始执行
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }

    applyTheme(themeMode);
  }, [themeMode, setIsDark]);

  return <>{children}</>;
}
