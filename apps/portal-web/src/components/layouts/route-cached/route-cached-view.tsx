import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

import { getRouteMeta } from '../../../router/route-meta';
import { getTabKey, useTabbarStore } from '../../../stores/tabbar-store';
import { usePreferencesStore } from '../../../stores/preferences-store';

/**
 * RouteCachedView — React 等价实现 of
 * packages/effects/layouts/src/route-cached/route-cached-view.vue + route-cached-page.vue.
 *
 * Reference 机制：RouteCachedPage 把 domCached 路由的组件 VNode 注册到
 * tabbarStore.addCachedRoute；RouteCachedView 渲染所有缓存实例并以
 * v-show="key === currentKey" 切换（实例保持挂载）。
 *
 * React 等价：React 无 KeepAlive/VNode 注册机制 —— 改为捕获当前路由的
 * `useOutlet()` 元素（元素描述不可变，其 RouteContext 在创建时冻结），
 * 按 tab key 存入本组件注册表并持续渲染，display 切换可见性。导航离开后
 * 缓存元素仍挂载，等价参考实现 的 DOM 级缓存。
 */
export function RouteCachedView() {
  const location = useLocation();
  const outlet = useOutlet();
  const renderRouteView = useTabbarStore((s) => s.renderRouteView);
  const tabs = useTabbarStore((s) => s.tabs);
  const tabbarEnable = usePreferencesStore((s) => s.tabbar.enable);
  // getEnabledTransition 等价（useLayoutHook）：transitionName && enable
  const transitionEnable = usePreferencesStore((s) => s.transition.enable);
  const transitionName = usePreferencesStore((s) => s.transition.name);
  const enabledTransition = !!transitionName && transitionEnable;

  /** 当前路由 tab key */
  const query: Record<string, any> = {};
  new URLSearchParams(location.search).forEach((value, key) => {
    query[key] = value;
  });
  const currentKey = getTabKey({
    path: location.pathname,
    fullPath: location.pathname + location.search,
    query,
    meta: {},
  });

  /** 缓存注册表：tab key → 冻结的 outlet 元素（React 等价 getCachedRoutes） */
  const [cachedRoutes, setCachedRoutes] = useState<Map<string, ReactNode>>(
    () => new Map(),
  );

  // RouteCachedPage 等价：watch(route) → 当前路由为 domCached 时注册组件
  useEffect(() => {
    if (!getRouteMeta(location.pathname)?.domCached) return;
    setCachedRoutes((prev) => {
      if (prev.get(currentKey) === outlet) return prev;
      const next = new Map(prev);
      next.set(currentKey, outlet);
      return next;
    });
  }, [currentKey, outlet, location.pathname]);

  // 监听缓存路由变化，删除不存在的缓存路由（computedCachedRouteKeys watch 等价：
  // tab 关闭后移除对应缓存实例；tabbar 禁用时清空）
  const tabKeys = new Set(tabs.map((tab) => tab.key ?? getTabKey(tab)));
  const tabbarEnableRef = useRef(tabbarEnable);
  tabbarEnableRef.current = tabbarEnable;
  useEffect(() => {
    setCachedRoutes((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const key of prev.keys()) {
        if (!tabbarEnableRef.current || !tabKeys.has(key)) {
          next.delete(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // tabKeys 由 location/tabs 派生，随路由变化重新检查
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs]);

  // 刷新排除等价（getExcludeCachedTabs → removeCachedRoute）：
  // renderRouteView 为 false（刷新中）时丢弃当前 key 的缓存，重进时重新捕获
  useEffect(() => {
    if (renderRouteView) return;
    setCachedRoutes((prev) => {
      if (!prev.has(currentKey)) return prev;
      const next = new Map(prev);
      next.delete(currentKey);
      return next;
    });
  }, [renderRouteView, currentKey]);

  // computedShowView 等价：无缓存实例时不渲染
  if (!tabbarEnable || cachedRoutes.size === 0) {
    return null;
  }

  return (
    <>
      {/* Transition appear（route-cached-view.vue:77-84）→ route-transition-${name}
          appear 动画（与 content.tsx 同一机制） */}
      {[...cachedRoutes.entries()].map(([key, element]) => (
        <div
          key={key}
          className={`relative h-full ${enabledTransition ? `route-transition-${transitionName}` : ''}`}
          style={key === currentKey ? undefined : { display: 'none' }}
        >
          {element}
        </div>
      ))}
    </>
  );
}
