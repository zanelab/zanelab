import { act } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../../locales/i18n';
import { registerRoutes } from '../../../router/route-meta';
import { Breadcrumb } from './breadcrumb';

// 切语言组件渲染测试（09-09-i18n R6）：面包屑为 menuTitle 的直接消费点，
// route-meta 存原始值（title/i18nKey），渲染期解析——changeLanguage 后
// useTranslation 订阅触发重渲染，标题以新语言重算。

afterEach(() => {
  cleanup();
});

describe('Breadcrumb 菜单标题国际化', () => {
  it('i18nKey 命中：changeLanguage 后面包屑标题切换', async () => {
    registerRoutes([
      { path: '/system', title: '系统管理', i18nKey: 'menus.system.title' },
      {
        path: '/system/users',
        title: '用户管理',
        i18nKey: 'menus.system.users',
      },
    ]);
    await act(async () => {
      await i18n.changeLanguage('zh-CN');
    });

    render(
      <MemoryRouter initialEntries={['/system/users']}>
        <Breadcrumb />
      </MemoryRouter>,
    );
    expect(screen.getByText('系统管理')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();

    await act(async () => {
      await i18n.changeLanguage('en-US');
    });
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('无 i18nKey：回退 title 原文，切语言不变化', async () => {
    registerRoutes([{ path: '/plain', title: '原文标题' }]);
    await act(async () => {
      await i18n.changeLanguage('zh-CN');
    });

    render(
      <MemoryRouter initialEntries={['/plain']}>
        <Breadcrumb />
      </MemoryRouter>,
    );
    expect(screen.getByText('原文标题')).toBeInTheDocument();

    await act(async () => {
      await i18n.changeLanguage('en-US');
    });
    expect(screen.getByText('原文标题')).toBeInTheDocument();
  });
});
