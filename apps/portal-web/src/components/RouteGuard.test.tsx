import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { generateRoutes } from '../router/generateRoutes';
import { RouteGuard } from './RouteGuard';
import { useAuthStore, initialAuthState } from '../stores/auth-store';
import { useMenuStore, initialMenuState } from '../stores/menu-store';
import { mockMenus } from '../mocks/handlers';
import { appConfig } from '../config';
import type { MenuItem } from '../types';

afterEach(() => {
  cleanup();

  useAuthStore.setState(initialAuthState);
  useMenuStore.setState(initialMenuState);

  appConfig.microApps = {};
});

function PathProbe() {
  const location = useLocation();
  return (
    <div data-testid="path">
      {location.pathname}
      {location.search}
    </div>
  );
}

function GuardApp({ initialEntries }: { initialEntries: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/system/*"
          element={
            <RouteGuard>
              <PathProbe />
            </RouteGuard>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RouteGuard>
              <PathProbe />
            </RouteGuard>
          }
        />
        <Route path="/login" element={<PathProbe />} />
        <Route path="/403" element={<div data-testid="path">/403</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('generateRoutes', () => {
  it('mock 菜单生成子应用路由（占位，容器在 SubAppLayer 常驻）', () => {
    appConfig.microApps = {
      iam: {
        name: 'iam',
        entry: '//localhost:8081',
        container: '#subapp-container',
        activeRule: '/system',
        props: {},
        prefetch: false,
        public: false,
      },
    };
    const routes = generateRoutes(mockMenus);
    const paths = JSON.stringify(routes);

    expect(paths).toContain('system');
  });
});

describe('RouteGuard', () => {
  it('未登录 → 跳 loginPath 且带 from 来源（AC1）', async () => {
    render(<GuardApp initialEntries={['/system/users']} />);
    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/login');
    });
  });

  it('未登录访问免鉴权子应用路径（public 子路径）→ 放行不跳登录', async () => {
    appConfig.microApps = {
      home: {
        name: 'home',
        entry: '//localhost:8083',
        container: '#subapp-home-container',
        activeRule: '/home',
        props: {},
        prefetch: false,
        public: ['/home'],
      },
    };
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route
            path="/home"
            element={
              <RouteGuard>
                <PathProbe />
              </RouteGuard>
            }
          />
          <Route path="/login" element={<PathProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/home');
    });
  });

  it('未登录 → from 完整编码受保护路径，恰好一次跳转（09-07 回归）', async () => {
    render(<GuardApp initialEntries={['/dashboard']} />);
    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent(
        '/login?from=%2Fdashboard',
      );
    });
  });

  it('守卫误挂载在登录页（含 from query）→ 跳裸 loginPath，from 不嵌套（09-07 回归）', async () => {
    render(
      <MemoryRouter
        initialEntries={[`${appConfig.auth.loginPath}?from=%2Fdashboard`]}
      >
        <PathProbe />
        <Routes>
          <Route
            path={appConfig.auth.loginPath}
            element={
              <RouteGuard>
                <PathProbe />
              </RouteGuard>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getAllByTestId('path')[0]).toHaveTextContent(/^\/login$/);
    });
  });

  it('已登录+有权限 → 放行渲染 children', async () => {
    useAuthStore.getState().setAuth({ token: 't' });
    useMenuStore.getState().setMenus(mockMenus);
    render(<GuardApp initialEntries={['/dashboard']} />);
    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/dashboard');
    });
  });

  it('已登录但未授予权限 → 跳 403', async () => {
    const guarded: MenuItem[] = [
      {
        id: 31,
        name: '用户管理',
        path: '/system/users',
        permission: 'system:user:list',
      },
    ];
    useAuthStore.setState({ token: 't' });
    useMenuStore.setState({ menus: guarded, permissions: ['other:perm'] });
    render(<GuardApp initialEntries={['/system/users']} />);
    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/403');
    });
  });
});
