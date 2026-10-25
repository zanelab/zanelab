import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePreferencesStore } from '../../../../stores/preferences-store';
import { getRouteMeta } from '../../../../router/route-meta';

/**
 * Route-change spinner state — React equivalent of 上游
 * useContentSpinner hook (router.beforeEach / router.afterEach guards).
 * Starts spinning on pathname change, keeps it visible for at least
 * `minShowTime` ms.
 */
export function useContentSpinner() {
  const [spinning, setSpinning] = useState(false);
  const startTimeRef = useRef(0);
  const firstRunRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const location = useLocation();
  const enableLoading = usePreferencesStore((s) => s.transition.loading);
  const minShowTime = 500; // 最小显示时间

  useEffect(() => {
    // Skip the initial mount (equivalent of to.meta.loaded)
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }

    // iframe 路由不触发加载动画（reference: to.meta.iframeSrc）
    if (getRouteMeta(location.pathname)?.iframeSrc) {
      return;
    }

    // 路由前置守卫
    if (!enableLoading) {
      return;
    }
    startTimeRef.current = performance.now();
    setSpinning(true);

    // 路由后置守卫 — 结束加载动画（至少展示 minShowTime）
    const processTime = performance.now() - startTimeRef.current;
    const delay = Math.max(minShowTime - processTime, 0);
    timerRef.current = setTimeout(() => {
      setSpinning(false);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location, enableLoading]);

  return { spinning };
}
