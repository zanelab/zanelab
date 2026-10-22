import { afterEach, describe, expect, it } from 'vitest';
import { appConfig } from '../config';
import type { MenuItem } from '../types';
import {
  collectDropdownMenus,
  findFirstNavigablePath,
  toShellMenus,
} from './menu-views';

const normalTree: MenuItem[] = [
  { id: 1, name: '首页', path: '/dashboard', component: 'dashboard' },
  {
    id: 2,
    name: '组件示例',
    path: '/components',
    children: [
      {
        id: 21,
        name: '按钮',
        path: '/components/button',
        component: 'components/button',
      },
      {
        id: 22,
        name: '表格',
        path: '/components/table',
        component: 'components/table',
      },
    ],
  },
];

describe('findFirstNavigablePath（默认落点，09-14 切租户/空间兜底）', () => {
  afterEach(() => {
    appConfig.microApps = {};
  });

  it('深度优先取第一个可导航叶子', () => {
    const menus: MenuItem[] = [
      { id: 1, name: '首页', path: '/dashboard', component: 'dashboard' },
      {
        id: 2,
        name: '组件示例',
        path: '/components',
        children: [
          {
            id: 21,
            name: '按钮',
            path: '/components/button',
            component: 'components/button',
          },
        ],
      },
    ];
    expect(findFirstNavigablePath(menus)).toBe('/dashboard');
  });

  it('子菜单全是 button（无 path）→ 父节点自身为落点', () => {
    const menus: MenuItem[] = [
      {
        id: 1,
        name: '工作台',
        path: '/agent_flow/app/list',
        appName: 'agent_flow',
        type: 'menu',
        children: [{ id: 11, name: '查看', path: '', type: 'button' }],
      },
    ];
    expect(findFirstNavigablePath(menus)).toBe('/agent_flow/app/list');
  });

  it('第一个应用是空壳（无子菜单、未注册子应用）→ 取第二个应用的菜单', () => {
    const menus: MenuItem[] = [
      {
        id: 1,
        name: 'AgentFlow',
        path: '/agent_flow',
        appName: 'agent_flow',
        type: 'app',
      },
      {
        id: 2,
        name: 'MAIP',
        path: '/maip',
        appName: 'maip',
        type: 'app',
        children: [
          {
            id: 21,
            name: '基础模型',
            path: '/maip/model_manage/basic',
            appName: 'maip',
            type: 'menu',
          },
        ],
      },
    ];
    expect(findFirstNavigablePath(menus)).toBe('/maip/model_manage/basic');
  });

  it('已注册子应用的空应用根（自身即入口）仍为落点', () => {
    appConfig.microApps = {
      iam: {
        name: 'iam',
        entry: '//localhost:8081',
        container: '#subapp-container',
        activeRule: '/iam',
        props: {},
        prefetch: false,
      },
    };
    const menus: MenuItem[] = [
      { id: 1, name: '系统管理', path: '/iam', appName: 'iam', type: 'app' },
    ];
    expect(findFirstNavigablePath(menus)).toBe('/iam');
  });

  it('不产路由的目录被跳过，取下一个有内容的菜单', () => {
    const menus: MenuItem[] = [
      {
        id: 1,
        name: '空目录',
        path: '/empty',
        type: 'group',
        children: [{ id: 11, name: '查看', path: '', type: 'button' }],
      },
      { id: 2, name: '首页', path: '/dashboard', component: 'dashboard' },
    ];
    expect(findFirstNavigablePath(menus)).toBe('/dashboard');
  });

  it('全树都无可用落点 → 保底取第一个有 path 的节点', () => {
    const menus: MenuItem[] = [
      { id: 1, name: '空目录', path: '/empty', type: 'group' },
    ];
    expect(findFirstNavigablePath(menus)).toBe('/empty');
  });
});

