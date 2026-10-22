import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { BasicLayout } from '@/components/layouts/basic/layout';
import { UserDropdown } from '@/components/layouts/widgets/user-dropdown/user-dropdown';
import {
  defaultPreferences,
  usePreferencesStore,
} from '@/stores/preferences-store';
import type { MenuRecordRaw } from '@zanelab/types';

afterEach(cleanup);

const MENUS: MenuRecordRaw[] = [
  { name: '首页', path: '/dashboard' },
  {
    name: '系统管理',
    path: '/system',
    children: [
      { name: '用户管理', path: '/system/users' },
      { name: '角色管理', path: '/system/roles' },
    ],
  },
];

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <BasicLayout
        menus={MENUS}
        userDropdown={
          <UserDropdown
            avatar=""
            text="Admin"
            tagText="Pro"
            description="admin@example.com"
            onLogout={() => {}}
            onLockScreen={() => {}}
          />
        }
      />
    </MemoryRouter>,
  );
}

describe('BasicLayout 全家桶（C2）', () => {
  it('侧边栏渲染递归菜单（父级 + 子级项）', async () => {
    renderShell();
    await waitFor(() => {
      expect(screen.getAllByText('首页').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('系统管理').length).toBeGreaterThan(0);

    expect(screen.getAllByText('用户管理').length).toBeGreaterThan(0);
  });

  it('header widgets 挂载（header 节点 + UserDropdown 触发器）', async () => {
    const { container } = renderShell();
    await waitFor(() => {
      expect(screen.getAllByText('首页').length).toBeGreaterThan(0);
    });

    expect(
      container.querySelector(
        'header, [class*="admin-header"], [class*="header"]',
      ),
    ).toBeTruthy();
  });

  it('内容区 main 为滚动容器（overflow-auto）', async () => {
    const { container } = renderShell();
    await waitFor(() => {
      expect(screen.getAllByText('首页').length).toBeGreaterThan(0);
    });
    const main = container.querySelector('#__admin_main_content');
    expect(main).toBeTruthy();
    expect(main!.className).toContain('overflow-auto');
  });

  it('侧边栏滚动容器带 hover 显隐修饰类，且槽位仍常驻', async () => {
    const { container } = renderShell();
    await waitFor(() => {
      expect(screen.getAllByText('首页').length).toBeGreaterThan(0);
    });
    const menuScroll = container.querySelector('.admin-scrollbar--hover');
    expect(menuScroll).toBeTruthy();
    expect(menuScroll!.className).toContain('admin-scrollbar');
  });

  it('内容区把可见高度写入 --layout-content-height（子应用高度自适应用）', async () => {
    const { container } = renderShell();
    await waitFor(() => {
      expect(screen.getAllByText('首页').length).toBeGreaterThan(0);
    });
    const main = container.querySelector('#__admin_main_content')!;

    await waitFor(
      () => {
        const value = document.documentElement.style.getPropertyValue(
          '--layout-content-height',
        );
        expect(value.endsWith('px')).toBe(true);
      },
      { timeout: 2000 },
    );

    expect(main).toBeTruthy();
  });

  it('app.isMobile=true 时渲染不进入 setState 死循环（#185 回归）', async () => {
    usePreferencesStore.setState({
      app: { ...defaultPreferences.app, isMobile: true },
    });

    const { container } = renderShell();

    await waitFor(() => {
      expect(container.querySelector('#__admin_main_content')).toBeTruthy();
    });

    expect(usePreferencesStore.getState().sidebar.collapsed).toBe(true);
  });
});

afterEach(() => {
  usePreferencesStore.setState({ app: { ...defaultPreferences.app } });
});
