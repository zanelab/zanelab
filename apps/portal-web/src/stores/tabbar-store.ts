import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { usePreferencesStore } from './preferences-store';
import { startProgress, stopProgress } from '@zanelab/utils';
import { getMatchedRouteMetas, getRouteMeta } from '../router/route-meta';

export interface TabDefinition {
  key?: string;
  fullPath?: string;
  path: string;
  name?: string;
  query?: Record<string, any>;
  params?: Record<string, any>;
  icon?: string;
  meta?: {
    title?: string;

    i18nKey?: string;
    affixTab?: boolean;
    affixTabOrder?: number;
    keepAlive?: boolean;
    hideInTab?: boolean;
    newTabTitle?: string;
    maxNumOfOpenTab?: number;
    iframeSrc?: string;
    [key: string]: any;
  };
}

interface TabbarState {
  cachedTabs: Set<string>;

  dragEndIndex: number;

  excludeCachedTabs: Set<string>;

  menuList: string[];

  renderRouteView: boolean;

  tabs: TabDefinition[];

  updateTime: number;

  visitHistory: string[];

  addTab: (routeTab: TabDefinition) => TabDefinition;
  getTabByKey: (key: string) => TabDefinition | undefined;
  openTabInNewWindow: (tab: TabDefinition) => void;
  setTabTitle: (tab: TabDefinition, title: string) => void;
  resetTabTitle: (tab: TabDefinition) => void;
  closeAllTabs: (
    navigate: (path: string, opts?: { replace?: boolean }) => void,
  ) => void;
  closeLeftTabs: (tab: TabDefinition) => void;
  closeOtherTabs: (tab: TabDefinition) => void;
  closeRightTabs: (tab: TabDefinition) => void;
  closeTab: (
    tab: TabDefinition,
    navigate: (path: string, opts?: { replace?: boolean }) => void,
    currentKey: string,
  ) => void;
  closeTabByKey: (
    key: string,
    navigate: (path: string, opts?: { replace?: boolean }) => void,
    currentKey: string,
  ) => void;
  pinTab: (tab: TabDefinition) => void;
  unpinTab: (tab: TabDefinition) => void;
  toggleTabPin: (tab: TabDefinition) => void;
  sortTabs: (oldIndex: number, newIndex: number) => void;
  refresh: (currentRouteName: string) => Promise<void>;

  refreshByName: (name: string) => Promise<void>;
  setAffixTabs: (tabs: TabDefinition[]) => void;
  setMenuList: (list: string[]) => void;
  setUpdateTime: () => void;
  updateCacheTabs: () => void;
  addVisitHistory: (key: string) => void;
  removeVisitHistory: (...keys: string[]) => void;
}

const MAX_VISIT_HISTORY = 50;

export function getTabKey(tab: TabDefinition): string {
  const { fullPath, path, meta: { fullPathKey } = {}, query = {} } = tab;

  const pageKey = Array.isArray(query.pageKey)
    ? query.pageKey[0]
    : query.pageKey;
  let rawKey: string;
  if (pageKey) {
    rawKey = pageKey;
  } else {
    rawKey = fullPathKey === false ? path : (fullPath ?? path);
  }
  try {
    return decodeURIComponent(rawKey);
  } catch {
    return rawKey;
  }
}

function isAffixTab(tab: TabDefinition) {
  return tab?.meta?.affixTab ?? false;
}

function getTabKeyFromTab(tab: TabDefinition): string {
  return tab.key ?? getTabKey(tab);
}

function equalTab(a: TabDefinition, b: TabDefinition) {
  return getTabKeyFromTab(a) === getTabKeyFromTab(b);
}

function isVisitHistory() {
  return usePreferencesStore.getState().tabbar.visitHistory;
}

function setExcludeCachedTab(
  get: () => TabbarState,
  set: (partial: Partial<TabbarState>) => void,
  name: string,
  remove: boolean,
) {
  const exclude = new Set(get().excludeCachedTabs);
  if (remove) {
    exclude.delete(name);
  } else {
    exclude.add(name);
  }
  set({ excludeCachedTabs: exclude });
}

