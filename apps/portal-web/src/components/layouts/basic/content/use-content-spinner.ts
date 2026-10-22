import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePreferencesStore } from '../../../../stores/preferences-store';
import { getRouteMeta } from '../../../../router/route-meta';

export function useContentSpinner() {
  const [spinning, setSpinning] = useState(false);
  const startTimeRef = useRef(0);
  const firstRunRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const location = useLocation();
  const enableLoading = usePreferencesStore((s) => s.transition.loading);
  const minShowTime = 500;

  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }

    if (getRouteMeta(location.pathname)?.iframeSrc) {
      return;
    }

    if (!enableLoading) {
      return;
    }
    startTimeRef.current = performance.now();
    setSpinning(true);

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
