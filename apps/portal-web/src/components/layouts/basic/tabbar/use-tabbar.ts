import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { usePreferencesStore } from '../../../../stores/preferences-store';
import {
  getDisplayTabs,
  getTabKey,
  useTabbarStore,
  type TabDefinition,
} from '../../../../stores/tabbar-store';
import type { IContextMenuItem } from '../../../tabs/types';
import { getAffixRoutes, getRouteMeta } from '../../../../router/route-meta';
import { menuTitle } from '../../../../locales/i18n';

function locationToTab(pathname: string, search: string): TabDefinition {
  const query: Record<string, any> = {};
  new URLSearchParams(search).forEach((value, key) => {
    query[key] = value;
  });
  const meta = getRouteMeta(pathname);
  return {
    path: pathname,
    fullPath: pathname + search,
    name: pathname,
    query,
    meta: meta ? { ...meta } : {},
  };
}

function wrapperTabLocale(tab: TabDefinition): TabDefinition {
  const routeMeta = getRouteMeta(tab.path);
  return {
    ...tab,
    meta: {
      ...tab?.meta,
      title:
        tab?.meta?.newTabTitle ??
        menuTitle({
          name: tab?.meta?.title ?? routeMeta?.title ?? '',
          i18nKey: tab?.meta?.i18nKey ?? routeMeta?.i18nKey,
        }),
    },
  };
}

