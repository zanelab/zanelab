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

function toTabsTab(tab: ReturnType<typeof useTabbar>['currentTabs'][number]) {
  return {
    ...tab,
    key: tab.key ?? getTabKey(tab),
  } as unknown as TabsTabDefinition;
}

export function LayoutTabbar({ showIcon, theme }: LayoutTabbarProps) {
  const preferences = usePreferencesStore();
  const tabbarStore = useTabbarStore();
  const headerHidden = usePreferencesStore((s) => s.header.hidden);
  const sidebarHidden = usePreferencesStore((s) => s.sidebar.hidden);

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

  const toggleMaximize = useCallback(() => {
    const store = usePreferencesStore.getState();
    store.updatePreferences({
      header: { hidden: !contentIsMaximize },
      sidebar: { hidden: !contentIsMaximize },
    });
  }, [contentIsMaximize]);

  const refreshTab = useCallback(() => {
    const tab = tabbarStore.getTabByKey(currentActive);
    if (tab?.name) {
      tabbarStore.refresh(tab.name as string);
    }
  }, [tabbarStore, currentActive]);

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
        {preferences.tabbar.showMore ? <ToolMore menus={menus} /> : null}
      </div>
    </>
  );
}
