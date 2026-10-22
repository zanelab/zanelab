import { beforeEach, describe, expect, it } from 'vitest';
import {
  flattenPermissions,
  initialMenuState,
  useMenuStore,
} from './menu-store';
import type { MenuItem } from '../types';

const menus: MenuItem[] = [
  { id: 1, name: '首页', path: '/dashboard', component: 'dashboard' },
  {
    id: 2,
    name: '组件',
    path: '/components',
    children: [
      {
        id: 21,
        name: '按钮',
        path: '/components/button',
        permission: 'demo:button:view',
      },
      {
        id: 22,
        name: '表格',
        path: '/components/table',
        permission: 'demo:table:view',
      },
    ],
  },
];

beforeEach(() => {
  useMenuStore.setState(initialMenuState);
});

describe('flattenPermissions', () => {
  it('递归收集子菜单权限码，跳过无 permission 的节点', () => {
    expect(flattenPermissions(menus)).toEqual([
      'demo:button:view',
      'demo:table:view',
    ]);
  });
});

describe('useMenuStore', () => {
  it('初始为空', () => {
    expect(useMenuStore.getState()).toMatchObject({
      menus: [],
      permissions: [],
    });
  });

  it('setMenus 同步重算 permissions', () => {
    useMenuStore.getState().setMenus(menus);
    expect(useMenuStore.getState().menus).toHaveLength(2);
    expect(useMenuStore.getState().permissions).toEqual([
      'demo:button:view',
      'demo:table:view',
    ]);
  });

  it('mergePermissions 追加去重的新权限码', () => {
    useMenuStore.getState().setMenus(menus);
    useMenuStore.getState().mergePermissions(['system:user:list']);
    expect(useMenuStore.getState().permissions).toEqual([
      'demo:button:view',
      'demo:table:view',
      'system:user:list',
    ]);

    useMenuStore.getState().mergePermissions(['demo:button:view']);
    expect(useMenuStore.getState().permissions).toHaveLength(3);
  });

  it('clearMenus 清空 menus 与 permissions', () => {
    useMenuStore.getState().setMenus(menus);
    useMenuStore.getState().clearMenus();
    expect(useMenuStore.getState()).toMatchObject({
      menus: [],
      permissions: [],
    });
  });
});
