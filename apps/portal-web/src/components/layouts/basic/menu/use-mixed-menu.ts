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

export function useMixedMenu({ menus, currentPath }: UseMixedMenuOptions) {
  const { navigation, willOpenedByWindow } = useNavigation();
  const preferences = usePreferencesStore();

  const { isMixedNav, isHeaderMixedNav } = useLayoutFromPreferences();

  const [rootMenuPath, setRootMenuPath] = useState<string>('');
  const [splitSideMenus, setSplitSideMenus] = useState<MenuRecordRaw[]>([]);
  const [mixedRootMenuPath, setMixedRootMenuPath] = useState<string>('');
  const [mixExtraMenus, setMixExtraMenus] = useState<MenuRecordRaw[]>([]);

  const defaultSubMap = useRef(new Map<string, string>());

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

  const headerMenus = useMemo(() => {
    if (!needSplit) return menus;
    return menus.map((item) => ({ ...item, children: [] }));
  }, [needSplit, menus]);

  const sidebarMenus = useMemo(() => {
    return needSplit ? splitSideMenus : menus;
  }, [needSplit, splitSideMenus, menus]);

  const mixHeaderMenus = useMemo(() => {
    return isHeaderMixedNav ? sidebarMenus : headerMenus;
  }, [isHeaderMixedNav, sidebarMenus, headerMenus]);

  const activePath = getRouteMeta(currentPath)?.activePath;

  const sidebarActive = activePath ?? currentPath;

  const headerActive = useMemo(() => {
    if (!needSplit) return activePath ?? currentPath;
    return rootMenuPath;
  }, [needSplit, activePath, currentPath, rootMenuPath]);

  const handleMenuSelect = useCallback(
    (key: string, mode?: string) => {
      if (!needSplit || mode === 'vertical') {
        navigation(key);
        return;
      }

      const rootMenu = menusWithParents.find((item) => item.path === key);
      const _splitSideMenus = rootMenu?.children ?? [];

      const openedByWindow = willOpenedByWindow(key);

      if (!openedByWindow) {
        setRootMenuPath(rootMenu?.path ?? '');
        setSplitSideMenus(_splitSideMenus);
      }

      if (_splitSideMenus.length === 0) {
        navigation(key);
        return;
      }

      if (!openedByWindow && rootMenu && key !== rootMenuPath) {
        const firstPath = findFirstNavigablePath(_splitSideMenus);
        if (firstPath) {
          navigation(firstPath);
        }
      }
    },
    [needSplit, menusWithParents, navigation, willOpenedByWindow, rootMenuPath],
  );

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
