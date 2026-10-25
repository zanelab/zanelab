import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { usePreferencesStore } from './preferences-store';
import { startProgress, stopProgress } from '@zanelab/utils';
import { getMatchedRouteMetas, getRouteMeta } from '../router/route-meta';

/**
 * React 等价实现：上游 store 包的 tabbar store（pinia）。
 * Tab 定义由 vue-router RouteLocationNormalizedLoaded 适配为 React Router
 * location 形态。
 */
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
    /** 国际化键（09-09-i18n）：随 title 原始值一起存/持久化，渲染期经 menuTitle 解析 */
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
  /** keepAlive 缓存的标签页（路由名集合） */
  cachedTabs: Set<string>;
  /** 拖拽结束的索引 */
  dragEndIndex: number;
  /** 需要排除缓存的标签页（refresh 期间临时加入） */
  excludeCachedTabs: Set<string>;
  /** 标签右键菜单项列表 */
  menuList: string[];
  /** 是否渲染路由视图（refresh 时翻转以强制重渲染） */
  renderRouteView: boolean;
  /** 当前打开的标签页列表 */
  tabs: TabDefinition[];
  /** 更新时间，用于一些更新场景 */
  updateTime: number;
  /** 标签页访问历史（关闭当前页时回退到上一个访问的页） */
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

  /** 按名称刷新指定标签页（仅排除缓存，不翻转视图） */
  refreshByName: (name: string) => Promise<void>;
  setAffixTabs: (tabs: TabDefinition[]) => void;
  setMenuList: (list: string[]) => void;
  setUpdateTime: () => void;
  updateCacheTabs: () => void;
  addVisitHistory: (key: string) => void;
  removeVisitHistory: (...keys: string[]) => void;
}

/** 访问历史记录最大数量 */
const MAX_VISIT_HISTORY = 50;

/** 从 route 获取 tab 页的 key */
export function getTabKey(tab: TabDefinition): string {
  const { fullPath, path, meta: { fullPathKey } = {}, query = {} } = tab;

  // pageKey 可能是数组（查询参数重复时可能出现）
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

/**
 * refresh / refreshByName 共用的「排除缓存」写入（reference tabbar.ts:411-417
 * 与 428-432 的 excludeCachedTabs add / delete 模式）；200ms sleep 由
 * 调用方在 add 之后、delete 之前执行（与 reference 时序一致）。
 */
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

// persist（等价参考实现 tabbar.ts:613-636 的 pinia persist 配置）：
// tabs + visitHistory 存 sessionStorage（F5 恢复、关浏览器丢弃），
// 函数与 Set/Map 类运行时字段不落盘；反序列化后为纯数据（port 的
// visitHistory 为 string[]，无需 reference 的 Stack 实例重建）。
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
          // 页面已经存在，不重复添加选项卡，只更新选项卡参数
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

        // 添加访问历史记录
        if (isVisitHistory()) {
          get().addVisitHistory(tab.key as string);
        }
        return tab;
      },

      /** 根据 tab 的 key 获取 tab */
      getTabByKey(key: string) {
        return get().tabs.find((item) => getTabKeyFromTab(item) === key);
      },

      /** 新窗口打开标签页 */
      openTabInNewWindow(tab: TabDefinition) {
        const href = new URL(tab.fullPath || tab.path, location.href).href;
        window.open(href, '_blank', 'noopener');
      },

      /** 设置标签页标题 */
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

      /** 重置标签页标题 */
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
        // _close 的 affix 保护（reference tabbar.ts:95-101）：所有关闭路径
        // 对固定标签页一律 early return —— store 级防御，UI 层禁用仅为辅助
        if (isAffixTab(tab)) {
          return;
        }
        const state = get();
        const tabKey = getTabKeyFromTab(tab);

        // 关闭的不是当前激活标签页：直接摘除即可
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

        // 从访问历史记录中找上一个标签页（历史开关开启时按历史回退，否则取相邻标签）
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

      /**
       * 刷新标签页 —— reference tabbar.ts:404-423 的 refresh(Router) 分支：
       * 调用方传「当前路由名」（等价参考实现 由 router.currentRoute 取 name）。
       * 翻转 renderRouteView 强制重渲染 + 进度条。定向刷新（不翻转视图）走
       * refreshByName —— reference 的 refresh(string) 分支即直接转调后者。
       */
      async refresh(currentRouteName: string) {
        // add → 视图翻转 + 进度条 → 200ms → delete → 视图恢复
        setExcludeCachedTab(get, set, currentRouteName, false);
        set({ renderRouteView: false });
        startProgress();
        await new Promise((resolve) => setTimeout(resolve, 200));
        setExcludeCachedTab(get, set, currentRouteName, true);
        set({ renderRouteView: true });
        stopProgress();
      },

      /** refreshByName（tabbar.ts:428-432）：仅排除缓存 200ms，无视图翻转/进度条 */
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
          // 嵌套 keepAlive 缓存（reference tabbar.ts:551-556）：同时缓存
          // 匹配链中的父路由名（matched[i>0]）—— React port 由 route-meta
          // 的匹配链（getMatchedRouteMetas）提供 parents 等价
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
      // meta.icon 为 ReactNode（App.tsx 注册的菜单 SVG），无法 JSON 序列化
      // —— 落盘前剥离，恢复时由 route-meta 重新解析（reference 的 meta.icon
      // 为字符串，可直接持久化；React port 换为 icon-free 持久化 + 回填）
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

        // icon 回填：从 route-meta 注册表重新解析（含 affix 固定页）
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

/** 固定标签页（已按 affixTabOrder 排序） */
export function getAffixTabs(tabs: TabDefinition[]): TabDefinition[] {
  return tabs
    .filter((tab) => isAffixTab(tab))
    .toSorted(
      (a, b) => (a.meta?.affixTabOrder ?? 0) - (b.meta?.affixTabOrder ?? 0),
    );
}

/** 获取展示用的标签页列表（固定页在前） */
export function getDisplayTabs(tabs: TabDefinition[]): TabDefinition[] {
  const normalTabs = tabs.filter((tab) => !isAffixTab(tab));
  return [...getAffixTabs(tabs), ...normalTabs].filter(Boolean);
}
