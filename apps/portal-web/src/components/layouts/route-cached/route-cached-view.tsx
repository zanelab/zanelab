import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

import { getRouteMeta } from '../../../router/route-meta';
import { getTabKey, useTabbarStore } from '../../../stores/tabbar-store';
import { usePreferencesStore } from '../../../stores/preferences-store';

export function RouteCachedView() {
  const location = useLocation();
  const outlet = useOutlet();
  const renderRouteView = useTabbarStore((s) => s.renderRouteView);
  const tabs = useTabbarStore((s) => s.tabs);
  const tabbarEnable = usePreferencesStore((s) => s.tabbar.enable);

  const transitionEnable = usePreferencesStore((s) => s.transition.enable);
  const transitionName = usePreferencesStore((s) => s.transition.name);
  const enabledTransition = !!transitionName && transitionEnable;

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

  const [cachedRoutes, setCachedRoutes] = useState<Map<string, ReactNode>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!getRouteMeta(location.pathname)?.domCached) return;
    setCachedRoutes((prev) => {
      if (prev.get(currentKey) === outlet) return prev;
      const next = new Map(prev);
      next.set(currentKey, outlet);
      return next;
    });
  }, [currentKey, outlet, location.pathname]);

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
  }, [tabs]);

  useEffect(() => {
    if (renderRouteView) return;
    setCachedRoutes((prev) => {
      if (!prev.has(currentKey)) return prev;
      const next = new Map(prev);
      next.delete(currentKey);
      return next;
    });
  }, [renderRouteView, currentKey]);

  if (!tabbarEnable || cachedRoutes.size === 0) {
    return null;
  }

  return (
    <>
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