export function useTabbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { t, i18n: i18nInstance } = useTranslation();
  const tabs = useTabbarStore((s) => s.tabs);
  const updateTime = useTabbarStore((s) => s.updateTime);
  const headerHidden = usePreferencesStore((s) => s.header.hidden);
  const sidebarHidden = usePreferencesStore((s) => s.sidebar.hidden);

  const contentIsMaximize = headerHidden && sidebarHidden;

  const routeTab = useMemo(
    () => locationToTab(location.pathname, location.search),
    [location.pathname, location.search],
  );
  const currentActive = getTabKey(routeTab);

  const currentTabs = useMemo(
    () => getDisplayTabs(tabs).map((item) => wrapperTabLocale(item)),
    [tabs, updateTime, i18nInstance.language],
  );

  const initAffixTabs = useCallback(() => {
    const affixTabs = getAffixRoutes().map((route) =>
      locationToTab(route.path, ''),
    );
    useTabbarStore.getState().setAffixTabs(affixTabs);
  }, []);

  const handleClick = useCallback(
    (key: string) => {
      const { fullPath, path } =
        useTabbarStore.getState().getTabByKey(key) ?? {};
      if (fullPath || path) {
        navigate(fullPath || (path as string));
      }
    },
    [navigate],
  );

  const handleClose = useCallback(
    async (key: string) => {
      await useTabbarStore
        .getState()
        .closeTabByKey(
          key,
          navigate,
          getTabKey(locationToTab(location.pathname, location.search)),
        );
    },
    [navigate, location.pathname, location.search],
  );

  const toggleMaximize = useCallback(() => {
    const store = usePreferencesStore.getState();
    store.updatePreferences({
      header: { hidden: !contentIsMaximize },
      sidebar: { hidden: !contentIsMaximize },
    });
  }, [contentIsMaximize]);

  const refreshTab = useCallback(
    async (name?: string) => {
      if (name) {
        await useTabbarStore.getState().refreshByName(name);
      } else {
        await useTabbarStore.getState().refresh(routeTab.name as string);
      }
    },
    [routeTab.name],
  );

  const openTabInNewWindow = useCallback((tab: TabDefinition) => {
    useTabbarStore.getState().openTabInNewWindow(tab);
  }, []);

  const getTabDisableState = useCallback(
    (tab: TabDefinition = routeTab) => {
      const state = useTabbarStore.getState();
      const allTabs = state.tabs;
      const affixTabs = allTabs.filter((t) => t.meta?.affixTab);
      const index = allTabs.findIndex((item) => item.path === tab.path);

      const disabled = allTabs.length <= 1;
      const affixTab = tab.meta?.affixTab ?? false;
      const isCurrentTab = currentActive === getTabKey(tab);

      const disabledCloseLeft =
        index === 0 || index - affixTabs.length <= 0 || !isCurrentTab;
      const disabledCloseRight = !isCurrentTab || index === allTabs.length - 1;
      const disabledCloseOther =
        disabled || !isCurrentTab || allTabs.length - affixTabs.length <= 1;

      return {
        disabledCloseAll: disabled,
        disabledCloseCurrent: !!affixTab || disabled,
        disabledCloseLeft,
        disabledCloseOther,
        disabledCloseRight,
        disabledRefresh: !isCurrentTab,
      };
    },
    [routeTab, currentActive],
  );

  useEffect(() => {
    initAffixTabs();
  }, [initAffixTabs]);

  useEffect(() => {
    useTabbarStore.getState().addTab(routeTab);
  }, [routeTab]);

  const createContextMenus = useCallback(
    (tab: TabDefinition) => {
      const store = useTabbarStore.getState();
      const {
        disabledCloseAll,
        disabledCloseCurrent,
        disabledCloseLeft,
        disabledCloseOther,
        disabledCloseRight,
        disabledRefresh,
      } = getTabDisableState(tab);

      const affixTab = tab?.meta?.affixTab ?? false;

      const menus: IContextMenuItem[] = [
        {
          disabled: disabledCloseCurrent,
          handler: () => store.closeTab(tab, navigate, currentActive),
          icon: 'close',
          key: 'close',
          text: t('widgets.tabbar.contextMenu.close'),
        },
        {
          handler: () => store.toggleTabPin(tab),

          icon: 'pin',
          key: 'affix',
          text: affixTab
            ? t('widgets.tabbar.contextMenu.unpin')
            : t('widgets.tabbar.contextMenu.pin'),
        },
        {
          handler: () => {
            if (!contentIsMaximize) {
              navigate(tab.fullPath || tab.path);
            }
            toggleMaximize();
          },
          icon: contentIsMaximize ? 'minimize' : 'maximize',
          key: contentIsMaximize ? 'restore-maximize' : 'maximize',
          text: contentIsMaximize
            ? t('widgets.tabbar.contextMenu.restore')
            : t('widgets.tabbar.contextMenu.maximize'),
        },
        {
          disabled: disabledRefresh,

          handler: () => refreshTab(),
          icon: 'rotate-cw',
          key: 'reload',
          text: t('widgets.tabbar.contextMenu.reload'),
        },
        {
          handler: () => openTabInNewWindow(tab),
          icon: 'external-link',
          key: 'open-in-new-window',
          divider: true,
          text: t('widgets.tabbar.contextMenu.openInNewWindow'),
        },
        {
          disabled: disabledCloseLeft,
          handler: () => store.closeLeftTabs(tab),
          icon: 'close-left',
          key: 'close-left',
          text: t('widgets.tabbar.contextMenu.closeLeft'),
        },
        {
          disabled: disabledCloseRight,
          handler: () => store.closeRightTabs(tab),
          icon: 'close-right',
          key: 'close-right',
          divider: true,
          text: t('widgets.tabbar.contextMenu.closeRight'),
        },
        {
          disabled: disabledCloseOther,
          handler: () => store.closeOtherTabs(tab),
          icon: 'close-other',
          key: 'close-other',
          text: t('widgets.tabbar.contextMenu.closeOther'),
        },
        {
          disabled: disabledCloseAll,
          handler: () => store.closeAllTabs(navigate),
          icon: 'close-all',
          key: 'close-all',
          text: t('widgets.tabbar.contextMenu.closeAll'),
        },
      ];

      return menus.filter((item) => store.menuList.includes(item.key));
    },
    [
      navigate,
      currentActive,
      t,
      contentIsMaximize,
      toggleMaximize,
      refreshTab,
      openTabInNewWindow,
      getTabDisableState,
    ],
  );

  return {
    createContextMenus,
    currentActive,
    currentTabs,
    handleClick,
    handleClose,
  };
}
