import { useMemo } from 'react';
import type { LayoutMode } from '@zanelab/types';

interface UseLayoutResult {
  currentLayout: LayoutMode;
  isFullContent: boolean;
  isHeaderNav: boolean;
  isMixedNav: boolean;
  isSidebarMixedNav: boolean;
  isHeaderMixedNav: boolean;
  isHeaderSidebarNav: boolean;
  isSideMode: boolean;
}

export function useLayout(mode: LayoutMode, isMobile = false): UseLayoutResult {
  return useMemo(() => {
    const currentLayout: LayoutMode = isMobile ? 'sidebar-nav' : mode;

    const isFullContent = currentLayout === 'full-content';
    const isHeaderNav = currentLayout === 'header-nav';
    const isMixedNav =
      currentLayout === 'mixed-nav' || currentLayout === 'header-sidebar-nav';
    const isSidebarMixedNav = currentLayout === 'sidebar-mixed-nav';
    const isHeaderMixedNav = currentLayout === 'header-mixed-nav';
    const isHeaderSidebarNav = currentLayout === 'header-sidebar-nav';

    const isSideMode =
      isMixedNav ||
      isSidebarMixedNav ||
      currentLayout === 'sidebar-nav' ||
      isHeaderMixedNav ||
      isHeaderSidebarNav;

    return {
      currentLayout,
      isFullContent,
      isHeaderNav,
      isMixedNav,
      isSidebarMixedNav,
      isHeaderMixedNav,
      isHeaderSidebarNav,
      isSideMode,
    };
  }, [mode, isMobile]);
}
