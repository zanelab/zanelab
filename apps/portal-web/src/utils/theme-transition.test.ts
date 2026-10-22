import { beforeAll, describe, expect, it, vi } from 'vitest';
import { switchThemeMode } from './theme-transition';
import { usePreferencesStore } from '../stores/preferences-store';

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe('switchThemeMode', () => {
  it('降级路径（无 View Transition API）→ 同步更新 theme.mode', () => {
    switchThemeMode('dark');
    expect(usePreferencesStore.getState().theme.mode).toBe('dark');
    switchThemeMode('light');
    expect(usePreferencesStore.getState().theme.mode).toBe('light');
    switchThemeMode('auto');
    expect(usePreferencesStore.getState().theme.mode).toBe('auto');
  });

  it('同值切换 → no-op（不触发任何更新路径）', () => {
    switchThemeMode('dark');
    const before = usePreferencesStore.getState().theme;
    switchThemeMode('dark');
    expect(usePreferencesStore.getState().theme).toBe(before);
  });

  it('支持 View Transition 时，store 更新在 startViewTransition 回调内同步提交', () => {
    const skip = vi.fn();
    const fake = vi.fn((cb: () => void) => {
      cb();
      return { ready: Promise.resolve(), skipTransition: skip };
    });
    (document as unknown as Record<string, unknown>).startViewTransition = fake;
    try {
      switchThemeMode('light', { clientX: 10, clientY: 10 });
      expect(fake).toHaveBeenCalledTimes(1);

      expect(usePreferencesStore.getState().theme.mode).toBe('light');
    } finally {
      delete (document as unknown as Record<string, unknown>)
        .startViewTransition;
    }
  });
});
