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

/** 当前 location → TabDefinition（等价于 vue 的 route → tab 转换） */
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

/**
 * 国际化包装（09-09-i18n）：渲染期经 menuTitle 解析标题——i18nKey 命中语言包
 * 取翻译，否则回退 meta.title（接口原始 name）；newTabTitle（用户自定义标题）
 * 优先级最高。tabbar-store 持久化的是原始值（title/i18nKey），不存解析结果；
 * 持久化恢复的 tab 若缺 i18nKey，从 route-meta 注册表按 path 回查兜底。
 */
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
  // 订阅语言变化（09-09-i18n）：changeLanguage 后以新语言重算 tab 标题；
  // 右键菜单文案同样经 t 解析（t 进 createContextMenus 依赖随语言重建）
  const { t, i18n: i18nInstance } = useTranslation();
  const tabs = useTabbarStore((s) => s.tabs);
  const updateTime = useTabbarStore((s) => s.updateTime);
  const headerHidden = usePreferencesStore((s) => s.header.hidden);
  const sidebarHidden = usePreferencesStore((s) => s.sidebar.hidden);
  /** 主体区域是否最大化（header 与 sidebar 同时隐藏时视为最大化） */
  const contentIsMaximize = headerHidden && sidebarHidden;

  /**
   * 当前路径对应的tab的key
   */
  const routeTab = useMemo(
    () => locationToTab(location.pathname, location.search),
    [location.pathname, location.search],
  );
  const currentActive = getTabKey(routeTab);

  // getTabs getter 等价（tabbar.ts:605-608）：每次渲染都重排为
  // [affixTabs(按 affixTabOrder 排序), ...normalTabs]，固定标签页恒在前
  // （语言变化时标题需重算，language 进依赖）
  const currentTabs = useMemo(
    () => getDisplayTabs(tabs).map((item) => wrapperTabLocale(item)),
    [tabs, updateTime, i18nInstance.language],
  );

  /**
   * 初始化固定标签页
   */
  const initAffixTabs = useCallback(() => {
    const affixTabs = getAffixRoutes().map((route) =>
      locationToTab(route.path, ''),
    );
    useTabbarStore.getState().setAffixTabs(affixTabs);
  }, []);

  // 点击tab,跳转路由
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

  // 关闭tab
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

  /** 切换主体区域最大化 */
  const toggleMaximize = useCallback(() => {
    const store = usePreferencesStore.getState();
    store.updatePreferences({
      header: { hidden: !contentIsMaximize },
      sidebar: { hidden: !contentIsMaximize },
    });
  }, [contentIsMaximize]);

  /**
   * 刷新标签页（use-tabs.ts:45-47）：无 name → refresh(当前路由)（视图翻转
   * + 进度条）；有 name → refreshByName(name)（等价 reference refresh(string)
   * 分支，仅排除缓存，不翻转视图）
   */
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

  /** 新窗口打开标签页 */
  const openTabInNewWindow = useCallback((tab: TabDefinition) => {
    useTabbarStore.getState().openTabInNewWindow(tab);
  }, []);

  /**
   * 获取操作是否禁用
   */
  const getTabDisableState = useCallback(
    (tab: TabDefinition = routeTab) => {
      const state = useTabbarStore.getState();
      const allTabs = state.tabs;
      const affixTabs = allTabs.filter((t) => t.meta?.affixTab);
      const index = allTabs.findIndex((item) => item.path === tab.path);

      const disabled = allTabs.length <= 1;
      const affixTab = tab.meta?.affixTab ?? false;
      const isCurrentTab = currentActive === getTabKey(tab);

      // 当前处于最左侧或者减去固定标签页的数量等于0
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

  // 初始化固定标签页（等价于 watch accessStore.accessMenus, immediate）
  useEffect(() => {
    initAffixTabs();
  }, [initAffixTabs]);

  // watch route.fullPath → addTab（immediate）
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
          // pin 变体统一 lucide outline pin（与 tabs 图钉同字形，已拍板）
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
          // reference use-tabbar.ts:165 handler 无参调用 —— menu 的 reload
          // 仅对当前 tab 可用（disabledRefresh），走 refresh(当前路由) 分支
          // （视图翻转 + 进度条），而非 refreshByName
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