describe('toShellMenus', () => {
  it('无 menuType 的存量菜单全量透传（等价兼容）', () => {
    expect(toShellMenus(normalTree)).toEqual([
      { path: '/dashboard', name: '首页' },
      {
        path: '/components',
        name: '组件示例',
        children: [
          { path: '/components/button', name: '按钮' },
          { path: '/components/table', name: '表格' },
        ],
      },
    ]);
  });

  it('icon 标识符字符串透传（AppIcon 消费端解析，09-08-icon-registry）', () => {
    const menus: MenuItem[] = [
      { id: 1, name: '首页', path: '/dashboard', icon: 'home' },
      {
        id: 2,
        name: '系统管理',
        path: '/system',
        icon: 'system',
        children: [
          { id: 21, name: '用户管理', path: '/system/users', icon: 'user' },
        ],
      },
    ];
    expect(toShellMenus(menus)).toEqual([
      { path: '/dashboard', name: '首页', icon: 'home' },
      {
        path: '/system',
        name: '系统管理',
        icon: 'system',
        children: [{ path: '/system/users', name: '用户管理', icon: 'user' }],
      },
    ]);
  });

  it('menuType: normal 与缺省行为一致', () => {
    const menus: MenuItem[] = [
      { id: 1, name: '首页', path: '/dashboard', menuType: 'normal' },
    ];
    expect(toShellMenus(menus)).toEqual([{ path: '/dashboard', name: '首页' }]);
  });

  it('顶层 user-dropdown 条目被剔除', () => {
    const menus: MenuItem[] = [
      ...normalTree,
      { id: 4, name: '个人中心', path: '/profile', menuType: 'user-dropdown' },
    ];
    const shell = toShellMenus(menus);
    expect(shell).toHaveLength(2);
    expect(shell.map((m) => m.path)).not.toContain('/profile');
  });

  it('嵌套在目录下的 user-dropdown 条目被剔除', () => {
    const menus: MenuItem[] = [
      {
        id: 2,
        name: '组件示例',
        path: '/components',
        children: [
          { id: 21, name: '按钮', path: '/components/button' },
          {
            id: 23,
            name: '个人中心',
            path: '/profile',
            menuType: 'user-dropdown',
          },
        ],
      },
    ];
    const shell = toShellMenus(menus);
    expect(shell[0].children).toEqual([
      { path: '/components/button', name: '按钮' },
    ]);
  });

  it('user-dropdown 条目的 children 子树整体剔除', () => {
    const menus: MenuItem[] = [
      {
        id: 4,
        name: '个人中心',
        path: '/profile',
        menuType: 'user-dropdown',
        children: [{ id: 41, name: '子项', path: '/profile/sub' }],
      },
    ];
    expect(toShellMenus(menus)).toEqual([]);
  });
});

describe('collectDropdownMenus', () => {
  it('收集任意层级的 user-dropdown 条目，子树递归保留为树', () => {
    const menus: MenuItem[] = [
      {
        id: 4,
        name: '个人中心',
        path: '/profile',
        icon: 'user',
        menuType: 'user-dropdown',
        children: [
          { id: 41, name: '基本资料', path: '/profile/basic' },
          {
            id: 42,
            name: '安全设置',
            path: '/profile/security',
            icon: 'shield',
          },
        ],
      },
      {
        id: 2,
        name: '系统管理',
        path: '/system',
        children: [
          { id: 31, name: '用户管理', path: '/system/users' },
          {
            id: 43,
            name: '安全设置',
            path: '/settings/security',
            menuType: 'user-dropdown',
          },
        ],
      },
    ];
    expect(collectDropdownMenus(menus)).toEqual([
      {
        name: '个人中心',
        path: '/profile',
        icon: 'user',
        children: [
          { name: '基本资料', path: '/profile/basic', icon: undefined },
          { name: '安全设置', path: '/profile/security', icon: 'shield' },
        ],
      },
      { name: '安全设置', path: '/settings/security', icon: undefined },
    ]);
  });

  it('支持 3 层及以上嵌套', () => {
    const menus: MenuItem[] = [
      {
        id: 4,
        name: '个人中心',
        path: '/profile',
        menuType: 'user-dropdown',
        children: [
          {
            id: 41,
            name: '安全设置',
            path: '/profile/security',
            children: [
              { id: 411, name: '修改密码', path: '/profile/security/password' },
            ],
          },
        ],
      },
    ];
    expect(collectDropdownMenus(menus)).toEqual([
      {
        name: '个人中心',
        path: '/profile',
        icon: undefined,
        children: [
          {
            name: '安全设置',
            path: '/profile/security',
            icon: undefined,
            children: [
              {
                name: '修改密码',
                path: '/profile/security/password',
                icon: undefined,
              },
            ],
          },
        ],
      },
    ]);
  });

  it('子树内层级的 menuType 不判定（user-dropdown 祖先决定渲染目标）', () => {
    const menus: MenuItem[] = [
      {
        id: 4,
        name: '个人中心',
        path: '/profile',
        menuType: 'user-dropdown',
        children: [
          {
            id: 41,
            name: '基本资料',
            path: '/profile/basic',
            menuType: 'normal',
          },
        ],
      },
    ];
    expect(collectDropdownMenus(menus)[0].children).toEqual([
      { name: '基本资料', path: '/profile/basic', icon: undefined },
    ]);
  });

  it('无 children 的条目不产 children 键（叶子语义）', () => {
    const menus: MenuItem[] = [
      { id: 4, name: '个人中心', path: '/profile', menuType: 'user-dropdown' },
    ];
    expect(collectDropdownMenus(menus)).toEqual([
      { name: '个人中心', path: '/profile', icon: undefined },
    ]);
  });

  it('无 user-dropdown 条目时返回空数组', () => {
    expect(collectDropdownMenus(normalTree)).toEqual([]);
  });
});