export const useTabbarStore = create<TabbarState>()(
  persist(
    (set, get) => ({
      cachedTabs: new Set(),
      dragEndIndex: 0,
      excludeCachedTabs: new Set(),
      menuList: [
        'close',
        'affix',
        'maximize',
        'reload',
        'open-in-new-window',
        'close-left',
        'close-right',
        'close-other',
        'close-all',
      ],
      renderRouteView: true,
      tabs: [],
      updateTime: Date.now(),
      visitHistory: [],

      addTab(routeTab) {
        const state = get();
        let tab: TabDefinition = { ...routeTab, meta: { ...routeTab.meta } };
        if (!tab.key) {
          tab.key = getTabKey(routeTab);
        }
        if (tab.meta?.hideInTab) {
          return tab;
        }

        const tabIndex = state.tabs.findIndex((item) => equalTab(item, tab));

        let tabs: TabDefinition[];
        if (tabIndex === -1) {
          const maxCount = usePreferencesStore.getState().tabbar.maxCount;
          const maxNumOfOpenTab = routeTab?.meta?.maxNumOfOpenTab ?? -1;
          const next = [...state.tabs];
          if (
            maxNumOfOpenTab > 0 &&
            next.filter((t) => t.name === routeTab.name).length >=
              maxNumOfOpenTab
          ) {
            const index = next.findIndex((item) => item.name === routeTab.name);
            if (index !== -1) next.splice(index, 1);
          } else if (maxCount > 0 && next.length >= maxCount) {
            const index = next.findIndex((item) => !item.meta?.affixTab);
            if (index !== -1) next.splice(index, 1);
          }
          next.push(tab);
          tabs = next;
        } else {
          const currentTab = state.tabs[tabIndex];
          const mergedTab: TabDefinition = {
            ...currentTab,
            ...tab,
            meta: { ...currentTab?.meta, ...tab.meta },
          };
          if (currentTab) {
            const curMeta = currentTab.meta ?? {};
            if ('affixTab' in curMeta) {
              mergedTab.meta!.affixTab = curMeta.affixTab;
            }
            if ('newTabTitle' in curMeta) {
              mergedTab.meta!.newTabTitle = curMeta.newTabTitle;
            }
          }
          tab = mergedTab;
          const next = [...state.tabs];
          next.splice(tabIndex, 1, mergedTab);
          tabs = next;
        }
        set({ tabs, updateTime: Date.now() });
        get().updateCacheTabs();

        if (isVisitHistory()) {
          get().addVisitHistory(tab.key as string);
        }
        return tab;
      },

      getTabByKey(key: string) {
        return get().tabs.find((item) => getTabKeyFromTab(item) === key);
      },

      openTabInNewWindow(tab: TabDefinition) {
        const href = new URL(tab.fullPath || tab.path, location.href).href;
        window.open(href, '_blank', 'noopener');
      },

      setTabTitle(tab: TabDefinition, title: string) {
        const state = get();
        const index = state.tabs.findIndex((item) => equalTab(item, tab));
        if (index === -1) return;
        const next = [...state.tabs];
        next[index] = {
          ...tab,
          meta: { ...tab.meta, newTabTitle: title },
        };
        next.splice(index, 1, next[index]!);
        set({ tabs: next, updateTime: Date.now() });
        get().updateCacheTabs();
      },

      resetTabTitle(tab: TabDefinition) {
        if (tab?.meta?.newTabTitle) return;
        const state = get();
        const index = state.tabs.findIndex((item) => equalTab(item, tab));
        if (index === -1) return;
        const next = [...state.tabs];
        next[index] = {
          ...tab,
          meta: { ...tab.meta, newTabTitle: undefined },
        };
        set({ tabs: next });
        get().updateCacheTabs();
      },

      closeAllTabs(navigate) {
        const state = get();
        const newTabs = state.tabs.filter((tab) => isAffixTab(tab));
        const tabs = newTabs.length > 0 ? newTabs : state.tabs.slice(0, 1);
        set({ tabs, updateTime: Date.now() });
        if (isVisitHistory()) {
          set({
            visitHistory: state.visitHistory.filter((k) =>
              tabs.some((t) => getTabKeyFromTab(t) === k),
            ),
          });
        }
        const firstTab = tabs[0];
        if (firstTab) {
          navigate(firstTab.fullPath || firstTab.path, { replace: true });
        }
        get().updateCacheTabs();
      },

      closeLeftTabs(tab) {
        const state = get();
        const index = state.tabs.findIndex((item) => equalTab(item, tab));
        if (index < 1) return;

        const keys = state.tabs
          .slice(0, index)
          .filter((item) => !isAffixTab(item))
          .map((item) => item.key as string);
        const keySet = new Set(keys);
        const tabs = state.tabs.filter(
          (item) => !keySet.has(getTabKeyFromTab(item)),
        );
        if (isVisitHistory()) {
          get().removeVisitHistory(...keys);
        }
        set({ tabs, updateTime: Date.now() });
        get().updateCacheTabs();
      },

      closeOtherTabs(tab) {
        const state = get();
        const keys: string[] = [];
        for (const item of state.tabs) {
          if (!equalTab(item, tab) && !isAffixTab(item)) {
            keys.push(item.key as string);
          }
        }
        const keySet = new Set(keys);
        const tabs = state.tabs.filter(
          (item) => !keySet.has(getTabKeyFromTab(item)),
        );
        if (isVisitHistory()) {
          get().removeVisitHistory(...keys);
        }
        set({ tabs, updateTime: Date.now() });
        get().updateCacheTabs();
      },

      closeRightTabs(tab) {
        const state = get();
        const index = state.tabs.findIndex((item) => equalTab(item, tab));
        if (index === -1 || index >= state.tabs.length - 1) return;

        const keys = state.tabs
          .slice(index + 1)
          .filter((item) => !isAffixTab(item))
          .map((item) => item.key as string);
        const keySet = new Set(keys);
        const tabs = state.tabs.filter(
          (item) => !keySet.has(getTabKeyFromTab(item)),
        );
        if (isVisitHistory()) {
          get().removeVisitHistory(...keys);
        }
        set({ tabs, updateTime: Date.now() });
        get().updateCacheTabs();
      },

      closeTab(tab, navigate, currentKey) {
        if (isAffixTab(tab)) {
          return;
        }
        const state = get();
        const tabKey = getTabKeyFromTab(tab);

        if (currentKey !== tabKey) {
          set({
            tabs: state.tabs.filter((item) => !equalTab(item, tab)),
            updateTime: Date.now(),
          });
          if (isVisitHistory()) {
            get().removeVisitHistory(tabKey);
          }
          get().updateCacheTabs();
          return;
        }
        if (state.tabs.length <= 1) {
          console.error('Failed to close the tab; only one tab remains open.');
          return;
        }

        const closeAndGo = (to: TabDefinition | undefined) => {
          set({
            tabs: state.tabs.filter((item) => !equalTab(item, tab)),
            updateTime: Date.now(),
          });
          get().updateCacheTabs();
          if (to) {
            navigate(to.fullPath || to.path, { replace: true });
          }
        };

        if (isVisitHistory()) {
          get().removeVisitHistory(currentKey);
          let previousTab: TabDefinition | undefined;
          const history = get().visitHistory;
          for (let i = history.length - 1; i >= 0; i--) {
            previousTab = get().tabs.find(
              (item) => getTabKeyFromTab(item) === history[i],
            );
            if (previousTab) break;
          }
          const fallback =
            previousTab ?? get().tabs.find((t) => !equalTab(t, tab));
          closeAndGo(fallback);
          return;
        }

        const index = state.tabs.findIndex(
          (item) => getTabKeyFromTab(item) === currentKey,
        );
        const before = state.tabs[index - 1];
        const after = state.tabs[index + 1];
        if (after) {
          closeAndGo(after);
        } else if (before) {
          closeAndGo(before);
        }
      },

      closeTabByKey(key, navigate, currentKey) {
        const originKey = decodeURIComponent(key);
        const tab = get().tabs.find(
          (item) => getTabKeyFromTab(item) === originKey,
        );
        if (tab) {
          get().closeTab(tab, navigate, currentKey);
        }
      },

      pinTab(tab) {
        const state = get();
        const index = state.tabs.findIndex((item) => equalTab(item, tab));
        if (index === -1) return;
        const oldTab = state.tabs[index];
        const pinned: TabDefinition = {
          ...tab,
          meta: { ...tab.meta, affixTab: true, title: oldTab?.meta?.title },
        };
        const next = [...state.tabs];
        next.splice(index, 1, pinned);
        const affixTabs = next.filter((t) => isAffixTab(t));
        const newIndex = affixTabs.findIndex((item) => equalTab(item, pinned));
        set({ tabs: next });
        get().sortTabs(index, newIndex);
      },

      unpinTab(tab) {
        const state = get();
        const index = state.tabs.findIndex((item) => equalTab(item, tab));
        if (index === -1) return;
        const oldTab = state.tabs[index];
        const unpinned: TabDefinition = {
          ...tab,
          meta: { ...tab.meta, affixTab: false, title: oldTab?.meta?.title },
        };
        const next = [...state.tabs];
        next.splice(index, 1, unpinned);
        const affixTabs = next.filter((t) => isAffixTab(t));
        const newIndex = affixTabs.length;
        set({ tabs: next });
        get().sortTabs(index, newIndex);
      },

      toggleTabPin(tab) {
        const affixTab = tab?.meta?.affixTab ?? false;
        if (affixTab) {
          get().unpinTab(tab);
        } else {
          get().pinTab(tab);
        }
      },

      sortTabs(oldIndex, newIndex) {
        const state = get();
        const currentTab = state.tabs[oldIndex];
        if (!currentTab) return;
        const next = [...state.tabs];
        next.splice(oldIndex, 1);
        next.splice(newIndex, 0, currentTab);
        set({ tabs: next, dragEndIndex: state.dragEndIndex + 1 });
      },

      async refresh(currentRouteName: string) {
        setExcludeCachedTab(get, set, currentRouteName, false);
        set({ renderRouteView: false });
        startProgress();
        await new Promise((resolve) => setTimeout(resolve, 200));
        setExcludeCachedTab(get, set, currentRouteName, true);
        set({ renderRouteView: true });
        stopProgress();
      },

      async refreshByName(name) {
        setExcludeCachedTab(get, set, name, false);
        await new Promise((resolve) => setTimeout(resolve, 200));
        setExcludeCachedTab(get, set, name, true);
      },

      setAffixTabs(tabs) {
        for (const tab of tabs) {
          get().addTab({
            ...tab,
            meta: { ...tab.meta, affixTab: true },
          });
        }
      },

      setMenuList(list) {
        set({ menuList: list });
      },

      setUpdateTime() {
        set({ updateTime: Date.now() });
      },

      updateCacheTabs() {
        const cacheMap = new Set<string>();
        for (const tab of get().tabs) {
          const keepAlive = tab.meta?.keepAlive;
          if (!keepAlive) continue;

          const matched = getMatchedRouteMetas(tab.path);
          matched.forEach((meta, i) => {
            if (i > 0 && meta.path) {
              cacheMap.add(meta.path);
            }
          });
          const name = tab.name as string;
          if (name) cacheMap.add(name);
        }
        set({ cachedTabs: cacheMap });
      },

      addVisitHistory(key) {
        const history = get().visitHistory.filter((k) => k !== key);
        history.push(key);
        if (history.length > MAX_VISIT_HISTORY) {
          history.splice(0, history.length - MAX_VISIT_HISTORY);
        }
        set({ visitHistory: history });
      },

      removeVisitHistory(...keys) {
        const keySet = new Set(keys);
        set({
          visitHistory: get().visitHistory.filter((k) => !keySet.has(k)),
        });
      },
    }),
    {
      name: 'admin-tabbar',
      storage: createJSONStorage(() => sessionStorage),

      partialize: (state) => {
        const tabs = state.tabs.map((tab) =>
          tab.meta?.icon
            ? { ...tab, meta: { ...tab.meta, icon: undefined } }
            : tab,
        );
        return {
          tabs,
          visitHistory: state.visitHistory,
        } as unknown as TabbarState;
      },
      merge: (persisted, current) => ({
        ...current,
        ...(typeof persisted === 'object' && persisted !== null
          ? (persisted as Partial<TabbarState>)
          : {}),

        tabs:
          (persisted as { tabs?: TabDefinition[] } | null)?.tabs?.map((tab) => {
            const meta = getRouteMeta(tab.path);
            return meta?.icon
              ? { ...tab, meta: { ...tab.meta, icon: meta.icon } }
              : tab;
          }) ?? current.tabs,
      }),
    },
  ),
);

export function getAffixTabs(tabs: TabDefinition[]): TabDefinition[] {
  return tabs
    .filter((tab) => isAffixTab(tab))
    .toSorted(
      (a, b) => (a.meta?.affixTabOrder ?? 0) - (b.meta?.affixTabOrder ?? 0),
    );
}

export function getDisplayTabs(tabs: TabDefinition[]): TabDefinition[] {
  const normalTabs = tabs.filter((tab) => !isAffixTab(tab));
  return [...getAffixTabs(tabs), ...normalTabs].filter(Boolean);
}
