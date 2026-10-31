import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('qiankun', () => ({
  registerMicroApps: vi.fn(),
  start: vi.fn(),
}));

import {
  __resetHostStateForTest,
  getHostState,
  onHostStateChange,
  setupHostState,
} from './register';
import { useAuthStore, initialAuthState } from '../stores/auth-store';
import { useMenuStore, initialMenuState } from '../stores/menu-store';
import { usePreferencesStore } from '../stores/preferences-store';
import { mockMenus } from '../mocks/handlers';

beforeEach(() => {
  useAuthStore.setState(initialAuthState);
  useMenuStore.setState(initialMenuState);
  usePreferencesStore.setState((s) => ({ app: { ...s.app, locale: 'zh-CN' } }));

  __resetHostStateForTest();
});

describe('setupHostState（§9.4 单向同步）', () => {
  it('setMenus 派生权限变化 → 通知一次；后续无快照变化的 setState 不再通知', () => {
    const listener = vi.fn();
    setupHostState();
    onHostStateChange(listener);

    useMenuStore.getState().setMenus(mockMenus);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        permissions: expect.arrayContaining(['system:user:list']),
      }),
      expect.anything(),
    );

    useMenuStore.setState({ menus: [...mockMenus] });
    expect(listener).toHaveBeenCalledTimes(1);

    useMenuStore.getState().mergePermissions(['system:user:list']);
    expect(listener).toHaveBeenCalledTimes(1);

    useAuthStore.getState().setToken('t2');
    expect(listener).toHaveBeenCalledTimes(2);

    useAuthStore.getState().setToken('t2');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('locale 变化 → 通知快照附带 locale；locale 未变的偏好更新不通知（09-09-i18n R5）', () => {
    const listener = vi.fn();
    setupHostState();
    onHostStateChange(listener);

    usePreferencesStore
      .getState()
      .updatePreferences({ app: { locale: 'en-US' } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ locale: 'en-US' }),
      expect.anything(),
    );

    usePreferencesStore
      .getState()
      .updatePreferences({ app: { locale: 'en-US' } });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('外观子集契约：snapshot.preferences 含全部外观字段（与 props.preferences 同一结构）', () => {
    usePreferencesStore.setState((s) => ({
      theme: { ...s.theme, mode: 'light', colorPrimary: 'hsl(0 0% 50%)' },
      app: { ...s.app, colorGrayMode: true, colorWeakMode: true },
    }));

    const { preferences, ...rest } = getHostState();
    // 快照顶层仍是既有跨应用字段（无全量 store 灌入）
    expect(Object.keys(rest).sort()).toEqual([
      'locale',
      'permissions',
      'token',
      'user',
    ]);
    // 外观子集字段清单（契约见 register.ts SubAppPreferences）
    expect(preferences).toEqual({
      mode: 'light',
      colorPrimary: 'hsl(0 0% 50%)',
      colorDestructive: expect.any(String),
      colorSuccess: expect.any(String),
      colorWarning: expect.any(String),
      radius: expect.any(String),
      fontSize: expect.any(Number),
      colorGrayMode: true,
      colorWeakMode: true,
      locale: 'zh-CN',
    });
  });

  it('外观变更 → onHostStateChange 订阅方收到含新外观的快照；无关偏好变更不通知', () => {
    const listener = vi.fn();
    setupHostState();
    onHostStateChange(listener);

    // 基座偏好面板修改主题色 + 暗色模式（usePreferencesStore.setState 模拟）
    usePreferencesStore.setState((s) => ({
      theme: {
        ...s.theme,
        mode: 'dark',
        colorPrimary: 'hsl(280 100% 50%)',
        radius: '0.75',
        fontSize: 14,
      },
      app: { ...s.app, colorGrayMode: true },
    }));
    expect(listener).toHaveBeenCalledTimes(1);
    const [next] = listener.mock.calls[0];
    expect(next.preferences).toMatchObject({
      mode: 'dark',
      colorPrimary: 'hsl(280 100% 50%)',
      radius: '0.75',
      fontSize: 14,
      colorGrayMode: true,
    });

    // 外观字段写回同值 → 投影对象引用虽新，但逐字段比对判定未变，不通知
    usePreferencesStore.setState((s) => ({
      theme: { ...s.theme, radius: '0.75' },
    }));
    expect(listener).toHaveBeenCalledTimes(1);

    // 无关偏好变更（sidebar collapsed，非外观字段）→ 同样不通知：
    // preferences store 订阅虽被触发，但外观子集逐字段全等，不派发
    usePreferencesStore.setState((s) => ({
      sidebar: { ...s.sidebar, collapsed: true },
    }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('通道自身契约：setup 幂等、fireImmediately 先回一次、取消订阅后不再回调', () => {
    setupHostState();
    setupHostState();

    const listener = vi.fn();
    const off = onHostStateChange(listener, true);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toBe(listener.mock.calls[0][1]);

    useAuthStore.getState().setToken('t1');
    expect(listener).toHaveBeenCalledTimes(2);

    off();
    useAuthStore.getState().setToken('t2');
    expect(listener).toHaveBeenCalledTimes(2);

    expect(getHostState().token).toBe('t2');
  });
});
