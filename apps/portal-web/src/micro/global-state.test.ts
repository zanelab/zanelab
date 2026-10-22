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
