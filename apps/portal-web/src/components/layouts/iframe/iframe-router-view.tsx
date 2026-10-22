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

export function IFrameRouterView() {
  const location = useLocation();
  const enableTabbar = usePreferencesStore((s) => s.tabbar.enable);
  const tabs = useTabbarStore((s) => s.tabs);
  const renderRouteView = useTabbarStore((s) => s.renderRouteView);

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
