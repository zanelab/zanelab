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

  layer?: ReactNode;
}

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

  const enabledTransition = !!transitionName && transitionEnable;

  const isIframeRoute = !!getRouteMeta(location.pathname)?.iframeSrc;

  const showComponent =
    !getRouteMeta(location.pathname)?.domCached && renderRouteView;

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
