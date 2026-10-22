import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { registerMicroApps, start } = vi.hoisted(() => ({
  registerMicroApps: vi.fn(),
  start: vi.fn(),
}));

vi.mock('qiankun', () => ({
  registerMicroApps,
  start,
}));

import {
  bootstrapSession,
  setupMicroApps,
  getHostState,
  onHostStateChange,
  __resetMicroAppsForTest,
} from './register';
import { appConfig } from '../config';
import { useAuthStore, initialAuthState } from '../stores/auth-store';
import { useMenuStore, initialMenuState } from '../stores/menu-store';
import { mockMenus } from '../mocks/handlers';

beforeEach(() => {
  __resetMicroAppsForTest();

  appConfig.microApps = {
    demo: {
      name: 'demo',
      entry: '//localhost:7100/demo/',
      container: 'subapp-demo',
      activeRule: '/demo',
      props: {},
      prefetch: false,
    },
  };
  useAuthStore.setState(initialAuthState);
  useMenuStore.setState(initialMenuState);
  registerMicroApps.mockClear();
  start.mockClear();
});

afterEach(() => {
  appConfig.microApps = {};
});

describe('setupMicroApps props 注入（首登 bug 修复）', () => {
  it('props 是 getter：注册后 store 更新，再读 props 拿到最新 token/permissions', () => {
    useAuthStore.getState().setToken('t1');
    useMenuStore.getState().setMenus(mockMenus);
    setupMicroApps();

    expect(registerMicroApps).toHaveBeenCalledTimes(1);
    const apps = registerMicroApps.mock.calls[0][0] as Array<{
      props: Record<string, unknown>;
    }>;
    expect(apps[0].props.token).toBe('t1');
    expect(apps[0].props.permissions).toContain('system:user:list');

    useAuthStore.getState().setToken('t2');
    expect(apps[0].props.token).toBe('t2');
  });

  it('props 注入自建全局状态通道（取代 qiankun initGlobalState）', () => {
    useAuthStore.getState().setToken('t1');
    setupMicroApps();

    const apps = registerMicroApps.mock.calls[0][0] as Array<{
      props: Record<string, unknown>;
    }>;

    expect(apps[0].props.getHostState).toBe(getHostState);
    expect(apps[0].props.onHostStateChange).toBe(onHostStateChange);
    expect((apps[0].props.getHostState as typeof getHostState)()).toMatchObject(
      { token: 't1' },
    );
  });

  it('重复调用幂等：不重复 registerMicroApps / start', () => {
    setupMicroApps();
    setupMicroApps();
    expect(registerMicroApps).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('bootstrapSession：菜单就绪后触发注册，props 带最新 token/permissions', async () => {
    await bootstrapSession('mock-access-token', 'mock-refresh-token');

    expect(registerMicroApps).toHaveBeenCalledTimes(1);
    const apps = registerMicroApps.mock.calls[0][0] as Array<{
      props: Record<string, unknown>;
    }>;
    expect(apps[0].props.token).toBe('mock-access-token');
    expect(apps[0].props.permissions).toContain('system:user:list');
  });
});
