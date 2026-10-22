import type { MenuRecordRaw } from '@zanelab/types';

export type MenuRecordWithParents = MenuRecordRaw & { parents: string[] };

function findMenuByPath(
  menus: MenuRecordRaw[],
  path?: string,
  parents: string[] = [],
): MenuRecordWithParents | undefined {
  for (const menu of menus) {
    if (menu.path === path) {
      return { ...menu, parents: menu.parents ?? parents };
    }
    if (menu.children && menu.children.length > 0) {
      const found = findMenuByPath(menu.children, path, [
        ...parents,
        menu.path,
      ]);
      if (found) return found;
    }
  }
  return undefined;
}

function findRootMenuByPath(menus: MenuRecordRaw[], path?: string, level = 0) {
  const findMenu = findMenuByPath(menus, path);
  const rootMenuPath = findMenu?.parents?.[level];
  const rootMenu = rootMenuPath
    ? menus.find((item) => item.path === rootMenuPath)
    : undefined;
  return {
    findMenu,
    rootMenu,
    rootMenuPath,
  };
}

function withParents(
  menus: MenuRecordRaw[],
  parents: string[] = [],
): MenuRecordWithParents[] {
  return menus.map((menu) => ({
    ...menu,
    parents: menu.parents ?? parents,
    children: menu.children
      ? withParents(menu.children, [...parents, menu.path])
      : undefined,
  }));
}

export { findMenuByPath, findRootMenuByPath, withParents };
