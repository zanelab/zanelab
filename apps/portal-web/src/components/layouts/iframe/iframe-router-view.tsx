import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { usePreferencesStore } from '../../../stores/preferences-store';
import { useTabbarStore } from '../../../stores/tabbar-store';
import { getRouteMeta } from '../../../router/route-meta';
import { AppIcon } from '../../icons/app-icon';

interface IFrameRoute {
  fullPath?: string;
  path: string;
  name?: string;
  meta?: { iframeSrc?: string; keepAlive?: boolean };
}

/**
 * IFrameRouterView — 1:1 port of iframe/iframe-router-view.vue.
 * iframe 路由列表：开启 tabbar 时从 tabbarStore.tabs 派生（跟随 keepAlive），
 * 否则仅渲染当前路由（route.meta.iframeSrc → getRouteMeta 等价）。
 */
export function IFrameRouterView() {
  const location = useLocation();
  const enableTabbar = usePreferencesStore((s) => s.tabbar.enable);
  const tabs = useTabbarStore((s) => s.tabs);
  const renderRouteView = useTabbarStore((s) => s.renderRouteView);

  // 首次加载时显示 loading（spinningList 等价：按 fullPath 记录）
  const [loadedSet, setLoadedSet] = useState<Set<string>>(new Set());

  const iframeRoutes = useMemo<IFrameRoute[]>(() => {
    if (!enableTabbar) {
      const meta = getRouteMeta(location.pathname);
      return meta?.iframeSrc
        ? [{ path: meta.path, name: meta.path, fullPath: meta.path, meta }]
        : [];
    }
    return tabs.filter((tab) => !!tab.meta?.iframeSrc);
  }, [enableTabbar, tabs, location.pathname]);

  const tabNames = useMemo(
    () => new Set(iframeRoutes.map((item) => item.name as string)),
    [iframeRoutes],
  );

  const showIframe = iframeRoutes.length > 0;

  function routeShow(tabItem: IFrameRoute) {
    return tabItem.path === location.pathname;
  }

  function canRender(tabItem: IFrameRoute) {
    const { meta, name } = tabItem;

    if (!name || !renderRouteView) {
      return false;
    }

    if (!enableTabbar) {
      return routeShow(tabItem);
    }

    // 跟随 keepAlive 状态,与其他tab页保持一致
    if (
      !meta?.keepAlive &&
      tabNames.has(name as string) &&
      name !== location.pathname
    ) {
      return false;
    }
    return iframeRoutes.some((tab) => tab.name === name);
  }

  function hideLoading(fullPath: string) {
    setLoadedSet((prev) => {
      const next = new Set(prev);
      next.add(fullPath);
      return next;
    });
  }

  function showSpinning(fullPath?: string) {
    // 首次加载时显示loading
    return fullPath === undefined ? true : !loadedSet.has(fullPath);
  }

  if (!showIframe) return null;

  return (
    <>
      {iframeRoutes.map((item) => {
        if (!canRender(item)) return null;
        return (
          <div
            key={item.fullPath ?? item.path}
            className="relative size-full"
            style={{ display: routeShow(item) ? undefined : 'none' }}
          >
            {showSpinning(item.fullPath ?? item.path) && (
              <div className="bg-base-100 absolute inset-0 z-10 flex items-center justify-center">
                <AppIcon name="spinner" className="size-6 animate-spin" />
              </div>
            )}
            <iframe
              src={item.meta?.iframeSrc as string}
              className="size-full border-0"
              onLoad={() => hideLoading(item.fullPath ?? item.path)}
            />
          </div>
        );
      })}
    </>
  );
}
