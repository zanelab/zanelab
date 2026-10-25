import { useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { usePreferencesStore } from '../../../../stores/preferences-store';
import { appConfig } from '../../../../config';
import { getRouteMeta } from '../../../../router/route-meta';
import { getTabKey, useTabbarStore } from '../../../../stores/tabbar-store';
import { IFrameRouterView } from '../../iframe/iframe-router-view';
import { RouteCachedView } from '../../route-cached/route-cached-view';

interface LayoutContentProps {
  children?: ReactNode;
  loading?: boolean;
  /**
   * 常驻内容层：渲染在 IFrameRouterView/RouteCachedView 同级、keyed/过渡
   * 包装外层——不随路由切换重建（区别于 children）。调用方用于需要跨路由
   * 持久存在的内容（如微前端容器，见 App.tsx 的 contentLayer 注入）。
   */
  layer?: ReactNode;
}

/**
 * LayoutContent — 1:1 port of basic/content/content.vue.
 *
 * 结构对应：
 * - IFrameRouterView → iframe 路由视图（tabbarStore.tabs 派生）
 * - RouteCachedView → domCached 路由的缓存实例（React 等价：冻结的
 *   useOutlet 元素注册表 + display 切换，见 route-cached-view.tsx）
 * - showComponent = !route.meta.domCached && renderRouteView（content.vue:28-30）
 * - KeepAlive include/exclude → React 无内置 KeepAlive，通过 tab key 控制实例：
 *   不同 tab key（query.pageKey / fullPath）挂载独立实例；renderRouteView 为
 *   false（刷新中）时不渲染，刷新完成后重新挂载。
 * - Transition（useLayoutHook getTransitionName）→ key 变化时以
 *   `route-transition-${name}` appear 动画进入（out-in 的 React 等价实现）。
 * - v-show="!route.meta.iframeSrc" → 当前路由为 iframe 路由时隐藏路由组件。
 */
export function LayoutContent({
  children,
  loading = false,
  layer,
}: LayoutContentProps) {
  const keepAlive = usePreferencesStore((s) => s.tabbar.keepAlive);
  const transitionEnable = usePreferencesStore((s) => s.transition.enable);
  const transitionName = usePreferencesStore((s) => s.transition.name);
  const renderRouteView = useTabbarStore((s) => s.renderRouteView);
  const location = useLocation();

  /** 当前路径对应的 tab key（作为组件实例 key） */
  const currentKey = useMemo(() => {
    const query: Record<string, any> = {};
    new URLSearchParams(location.search).forEach((value, key) => {
      query[key] = value;
    });
    return getTabKey({
      path: location.pathname,
      fullPath: location.pathname + location.search,
      query,
      meta: {},
    });
  }, [location.pathname, location.search]);

  /** 是否启用路由过渡动画（useLayoutHook getEnabledTransition 等价） */
  const enabledTransition = !!transitionName && transitionEnable;

  /** 当前路由是否为 iframe 路由（v-show="!route.meta.iframeSrc" 等价） */
  const isIframeRoute = !!getRouteMeta(location.pathname)?.iframeSrc;

  /** showComponent（content.vue:28-30）：domCached 路由由 RouteCachedView 渲染 */
  const showComponent =
    !getRouteMeta(location.pathname)?.domCached && renderRouteView;

  /**
   * 子应用路由占位（generateRoutes 的 SubAppPlaceholder 渲染 null）：
   * 包装 div 保留（过渡动画元素不动），但加 pointer-events: none——
   * 常驻空 div 与 SubAppLayer 容器同为 relative 叠放，若可命中会拦截
   * 子应用的鼠标事件（09-08 修复，实测 elementFromPoint 命中空包装 div
   * 而非 #subapp-container 内容）。host 本地路由内容正常交互不受影响。
   */
  const isSubAppRoute =
    !!appConfig.microApps &&
    Object.entries(appConfig.microApps).some(([, cfg]) =>
      location.pathname.startsWith(cfg.activeRule),
    );

  return (
    <div className="relative h-full">
      <IFrameRouterView />
      <RouteCachedView />
      {layer}
      {showComponent ? (
        <div
          key={keepAlive ? currentKey : undefined}
          className={`relative h-full ${enabledTransition ? `route-transition-${transitionName}` : ''}`}
          style={{
            ...(isIframeRoute ? { display: 'none' } : null),
            ...(isSubAppRoute ? { pointerEvents: 'none' } : null),
          }}
        >
          {children || (
            <div className="text-base-content/40 flex h-full items-center justify-center text-sm">
              Content area — place your page content here
            </div>
          )}
        </div>
      ) : null}
      {loading && (
        <div className="bg-base-100/50 absolute inset-0 z-10 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      )}
    </div>
  );
}
