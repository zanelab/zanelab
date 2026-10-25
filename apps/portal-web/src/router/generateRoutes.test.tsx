import { cleanup, render } from '@testing-library/react';
import { MemoryRouter, useRoutes, type RouteObject } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildMenuRoutes,
  generateRoutes,
  subAppCatchAllRoutes,
  PAGE_MAP,
} from './generateRoutes';
import { appConfig } from '../config';
import { mockMenus } from '../mocks/handlers';
import type { MenuItem } from '../types';

afterEach(() => {
  cleanup();
  appConfig.microApps = {};
});

describe('generateRoutes（§7.1）', () => {
  function RoutesProbe({ routes }: { routes: RouteObject[] }) {
    return useRoutes(routes);
  }

  it('已注册子应用菜单 → activeRule/* 占位兜底，路径去前导斜杠', () => {
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
    const routes = buildMenuRoutes(mockMenus);
    const paths = routes.map((r) => r.path);
    expect(paths).toContain('home/*');
    expect(paths).toContain('system/*');
  });

  it('未注册子应用的菜单项不产路由（elementFor 返回 null）', () => {
    const routes = buildMenuRoutes(mockMenus);
    const paths = routes.map((r) => r.path);
    expect(paths).not.toContain('home');
    expect(paths).not.toContain('system');
  });

  it('纯目录节点（无 component/appName）不产自身路由，叶子扁平下渗', () => {
    const routes = buildMenuRoutes(mockMenus);
    const paths = routes.map((r) => r.path);

    expect(paths).not.toContain('components');

    expect(paths).not.toContain('system');
  });

  it('已注册子应用根路由渲染占位（null），* 兜底让子应用内部路径全部匹配', () => {
    appConfig.microApps = {
      iam: {
        name: 'iam',
        entry: '//localhost:8081',
        container: '#subapp-container',
        activeRule: '/iam',
        props: {},
        prefetch: false,
        public: false,
      },
    };
    const routes = buildMenuRoutes(mockMenus);
    const iamRoute = routes.find((r) => r.path === 'iam');
    expect(iamRoute).toBeTruthy();

    // app 节点的叶子子项（users/menus/roles）各自产占位路由，* 兜底收尾
    expect(iamRoute?.children?.map((r) => r.path)).toEqual([
      'users',
      'menus',
      'roles',
      '*',
    ]);

    const { container } = render(<>{iamRoute?.element}</>);
    expect(container.innerHTML).toBe('');
  });

  it('未注册子应用（菜单下发了 appName 但未在 config.microApps）→ 不产占位路由，路径落 404', () => {
    const routes = generateRoutes(mockMenus);
    const paths = routes.map((r) => r.path);

    expect(paths).not.toContain('iam');
    expect(paths).not.toContain('iam/*');

    render(
      <MemoryRouter initialEntries={['/iam/some/page']}>
        <RoutesProbe routes={routes} />
      </MemoryRouter>,
    );
    expect(document.body.textContent).toContain('404');
    expect(document.body.textContent).not.toMatch(/^\s*$/);
  });

  it('PAGE_MAP 覆盖 mock 菜单的全部本地 component', () => {
    const components: string[] = [];
    const walk = (items: MenuItem[]) => {
      for (const m of items) {
        if (m.component) components.push(m.component);
        if (m.children) walk(m.children);
      }
    };
    walk(mockMenus);
    for (const c of components) {
      expect(PAGE_MAP[c], `PAGE_MAP 缺少 ${c}`).toBeTruthy();
    }
  });

  describe('子应用 activeRule 兜底（微前端内部页不落 404）', () => {
    const PLT = {
      name: 'npa-plt-system',
      entry: '//localhost:5172',
      container: '#subapp-container',
      activeRule: '/npa-plt-system/',
      props: {},
      prefetch: false,
      public: false,
    };

    it('已注册子应用 → activeRule/* 占位兜底（归一化首尾斜杠）', () => {
      appConfig.microApps = { 'npa-plt-system': PLT };
      const paths = buildMenuRoutes(mockMenus).map((r) => r.path);
      expect(paths).toContain('npa-plt-system/*');
      expect(paths).not.toContain('npa-plt-system//*');
    });

    it('菜单已有同前缀路由（app 节点自带 *）→ 不重复追加', () => {
      appConfig.microApps = { 'npa-plt-system': PLT };
      const existing = [
        {
          path: 'npa-plt-system',
          element: null,
          children: [{ path: '*', element: null }],
        },
      ];
      expect(subAppCatchAllRoutes(existing)).toEqual([]);
    });

    it('未登记的子应用内部路径渲染占位（无 404），未注册前缀仍 404', () => {
      appConfig.microApps = { 'npa-plt-system': PLT };
      const routes = generateRoutes(mockMenus);

      const { unmount } = render(
        <MemoryRouter initialEntries={['/npa-plt-system/admin/api-key']}>
          <RoutesProbe routes={routes} />
        </MemoryRouter>,
      );
      expect(document.body.textContent).not.toContain('404');
      unmount();

      render(
        <MemoryRouter initialEntries={['/unknown-app/some/page']}>
          <RoutesProbe routes={routes} />
        </MemoryRouter>,
      );
      expect(document.body.textContent).toContain('404');
    });
  });

  it('generateRoutes 附带兜底：home 重定向 + 403 + 404', () => {
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
    const routes = generateRoutes(mockMenus);
    const paths = routes.map((r) => r.path);

    expect(paths).toContain('home/*');
    expect(paths).toContain('403');
    expect(paths).toContain('*');
    expect(paths).toContain('');
  });
});
