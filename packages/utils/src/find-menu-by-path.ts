import type { MenuRecordRaw } from '@zanelab/types';

export type MenuRecordWithParents = MenuRecordRaw & { parents: string[] };

/**
 * findMenuByPath — 与上游工具包同名函数的 1:1 port。
 * 深度遍历菜单树查找指定路径，并附带 parents 路径数组。
 */
function findMenuByPath(
  menus: MenuRecordRaw[],
  path?: string,
  parents: string[] = [],
): MenuRecordWithParents | undefined {
  for (const menu of menus) {
    if (menu.path === path) {
      // 优先使用数据自带的 parents（等价于上游 菜单数据的 parents 字段，
      // 全树层级 —— findRootMenuByPath(rootMenu.children, path, 1) 的
      // parents[1] 语义依赖它，而非相对当前列表的计算值）
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

/**
 * findRootMenuByPath — 与上游工具包同名函数的 1:1 port。
 * 按 level 取目标菜单的指定层级祖先菜单。
 */
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

/**
 * withParents — 为菜单树补全 parents 路径数组（等价于上游 generate-menus
 * 写入菜单数据的 parents 字段，全树层级）。已带 parents 的节点（子树切片
 * 时保留的原全树 parents）不覆盖。
 */
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
