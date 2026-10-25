import { useCallback, useEffect, useMemo } from 'react';

import { usePreferencesStore } from '../../../../stores/preferences-store';
import { getTabKey, useTabbarStore } from '../../../../stores/tabbar-store';
import { TabsView, ToolMore, ToolRefresh, ToolScreen } from '../../../tabs';
import type { TabDefinition as TabsTabDefinition } from '../../../tabs/types';
import { useTabbar } from './use-tabbar';

interface LayoutTabbarProps {
  showIcon?: boolean;
  theme?: string;
}

/** store TabDefinition → tabs-ui TabDefinition（补齐必填 key） */
function toTabsTab(tab: ReturnType<typeof useTabbar>['currentTabs'][number]) {
  return {
    ...tab,
    key: tab.key ?? getTabKey(tab),
  } as unknown as TabsTabDefinition;
}

/**
 * LayoutTabbar — 1:1 port of basic/tabbar/tabbar.vue.
 * Delegates rendering to the tabs-ui TabsView + tool buttons, and drives
 * tab state through useTabbar (tabbar store + router).
 */
export function LayoutTabbar({ showIcon, theme }: LayoutTabbarProps) {
  const preferences = usePreferencesStore();
  const tabbarStore = useTabbarStore();
  const headerHidden = usePreferencesStore((s) => s.header.hidden);
  const sidebarHidden = usePreferencesStore((s) => s.sidebar.hidden);
  /** 主体区域是否最大化（header 与 sidebar 同时隐藏时视为最大化） */
  const contentIsMaximize = headerHidden && sidebarHidden;

  const {
    createContextMenus,
    currentActive,
    currentTabs,
    handleClick,
    handleClose,
  } = useTabbar();

  const menus = useMemo(() => {
    const tab = tabbarStore.getTabByKey(currentActive);
    return createContextMenus(tab ?? currentTabs[0]).map((item) => ({
      ...item,
      label: item.text,
      value: item.key,
    }));
  }, [tabbarStore, currentActive, currentTabs, createContextMenus]);

  /** 主体区域最大化切换 */
  const toggleMaximize = useCallback(() => {
    const store = usePreferencesStore.getState();
    store.updatePreferences({
      header: { hidden: !contentIsMaximize },
      sidebar: { hidden: !contentIsMaximize },
    });
  }, [contentIsMaximize]);

  /** 刷新当前标签页（toolbar 的 @refresh="refreshTab" —— 无参，等价 refresh(router) 分支） */
  const refreshTab = useCallback(() => {
    const tab = tabbarStore.getTabByKey(currentActive);
    if (tab?.name) {
      // 带查询串的 tab：按 key（fullPath）定位到 tab，但其 name 不含查询 ——
      // 正确命中当前路由的刷新（视图翻转 + 进度条）
      tabbarStore.refresh(tab.name as string);
    }
  }, [tabbarStore, currentActive]);

  // 刷新后如果不保持tab状态，关闭其他tab
  useEffect(() => {
    if (!preferences.tabbar.persist) {
      const tab = tabbarStore.getTabByKey(currentActive);
      if (tab) tabbarStore.closeOtherTabs(tab);
    }
  }, []);

  return (
    <>
      <TabsView
        active={currentActive}
        className={theme}
        contextMenus={(tab: unknown) =>
          createContextMenus(tab as Parameters<typeof createContextMenus>[0])
        }
        draggable={preferences.tabbar.draggable}
        showIcon={showIcon}
        styleType={preferences.tabbar.styleType}
        tabs={currentTabs.map(toTabsTab)}
        wheelable={preferences.tabbar.wheelable}
        middleClickToClose={preferences.tabbar.middleClickToClose}
        onClose={handleClose}
        onSortTabs={(oldIndex: number, newIndex: number) =>
          tabbarStore.sortTabs(oldIndex, newIndex)
        }
        onUnpin={(tab: unknown) =>
          tabbarStore.unpinTab(
            tab as Parameters<typeof tabbarStore.unpinTab>[0],
          )
        }
        onActiveChange={handleClick}
      />
      <div className="flex-center h-full">
        {preferences.tabbar.showRefresh ? (
          <ToolRefresh onRefresh={refreshTab} />
        ) : null}
        {preferences.tabbar.showMaximize ? (
          <ToolScreen
            screen={contentIsMaximize}
            onScreenChange={toggleMaximize}
          />
        ) : null}
        {/* 「更多」固定在工具区最后 */}
        {preferences.tabbar.showMore ? <ToolMore menus={menus} /> : null}
      </div>
    </>
  );
}
