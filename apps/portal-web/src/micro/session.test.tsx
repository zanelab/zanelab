import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { bootstrapSession, watchGlobalLogout } from './register';
import { handleLogout } from '../utils/auth';
import { useAuthStore, initialAuthState } from '../stores/auth-store';
import { useMenuStore, initialMenuState } from '../stores/menu-store';
import { mockMenus } from '../mocks/handlers';
import { appConfig } from '../config';

afterEach(() => {
  cleanup();
  localStorage.clear();

  useAuthStore.setState(initialAuthState);
  useMenuStore.setState(initialMenuState);
});

function MenuProbe() {
  const menus = useMenuStore((state) => state.menus);
  const token = useAuthStore((state) => state.token);
  return (
    <div>
      <div data-testid="token">{token || 'anonymous'}</div>
      <ul>
        {menus.map((m) => (
          <li key={m.id}>{m.name}</li>
        ))}
      </ul>
    </div>
  );
}

describe('登录 → 拉菜单 → 渲染（§5.1 集成）', () => {
  it('bootstrapSession：token 持久化 + menus/permissions 入库，菜单驱动渲染', async () => {
    await bootstrapSession('mock-access-token', 'mock-refresh-token', {
      id: 1,
      username: 'admin',
      nickname: '管理员',
    });

    expect(localStorage.getItem(appConfig.auth.tokenKey)).toBe(
      'mock-access-token',
    );

    expect(useAuthStore.getState().token).toBe('mock-access-token');
    // JSON 往返消除 transformMenu 输出的显式 undefined 键差异
    expect(JSON.parse(JSON.stringify(useMenuStore.getState().menus))).toEqual(
      mockMenus,
    );

    expect(useMenuStore.getState().permissions).toContain('system:menu:list');

    render(<MenuProbe />);
    expect(screen.getByText('首页')).toBeTruthy();
    expect(screen.getByText('系统管理')).toBeTruthy();
    expect(screen.getByTestId('token')).toHaveTextContent('mock-access-token');
  });
});

describe('登出 → 清状态 + 跳转（§5.3）', () => {
  it('handleLogout：清 localStorage 与 store，广播 global-logout；watchGlobalLogout 收到跳转', async () => {
    await bootstrapSession('mock-access-token', 'mock-refresh-token');
    expect(useMenuStore.getState().menus.length).toBeGreaterThan(0);

    const navigated: string[] = [];
    const stopWatch = watchGlobalLogout((path) => navigated.push(path));

    handleLogout();

    expect(localStorage.getItem(appConfig.auth.tokenKey)).toBeNull();

    expect(useAuthStore.getState().token).toBe('');
    expect(useMenuStore.getState().menus).toEqual([]);

    await waitFor(() => {
      expect(navigated).toEqual([appConfig.auth.loginPath]);
    });
    stopWatch();
  });
});
