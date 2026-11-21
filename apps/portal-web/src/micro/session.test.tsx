import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  bootstrapSession,
  restoreSession,
  watchGlobalLogout,
} from './register';
import { handleLogout } from '../utils/auth';
import { useAuthStore, initialAuthState } from '../stores/auth-store';
import { useMenuStore, initialMenuState } from '../stores/menu-store';
import { mockMenus } from '../mocks/handlers';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
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

    // 注入 mock redirect 断言跳转目标（真实整页跳转 window.location.replace
    // 在 jsdom 里不可 redefine，由 App 层传参注入）
    const redirected: string[] = [];
    const stopWatch = watchGlobalLogout((path) => redirected.push(path));

    handleLogout();

    expect(localStorage.getItem(appConfig.auth.tokenKey)).toBeNull();

    expect(useAuthStore.getState().token).toBe('');
    expect(useMenuStore.getState().menus).toEqual([]);

    expect(redirected).toEqual([appConfig.auth.loginPath]);
    stopWatch();
  });
});

describe('角色权限码并集合并（任务 11-21：前端权限 = 菜单派生 ∪ 角色并集）', () => {
  it('bootstrapSession：mergePermissions 把角色权限码（mock 为 "*"）并入 permissions', async () => {
    await bootstrapSession('mock-access-token', 'mock-refresh-token');

    const permissions = useMenuStore.getState().permissions;
    // 菜单派生码照常存在
    expect(permissions).toContain('system:menu:list');
    // 角色并集码（mock /auth/permissions handler 返回 ['*']）已并入
    expect(permissions).toContain('*');
  });

  it('restoreSession：同样合并角色权限码', async () => {
    await restoreSession('mock-access-token');

    expect(useMenuStore.getState().permissions).toContain('*');
    expect(useMenuStore.getState().permissions).toContain('system:menu:list');
  });

  it('角色权限端点失败：warn 不阻塞，菜单派生码兜底，会话恢复照常完成', async () => {
    server.use(
      http.get(
        `${appConfig.api.permissionsEndpoint}`,
        () =>
          HttpResponse.json(
            { code: 1010, data: null, msg: '请先登录' },
            { status: 401 },
          ),
        { once: true },
      ),
    );

    await bootstrapSession('mock-access-token', 'mock-refresh-token');

    // 菜单入库（会话恢复未被权限端点失败阻塞），无角色并集码
    expect(useMenuStore.getState().menus.length).toBeGreaterThan(0);
    expect(useMenuStore.getState().permissions).toContain('system:menu:list');
    expect(useMenuStore.getState().permissions).not.toContain('*');
    // token 照常持久化（主链路未断）
    expect(localStorage.getItem(appConfig.auth.tokenKey)).toBe(
      'mock-access-token',
    );
  });

  it('登出：clearMenus 清空 permissions（含合并进来的 "*"，无残留）', async () => {
    await bootstrapSession('mock-access-token', 'mock-refresh-token');
    expect(useMenuStore.getState().permissions).toContain('*');

    handleLogout();

    expect(useMenuStore.getState().permissions).toEqual([]);
  });
});
