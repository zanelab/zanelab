import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { MenuRecordRaw } from '@zanelab/types';
import { getRouteMeta } from '../../../../router/route-meta';
import { findRootMenuByPath, withParents } from '@zanelab/utils';
import { useLayoutFromPreferences } from '../../hooks/use-preferences';
import { useNavigation } from './use-navigation';
import { usePreferencesStore } from '../../../../stores/preferences-store';

interface UseMixedMenuOptions {
  menus: MenuRecordRaw[];
  currentPath: string;
}

/**
 * 深度优先取菜单树中第一个可导航路径（有 path 的叶子节点）。
 * 与 utils/menu-views.ts 的 findFirstNavigablePath 同算法，但入参为
 * MenuRecordRaw（不含 id/name 约束），供布局菜单内部使用。
 */
function findFirstNavigablePath(menus: MenuRecordRaw[]): string | undefined {
  for (const menu of menus) {
    if (!menu.path) continue;
    if (menu.children?.length) {
      const childPath = findFirstNavigablePath(menu.children);
      if (childPath) return childPath;
    }
    return menu.path;
  }
  return undefined;
}

/**
 * useMixedMenu — 1:1 port of basic/menu/use-mixed-menu.ts.
 * 混合/拆分菜单计算：headerMenus / sidebarMenus / mixExtraMenus 及激活路径。
 */
export function useMixedMenu({ menus, currentPath }: UseMixedMenuOptions) {
  const { navigation, willOpenedByWindow } = useNavigation();
  const preferences = usePreferencesStore();
  // reference 的 useMixedMenu 用 usePreferences（isMixedNav 仅 mixed-nav），
  // 而非 layout-ui 的 useLayout（isMixedNav 含 header-sidebar-nav）
  const { isMixedNav, isHeaderMixedNav } = useLayoutFromPreferences();

  const [rootMenuPath, setRootMenuPath] = useState<string>('');
  const [splitSideMenus, setSplitSideMenus] = useState<MenuRecordRaw[]>([]);
  const [mixedRootMenuPath, setMixedRootMenuPath] = useState<string>('');
  const [mixExtraMenus, setMixExtraMenus] = useState<MenuRecordRaw[]>([]);

  /** 记录当前顶级菜单下哪个子菜单最后激活 */
  const defaultSubMap = useRef(new Map<string, string>());

  /** 带 parents 的全树菜单（等价于 上游菜单数据 数据自带的 parents 字段） */
  const menusWithParents = useMemo(() => withParents(menus), [menus]);

  const needSplit =
    (preferences.navigation.split && isMixedNav) || isHeaderMixedNav;

  const sidebarEnable = preferences.sidebar.enable;

  const sidebarVisible = useMemo(() => {
    if (needSplit) {
      return sidebarEnable && splitSideMenus.length > 0;
    }
    return sidebarEnable;
  }, [needSplit, sidebarEnable, splitSideMenus]);

  /** 头部菜单：去掉 children */
  const headerMenus = useMemo(() => {
    if (!needSplit) return menus;
    return menus.map((item) => ({ ...item, children: [] }));
  }, [needSplit, menus]);

  /** 侧边菜单 */
  const sidebarMenus = useMemo(() => {
    return needSplit ? splitSideMenus : menus;
  }, [needSplit, splitSideMenus, menus]);

  const mixHeaderMenus = useMemo(() => {
    return isHeaderMixedNav ? sidebarMenus : headerMenus;
  }, [isHeaderMixedNav, sidebarMenus, headerMenus]);

  /** 路由 activePath（等价于 route.meta.activePath） */
  const activePath = getRouteMeta(currentPath)?.activePath;

  /** 侧边菜单激活路径 */
  const sidebarActive = activePath ?? currentPath;

  /** 头部菜单激活路径 */
  const headerActive = useMemo(() => {
    if (!needSplit) return activePath ?? currentPath;
    return rootMenuPath;
  }, [needSplit, activePath, currentPath, rootMenuPath]);

  /**
   * 菜单点击事件处理（use-mixed-menu.ts handleMenuSelect）
   * @param key 菜单路径
   * @param mode 菜单模式
   */
  const handleMenuSelect = useCallback(
    (key: string, mode?: string) => {
      if (!needSplit || mode === 'vertical') {
        navigation(key);
        return;
      }

      // 从带全树 parents 的菜单取子树（等价参考实现 的 generate-menus 数据切片，
      // parents 保留全树层级）
      const rootMenu = menusWithParents.find((item) => item.path === key);
      const _splitSideMenus = rootMenu?.children ?? [];
      // 外链/新窗口菜单不做左侧菜单联动（沿用原逻辑：仅自身按需打开）
      const openedByWindow = willOpenedByWindow(key);

      if (!openedByWindow) {
        setRootMenuPath(rootMenu?.path ?? '');
        setSplitSideMenus(_splitSideMenus);
      }

      if (_splitSideMenus.length === 0) {
        navigation(key);
        return;
      }

      // 切换到「另一个」顶部菜单时，左侧菜单默认落到第一个可导航子菜单，
      // 并同步跳转，使左侧高亮与实际页面一致；重复点击当前顶部菜单不跳转。
      if (!openedByWindow && rootMenu && key !== rootMenuPath) {
        const firstPath = findFirstNavigablePath(_splitSideMenus);
        if (firstPath) {
          navigation(firstPath);
        }
      }
    },
    [needSplit, menusWithParents, navigation, willOpenedByWindow, rootMenuPath],
  );

  /**
   * 侧边菜单展开事件
   * @param key 路由路径
   * @param parentsPath 父级路径
   */
  const handleMenuOpen = useCallback(
    (key: string, parentsPath: string[]) => {
      if (parentsPath.length <= 1 && preferences.sidebar.autoActivateChild) {
        navigation(
          defaultSubMap.current.has(key)
            ? (defaultSubMap.current.get(key) as string)
            : key,
        );
      }
    },
    [navigation, preferences.sidebar.autoActivateChild],
  );

  /**
   * 计算侧边菜单
   * @param path 路由路径
   * @returns 新的 rootMenuPath（供 defaultSubMap 记录）
   */
  function calcSideMenus(path: string): string {
    let { rootMenu } = findRootMenuByPath(menusWithParents, path);
    if (!rootMenu) {
      rootMenu = menusWithParents.find((item) => item.path === path);
    }
    const result = findRootMenuByPath(rootMenu?.children || [], path, 1);
    setMixedRootMenuPath(result.rootMenuPath ?? '');
    setMixExtraMenus(result.rootMenu?.children ?? []);
    setRootMenuPath(rootMenu?.path ?? '');
    setSplitSideMenus(rootMenu?.children ?? []);
    return rootMenu?.path ?? '';
  }

  // 路由变化时计算侧边菜单（等价于 watch(route.path, { immediate: true })）
  useEffect(() => {
    const meta = getRouteMeta(currentPath);
    const path = meta?.activePath ?? meta?.link ?? currentPath;
    if (willOpenedByWindow(path)) {
      return;
    }
    const newRootMenuPath = calcSideMenus(path);
    if (newRootMenuPath) {
      defaultSubMap.current.set(newRootMenuPath, path);
    }
  }, [currentPath, menusWithParents]);

  return {
    handleMenuSelect,
    handleMenuOpen,
    headerActive,
    headerMenus,
    sidebarActive,
    sidebarMenus,
    mixHeaderMenus,
    mixExtraMenus,
    mixedRootMenuPath,
    sidebarVisible,
  };
}
