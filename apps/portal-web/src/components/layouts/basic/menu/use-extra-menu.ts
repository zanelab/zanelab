import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuRecordRaw } from '@zanelab/types';
import { getRouteMeta } from '../../../../router/route-meta';
import { findRootMenuByPath } from '@zanelab/utils';
import { usePreferencesStore } from '../../../../stores/preferences-store';
import { useNavigation } from './use-navigation';

/** 带 parents 的菜单记录（parents 由 withParents 补全，可选以防普通透传） */
type MixedMenuRecord = MenuRecordRaw & { parents?: string[] };

interface UseExtraMenuOptions {
  menus: MenuRecordRaw[];
  currentPath: string;
}

/**
 * useExtraMenu — 1:1 port of basic/menu/use-extra-menu.ts.
 * 双列（sidebar-mixed-nav / header-mixed-nav）第二列菜单计算。
 */
export function useExtraMenu({ menus, currentPath }: UseExtraMenuOptions) {
  const { navigation, willOpenedByWindow } = useNavigation();
  const preferences = usePreferencesStore();

  /** 记录当前顶级菜单下哪个子菜单最后激活（跨渲染持久化） */
  const defaultSubMap = useRef(new Map<string, string>());
  const [extraRootMenus, setExtraRootMenus] = useState<MenuRecordRaw[]>([]);
  const [extraMenus, setExtraMenus] = useState<MenuRecordRaw[]>([]);
  const [sidebarExtraVisible, setSidebarExtraVisible] = useState(false);
  const [extraActiveMenu, setExtraActiveMenu] = useState('');
  const parentLevel = preferences.app.layout === 'header-mixed-nav' ? 1 : 0;

  /**
   * 选择混合菜单事件
   * @param menu
   */
  const handleMixedMenuSelect = useCallback(
    async (menu: MixedMenuRecord) => {
      const _extraMenus = menu?.children ?? [];
      const hasChildren = _extraMenus.length > 0;

      if (!willOpenedByWindow(menu.path)) {
        setExtraMenus(_extraMenus ?? []);
        setExtraActiveMenu(menu.parents?.[parentLevel] ?? menu.path);
        setSidebarExtraVisible(hasChildren);
      }

      if (!hasChildren) {
        await navigation(menu.path);
      } else if (preferences.sidebar.autoActivateChild) {
        await navigation(
          defaultSubMap.current.has(menu.path)
            ? (defaultSubMap.current.get(menu.path) as string)
            : menu.path,
        );
      }
    },

    [
      navigation,
      willOpenedByWindow,
      parentLevel,
      preferences.sidebar.autoActivateChild,
    ],
  );

  /**
   * 选择默认菜单事件（onBeforeMount defaultSelect）
   * @param menu
   * @param rootMenu
   */
  const handleDefaultSelect = useCallback(
    async (menu: MixedMenuRecord, rootMenu?: MenuRecordRaw) => {
      // 先计算新 extraMenus，可见性按新值判定（reference 读取赋值后的 extraMenus）
      const nextMenus = rootMenu?.children ?? extraRootMenus ?? [];
      setExtraMenus(nextMenus);
      setExtraActiveMenu(menu.parents?.[parentLevel] ?? menu.path);

      if (preferences.sidebar.expandOnHover) {
        setSidebarExtraVisible(nextMenus.length > 0);
      }
    },

    [parentLevel, preferences.sidebar.expandOnHover, extraRootMenus],
  );

  /**
   * 侧边菜单鼠标移出事件
   */
  const handleSideMouseLeave = useCallback(() => {
    if (preferences.sidebar.expandOnHover) {
      return;
    }

    const { findMenu, rootMenu, rootMenuPath } = findRootMenuByPath(
      menus,
      currentPath,
    );
    setExtraActiveMenu(rootMenuPath ?? findMenu?.path ?? '');
    setExtraMenus(rootMenu?.children ?? []);
  }, [menus, currentPath, preferences.sidebar.expandOnHover]);

  /**
   * 菜单鼠标进入事件
   */
  const handleMenuMouseEnter = useCallback(
    (menu: MixedMenuRecord) => {
      if (!preferences.sidebar.expandOnHover) {
        const { findMenu } = findRootMenuByPath(menus, menu.path);
        const nextMenus = findMenu?.children ?? [];
        setExtraMenus(nextMenus);
        setExtraActiveMenu(menu.parents?.[parentLevel] ?? menu.path);
        setSidebarExtraVisible(nextMenus.length > 0);
      }
    },

    [menus, parentLevel, preferences.sidebar.expandOnHover],
  );

  function calcExtraMenus(path: string) {
    const currentPath = getRouteMeta(path)?.activePath || path;
    const { findMenu, rootMenu, rootMenuPath } = findRootMenuByPath(
      menus,
      currentPath,
      parentLevel,
    );
    setExtraRootMenus(rootMenu?.children ?? []);
    if (rootMenuPath) defaultSubMap.current.set(rootMenuPath, currentPath);
    setExtraActiveMenu(rootMenuPath ?? findMenu?.path ?? '');
    setExtraMenus(rootMenu?.children ?? []);
    if (preferences.sidebar.expandOnHover) {
      setSidebarExtraVisible((rootMenu?.children ?? []).length > 0);
    }
  }

  // watch([route.path, layout], immediate) 等价
  useEffect(() => {
    calcExtraMenus(currentPath || '');
  }, [currentPath, menus, parentLevel]);

  return {
    extraActiveMenu,
    extraMenus,
    handleDefaultSelect,
    handleMenuMouseEnter,
    handleMixedMenuSelect,
    handleSideMouseLeave,
    setSidebarExtraVisible,
    sidebarExtraVisible,
  };
}
